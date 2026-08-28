REVOKE EXECUTE ON FUNCTION public.post_restaurant_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_post_restaurant_order() FROM PUBLIC, anon, authenticated;