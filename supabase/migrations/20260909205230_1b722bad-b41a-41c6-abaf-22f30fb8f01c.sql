-- 1) Cost fallback for POS postings
CREATE OR REPLACE FUNCTION public.pos_sale_item_cost_fallback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.unit_cost,0) = 0 AND NEW.item_id IS NOT NULL THEN
    SELECT COALESCE(cost_price,0) INTO NEW.unit_cost FROM public.stock_items WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pos_sale_item_cost ON public.pos_sale_items;
CREATE TRIGGER trg_pos_sale_item_cost
BEFORE INSERT ON public.pos_sale_items
FOR EACH ROW EXECUTE FUNCTION public.pos_sale_item_cost_fallback();

-- 2) Cash payments update the cashier's open drawer
CREATE OR REPLACE FUNCTION public.pos_payment_to_drawer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _drawer uuid;
BEGIN
  IF lower(COALESCE(NEW.method,'')) NOT IN ('cash') THEN RETURN NEW; END IF;

  SELECT id INTO _drawer FROM public.restaurant_cash_drawers
   WHERE user_id = NEW.user_id AND status = 'open' AND created_by = auth.uid()
   ORDER BY opened_at DESC LIMIT 1;

  IF _drawer IS NULL THEN
    SELECT id INTO _drawer FROM public.restaurant_cash_drawers
     WHERE user_id = NEW.user_id AND status = 'open'
     ORDER BY opened_at DESC LIMIT 1;
  END IF;

  IF _drawer IS NOT NULL THEN
    UPDATE public.restaurant_cash_drawers
       SET cash_sales = COALESCE(cash_sales,0) + COALESCE(NEW.amount,0),
           expected_cash = COALESCE(opening_float,0) + COALESCE(cash_sales,0) + COALESCE(NEW.amount,0)
                           - COALESCE(cash_payouts,0) - COALESCE(cash_drops,0),
           updated_at = now()
     WHERE id = _drawer;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pos_payment_drawer ON public.pos_payments;
CREATE TRIGGER trg_pos_payment_drawer
AFTER INSERT ON public.pos_payments
FOR EACH ROW EXECUTE FUNCTION public.pos_payment_to_drawer();