-- Add service validity to an existing Webscribe database.
alter table public.services
  add column if not exists validity_value integer not null default 30;

alter table public.services
  add column if not exists validity_unit text not null default 'days';

alter table public.services drop constraint if exists services_validity_value_check;
alter table public.services add constraint services_validity_value_check check (validity_value > 0);
alter table public.services drop constraint if exists services_validity_unit_check;
alter table public.services add constraint services_validity_unit_check check (validity_unit in ('days', 'months'));

create index if not exists idx_orders_expires_at on public.orders(expires_at);

notify pgrst, 'reload schema';
