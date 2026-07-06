
REVOKE EXECUTE ON FUNCTION public.recalc_invoice_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.after_receipt_change() FROM PUBLIC, anon, authenticated;
