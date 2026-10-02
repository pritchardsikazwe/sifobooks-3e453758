-- pos_registers.location_id is stored as text; compare against the location id as text.
CREATE OR REPLACE FUNCTION public.pos_resolve_location(_register uuid DEFAULT NULL, _hint uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := public.current_tenant(); _loc uuid; _perm record; _branch uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  IF _register IS NOT NULL THEN
    SELECT l.id INTO _loc FROM public.pos_registers r
      JOIN public.inventory_locations l ON l.id::text = r.location_id AND l.user_id = _uid AND COALESCE(l.is_active, true)
     WHERE r.id = _register AND r.user_id = _uid;
    IF _loc IS NOT NULL THEN RETURN _loc; END IF;
  END IF;
  IF _hint IS NOT NULL AND EXISTS (SELECT 1 FROM public.inventory_locations l WHERE l.id = _hint AND l.user_id = _uid AND COALESCE(l.is_active, true)) THEN
    RETURN _hint;
  END IF;
  SELECT p.location_id, p.branch_id INTO _perm FROM public.employee_pos_permissions p
   WHERE p.worker_user_id = auth.uid() AND COALESCE(p.is_active, true)
   ORDER BY p.updated_at DESC NULLS LAST LIMIT 1;
  IF _perm.location_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.inventory_locations l WHERE l.id = _perm.location_id AND l.user_id = _uid AND COALESCE(l.is_active, true)) THEN
    RETURN _perm.location_id;
  END IF;
  _branch := COALESCE(_perm.branch_id, public.staff_branch());
  IF _branch IS NOT NULL THEN
    SELECT l.id INTO _loc FROM public.inventory_locations l
     WHERE l.user_id = _uid AND COALESCE(l.is_active, true) AND l.branch_id = _branch AND COALESCE(l.location_type,'') <> 'transit'
     ORDER BY (l.location_type = 'outlet') DESC, l.is_default DESC NULLS LAST LIMIT 1;
    IF _loc IS NOT NULL THEN RETURN _loc; END IF;
  END IF;
  SELECT l.id INTO _loc FROM public.inventory_locations l
   WHERE l.user_id = _uid AND COALESCE(l.is_active, true) AND COALESCE(l.location_type,'') <> 'transit'
   ORDER BY l.is_default DESC NULLS LAST, (l.location_type = 'outlet') DESC, l.created_at LIMIT 1;
  RETURN _loc;
END $$;