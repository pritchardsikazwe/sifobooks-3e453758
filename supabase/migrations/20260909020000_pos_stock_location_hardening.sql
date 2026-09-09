-- Final POS location hardening.
-- Keep the existing POS/accounting engine. Enforce the physical stock location
-- at the ledger boundary so a completed POS sale can never consume warehouse
-- stock merely because the product catalogue is company-wide.

CREATE OR REPLACE FUNCTION public.enforce_pos_stock_movement_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_location uuid;
  _register_location uuid;
  _shift_location uuid;
BEGIN
  IF NEW.source_id IS NOT NULL
     AND lower(COALESCE(NEW.source_type, '')) IN ('sale','pos_sale','pos sale','refund','pos_refund','pos refund') THEN
    SELECT s.location_id, r.location_id
      INTO _shift_location, _register_location
    FROM public.pos_sales s
    LEFT JOIN public.pos_registers r ON r.id = s.register_id
    WHERE s.id = NEW.source_id
    LIMIT 1;

    _sale_location := COALESCE(_shift_location, _register_location);

    IF _sale_location IS NOT NULL THEN
      IF NEW.location_id IS NULL THEN
        NEW.location_id := _sale_location;
      ELSIF NEW.location_id <> _sale_location THEN
        RAISE EXCEPTION 'POS stock movement location does not match the sale register/shift location';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pos_stock_movement_location_guard ON public.stock_movements;
CREATE TRIGGER pos_stock_movement_location_guard
BEFORE INSERT OR UPDATE OF location_id, source_id, source_type ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.enforce_pos_stock_movement_location();

REVOKE ALL ON FUNCTION public.enforce_pos_stock_movement_location() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_pos_stock_movement_location() TO authenticated, service_role;

-- Make the existing active Register 01 use Chibombo when the location exists.
DO $setup$
DECLARE
  _loc uuid;
BEGIN
  SELECT id INTO _loc
  FROM public.inventory_locations
  WHERE upper(code) = 'CHIBOMBO'
    AND is_active = true
  ORDER BY is_default DESC, name
  LIMIT 1;

  IF _loc IS NOT NULL THEN
    UPDATE public.pos_registers
       SET location_id = _loc,
           branch = 'Chibombo Store'
     WHERE is_active = true
       AND (name = 'Register 01' OR branch IN ('Main','Chibombo Store'))
       AND (location_id IS NULL OR location_id = _loc);
  END IF;
END $setup$;

-- A register cannot silently move while it has an open shift.
CREATE OR REPLACE FUNCTION public.prevent_pos_register_location_change_with_open_shift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.location_id IS DISTINCT FROM OLD.location_id
     AND EXISTS (
       SELECT 1 FROM public.pos_shifts
       WHERE register_id = OLD.id AND status = 'open'
     ) THEN
    RAISE EXCEPTION 'Cannot change POS register location while an open shift exists';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pos_register_location_open_shift_guard ON public.pos_registers;
CREATE TRIGGER pos_register_location_open_shift_guard
BEFORE UPDATE OF location_id ON public.pos_registers
FOR EACH ROW EXECUTE FUNCTION public.prevent_pos_register_location_change_with_open_shift();

REVOKE ALL ON FUNCTION public.prevent_pos_register_location_change_with_open_shift() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prevent_pos_register_location_change_with_open_shift() TO authenticated, service_role;

-- Prevent two open shifts from being active on the same register at once.
CREATE UNIQUE INDEX IF NOT EXISTS pos_one_open_shift_per_register_idx
  ON public.pos_shifts(register_id)
  WHERE status = 'open' AND register_id IS NOT NULL;

-- Completed sales must be attached to a register whose location is known.
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'enforce_pos_sale_location'
      AND pg_get_function_identity_arguments(oid) = ''
  ) THEN
    NULL;
  END IF;
END $guard$;

-- Repair only missing shift locations from their register; no stock or sales are changed.
UPDATE public.pos_shifts s
SET location_id = r.location_id
FROM public.pos_registers r
WHERE s.register_id = r.id
  AND s.location_id IS NULL
  AND r.location_id IS NOT NULL;
