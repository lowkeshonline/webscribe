-- Apply this migration to an existing Webscribe database.
alter table public.services
  add column if not exists original_price integer not null default 0;

alter table public.services
  add column if not exists our_price integer not null default 0;

alter table public.services
  add column if not exists variant_mode text not null default 'single';

alter table public.services
  add column if not exists price_starts_at integer;

alter table public.services
  add column if not exists variants jsonb not null default '[]'::jsonb;

alter table public.services
  add column if not exists validity_value integer not null default 30;

alter table public.services
  add column if not exists validity_unit text not null default 'days';

alter table public.services
  alter column description drop not null;

update public.services
set original_price = coalesce(nullif(original_price, 0), regular_price),
    our_price = coalesce(nullif(our_price, 0), regular_price)
where original_price = 0 or our_price = 0;

alter table public.services drop constraint if exists services_validity_value_check;
alter table public.services add constraint services_validity_value_check check (validity_value > 0);
alter table public.services drop constraint if exists services_validity_unit_check;
alter table public.services add constraint services_validity_unit_check check (validity_unit in ('days', 'months'));

notify pgrst, 'reload schema';
