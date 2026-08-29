REVOKE ALL ON FUNCTION public.guard_portfolio_financials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_financials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.force_transaction_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_new_chat_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;