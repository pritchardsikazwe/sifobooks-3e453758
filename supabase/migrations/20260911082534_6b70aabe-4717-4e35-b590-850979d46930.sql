REVOKE EXECUTE ON FUNCTION public.can_manage_company(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.company_data_inventory(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_company(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_company(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_company(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.block_archived_company_members() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_archived_active_company() FROM PUBLIC, anon, authenticated;