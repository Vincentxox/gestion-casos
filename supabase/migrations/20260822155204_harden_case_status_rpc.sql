alter function public.change_case_status(uuid, public.case_status, text)
  security invoker;

grant update (status) on public.cases to authenticated;
