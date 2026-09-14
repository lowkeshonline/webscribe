alter table public.orders add column if not exists account_id text;
create index if not exists idx_orders_account_id on public.orders(account_id);
notify pgrst, 'reload schema';
