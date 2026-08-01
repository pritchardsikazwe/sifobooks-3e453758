GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_view_module(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_module(uuid, text) TO authenticated, service_role;

CREATE POLICY "Super admins can view all companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all company modules"
  ON public.company_modules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all subscriptions"
  ON public.company_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can view all company members"
  ON public.company_members FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));