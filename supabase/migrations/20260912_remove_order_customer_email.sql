alter table public.orders drop column if exists customer_email;
drop index if exists public.idx_orders_customer_email;
notify pgrst, 'reload schema';
