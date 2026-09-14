-- Keep all application data behind authenticated server actions. The service
-- role used by the server bypasses RLS; browser roles receive no table access.
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.account_credentials enable row level security;
alter table public.tickets enable row level security;
alter table public.telegram_logs enable row level security;

revoke all on public.profiles, public.services, public.orders, public.account_credentials, public.tickets, public.telegram_logs from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.services, public.orders, public.account_credentials, public.tickets, public.telegram_logs to service_role;

-- Enforce all constraints for new and updated rows without blocking deployment
-- because of legacy records that may need a separate cleanup.
alter table public.profiles drop constraint if exists profiles_contact_required;
alter table public.profiles add constraint profiles_contact_required
  check (nullif(trim(telegram), '') is not null or nullif(trim(whatsapp), '') is not null) not valid;

alter table public.account_credentials drop constraint if exists account_credentials_expiry_required;
alter table public.account_credentials add constraint account_credentials_expiry_required
  check (expires_at is not null) not valid;
alter table public.account_credentials drop constraint if exists account_credentials_expiry_check;
alter table public.account_credentials add constraint account_credentials_expiry_check
  check (expires_at > created_at) not valid;

alter table public.orders drop constraint if exists orders_utr_format_check;
alter table public.orders add constraint orders_utr_format_check
  check (utr_number is null or utr_number ~ '^\d{12}$') not valid;

create unique index if not exists idx_orders_utr_unique
  on public.orders(utr_number)
  where utr_number is not null;

drop trigger if exists trg_account_credentials_updated_at on public.account_credentials;
create trigger trg_account_credentials_updated_at before update on public.account_credentials
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
