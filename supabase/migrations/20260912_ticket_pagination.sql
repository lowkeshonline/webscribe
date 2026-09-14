-- Support newest-first server-side ticket pages without scanning the full ticket list.
create index if not exists idx_tickets_status_created_at
  on public.tickets(status, created_at desc, id desc);

notify pgrst, 'reload schema';
