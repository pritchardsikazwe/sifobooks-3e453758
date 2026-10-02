-- pos_sales has no worker_id column; the trigger referenced it and failed
-- whenever a sale header was inserted without a location (pos_checkout
-- inserts the header before resolving the location since migration 0009).
-- Use the existing created_by column, falling back to the signed-in user.
CREATE OR REPLACE FUNCTION public.pos_sales_set_location()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.location_id IS NULL THEN
    NEW.location_id := public.pos_default_location(NEW.user_id, COALESCE(NEW.created_by, auth.uid()));
  END IF;
  RETURN NEW;
END $function$;