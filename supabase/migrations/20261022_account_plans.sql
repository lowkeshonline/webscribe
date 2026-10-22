-- Store the service plan (variant) an inventory account belongs to.
alter table public.account_credentials add column if not exists variant_id text;
alter table public.account_credentials add column if not exists variant_name text;

notify pgrst, 'reload schema';
