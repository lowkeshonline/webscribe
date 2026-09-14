-- Persist the selected variant so its validity and delivery details are used at fulfillment.
alter table public.orders add column if not exists variant_id text;
alter table public.orders add column if not exists variant_name text;

notify pgrst, 'reload schema';
