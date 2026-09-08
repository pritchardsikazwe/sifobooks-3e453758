-- POS location enforcement and location-aware stock read helper.
-- Keeps the existing POS/accounting engine; this only binds a register/shift to one location.

CREATE OR REPLACE FUNCTION public.pos_location_stock(_location uuid)
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  barcode text,
  category text,
  unit text,
  sell_price numeric,
  cost_price numeric,
  quantity_on_hand numeric,
  reorder_level numeric,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id,i.name,i.sku,i.barcode,i.category,i.unit,i.sell_price,i.cost_price,
         COALESCE(b.quantity,0) AS quantity_on_hand,
         i.reorder_level,i.is_active
  FROM public.stock_items i
  LEFT JOIN public.stock_balances b ON b.item_id=i.id AND b.location_id=_location
  WHERE i.user_id=auth.uid() OR public.is_staff_of(i.user_id)
  ORDER BY i.name
  LIMIT 2000;
$$;

REVOKE ALL ON FUNCTION public.pos_location_stock(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pos_location_stock(uuid) TO authenticated, service_role;

-- A shift cannot point at a different location from its register.
CREATE OR REPLACE FUNCTION public.enforce_pos_shift_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _register_location uuid;
BEGIN
  IF NEW.register_id IS NOT NULL THEN
    SELECT location_id INTO _register_location
    FROM public.pos_registers
    WHERE id=NEW.register_id;

    IF _register_location IS NOT NULL THEN
      IF NEW.location_id IS NULL THEN
        NEW.location_id := _register_location;
      ELSIF NEW.location_id <> _register_location THEN
        RAISE EXCEPTION 'POS shift location does not match its register';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pos_shift_location_guard ON public.pos_shifts;
CREATE TRIGGER pos_shift_location_guard
BEFORE INSERT OR UPDATE OF register_id, location_id ON public.pos_shifts
FOR EACH ROW EXECUTE FUNCTION public.enforce_pos_shift_location();

-- A completed POS sale must use the location-bound register/shift. Draft/held
-- records are not inventory postings and are deliberately not rejected here.
CREATE OR REPLACE FUNCTION public.enforce_pos_sale_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _register_location uuid; _shift_location uuid;
BEGIN
  IF NEW.status = 'completed' THEN
    IF NEW.register_id IS NOT NULL THEN
      SELECT location_id INTO _register_location FROM public.pos_registers WHERE id=NEW.register_id;
    END IF;
    IF NEW.shift_id IS NOT NULL THEN
      SELECT location_id INTO _shift_location FROM public.pos_shifts WHERE id=NEW.shift_id;
    END IF;

    IF _register_location IS NOT NULL AND _shift_location IS NOT NULL AND _register_location <> _shift_location THEN
      RAISE EXCEPTION 'Completed POS sale register and shift locations do not match';
    END IF;

    IF NEW.register_id IS NULL OR NEW.shift_id IS NULL THEN
      RAISE EXCEPTION 'Completed POS sale requires a location-bound register and open shift';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pos_sale_location_guard ON public.pos_sales;
CREATE TRIGGER pos_sale_location_guard
BEFORE INSERT OR UPDATE OF status, register_id, shift_id ON public.pos_sales
FOR EACH ROW EXECUTE FUNCTION public.enforce_pos_sale_location();

-- Backfill existing shifts from their register, without changing sales or stock.
UPDATE public.pos_shifts s
SET location_id=r.location_id
FROM public.pos_registers r
WHERE s.register_id=r.id AND s.location_id IS NULL AND r.location_id IS NOT NULL;
