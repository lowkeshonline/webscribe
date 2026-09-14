create table if not exists public.account_credentials (
  id text primary key,
  service_id text not null references public.services(id) on delete restrict,
  service_title text not null,
  username text,
  profile_name text,
  password text,
  pin text,
  additional_info text,
  status text not null default 'available' check (status in ('available', 'assigned')),
  assigned_order_id text references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_account_credentials_service_id on public.account_credentials(service_id);
create index if not exists idx_account_credentials_status on public.account_credentials(status);
notify pgrst, 'reload schema';
