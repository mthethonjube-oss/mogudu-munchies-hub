
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- authenticated still needs to call has_role (RLS policies invoke it as the current role)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
