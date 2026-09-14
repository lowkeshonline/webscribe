alter table public.account_credentials add column if not exists profile_name text;
alter table public.account_credentials add column if not exists expires_at timestamptz;
notify pgrst, 'reload schema';
