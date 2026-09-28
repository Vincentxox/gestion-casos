-- Trigger-only functions must not be callable through the Data API.
revoke all on function public.handle_new_user() from anon, authenticated;

-- The role RPC is intentionally available only to signed-in users and validates
-- administrator privileges internally. Anonymous callers must never execute it.
revoke all on function public.set_user_role(uuid, public.app_role) from anon;

create index case_status_history_changed_by_idx
  on public.case_status_history (changed_by);
