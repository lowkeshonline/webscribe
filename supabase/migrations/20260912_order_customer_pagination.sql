-- Composite indexes for the server-paginated order history queries.
create index if not exists idx_orders_profile_created_at
  on public.orders(profile_id, created_at desc, id desc);

create index if not exists idx_orders_payment_created_at
  on public.orders(payment_status, created_at desc, id desc);
