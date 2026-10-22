create extension if not exists "pgcrypto";

do $$ begin create type user_role as enum ('customer', 'reseller'); exception when duplicate_object then null; end $$;
do $$ begin create type service_category as enum ('Streaming', 'Music', 'AI & Tools', 'Gaming'); exception when duplicate_object then null; end $$;
do $$ begin create type stock_status as enum ('in_stock', 'low_stock', 'out_of_stock'); exception when duplicate_object then null; end $$;
do $$ begin create type delivery_method as enum ('instant', 'telegram'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('pending_payment', 'verification_pending', 'completed', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type delivery_status as enum ('pending', 'delivered', 'action_required'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_status as enum ('open', 'in_progress', 'resolved'); exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id text primary key default gen_random_uuid()::text,
  auth_user_id uuid unique,
  full_name text not null,
  email text not null unique,
  telegram text not null,
  whatsapp text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_contact_required check (nullif(trim(telegram), '') is not null or nullif(trim(whatsapp), '') is not null)
);

create table if not exists services (
  id text primary key,
  title text not null,
  category service_category not null,
  logo_url text,
  brand_color text not null,
  description text,
  dos text,
  donts text,
  original_price integer not null default 0 check (original_price >= 0),
  our_price integer not null default 0 check (our_price >= 0),
  regular_price integer not null check (regular_price >= 0),
  reseller_price integer not null check (reseller_price >= 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  stock_status stock_status not null default 'out_of_stock',
  validity_value integer not null default 30 check (validity_value > 0),
  validity_unit text not null default 'days' check (validity_unit in ('days', 'months')),
  variant_mode text not null default 'single' check (variant_mode in ('single', 'multiple')),
  price_starts_at integer check (price_starts_at >= 0),
  variants jsonb not null default '[]'::jsonb,
  is_popular boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table services add column if not exists variants jsonb not null default '[]'::jsonb;
alter table services add column if not exists dos text;
alter table services add column if not exists donts text;
alter table services add column if not exists delivery_time text;
alter table services drop column if exists delivery_method;
alter table services drop column if exists specs;
alter table services drop column if exists usage_instructions;
alter table services add column if not exists original_price integer not null default 0;
alter table services add column if not exists our_price integer not null default 0;
alter table services add column if not exists variant_mode text not null default 'single';
alter table services add column if not exists price_starts_at integer;
alter table services add column if not exists validity_value integer not null default 30;
alter table services add column if not exists validity_unit text not null default 'days';
alter table services alter column description drop not null;

alter table services drop constraint if exists services_validity_value_check;
alter table services add constraint services_validity_value_check check (validity_value > 0);
alter table services drop constraint if exists services_validity_unit_check;
alter table services add constraint services_validity_unit_check check (validity_unit in ('days', 'months'));

create table if not exists orders (
  id text primary key,
  secret_key text not null unique,
  profile_id text references profiles(id) on delete set null,
  service_id text references services(id) on delete restrict,
  service_title text not null,
  variant_id text,
  variant_name text,
  service_category service_category not null,
  user_role user_role not null,
  price_paid integer not null check (price_paid >= 0),
  regular_price integer not null check (regular_price >= 0),
  reseller_discount integer,
  customer_name text not null,
  customer_telegram text not null,
  customer_whatsapp text,
  contact_method text not null default 'telegram' check (contact_method in ('telegram', 'whatsapp')),
  payment_status payment_status not null default 'pending_payment',
  utr_number text check (utr_number is null or utr_number ~ '^\d{12}$'),
  payment_proof_name text,
  delivery_method delivery_method not null,
  delivery_status delivery_status not null default 'pending',
  credentials jsonb,
  account_id text,
  dos text,
  donts text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_customer_whatsapp_required check (nullif(trim(customer_whatsapp), '') is not null)
);

create table if not exists account_credentials (
  id text primary key,
  service_id text not null references services(id) on delete restrict,
  service_title text not null,
  variant_id text,
  variant_name text,
  username text,
  profile_name text,
  password text,
  pin text,
  additional_info text,
  status text not null default 'available' check (status in ('available', 'assigned')),
  assigned_order_id text references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint account_credentials_expiry_check check (expires_at > created_at)
);

create index if not exists idx_account_credentials_service_id on account_credentials(service_id);
create index if not exists idx_account_credentials_status on account_credentials(status);

alter table orders add column if not exists dos text;
alter table orders add column if not exists donts text;
alter table orders add column if not exists account_id text;
alter table profiles add column if not exists whatsapp text;
alter table orders add column if not exists customer_whatsapp text;
alter table orders add column if not exists contact_method text not null default 'telegram';
alter table orders drop column if exists usage_instructions;
alter table account_credentials add column if not exists variant_id text;
alter table account_credentials add column if not exists variant_name text;

alter table profiles drop constraint if exists profiles_contact_required;
alter table profiles add constraint profiles_contact_required
  check (nullif(trim(telegram), '') is not null or nullif(trim(whatsapp), '') is not null) not valid;
alter table orders drop constraint if exists orders_customer_whatsapp_required;
alter table orders add constraint orders_customer_whatsapp_required
  check (nullif(trim(customer_whatsapp), '') is not null) not valid;
alter table account_credentials drop constraint if exists account_credentials_expiry_required;
alter table account_credentials add constraint account_credentials_expiry_required
  check (expires_at is not null) not valid;
alter table account_credentials drop constraint if exists account_credentials_expiry_check;
alter table account_credentials add constraint account_credentials_expiry_check
  check (expires_at > created_at) not valid;
alter table orders drop constraint if exists orders_utr_format_check;
alter table orders add constraint orders_utr_format_check
  check (utr_number is null or utr_number ~ '^\d{12}$') not valid;

create table if not exists tickets (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  service_title text not null,
  customer_telegram text not null,
  issue_category text not null,
  description text not null,
  status ticket_status not null default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists telegram_logs (
  id uuid primary key default gen_random_uuid(),
  order_id text references orders(id) on delete set null,
  ticket_id text references tickets(id) on delete set null,
  chat_id text,
  message text not null,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on profiles(email);
create index if not exists idx_orders_profile_id on orders(profile_id);
create index if not exists idx_orders_profile_created_at on orders(profile_id, created_at desc, id desc);
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_payment_created_at on orders(payment_status, created_at desc, id desc);
create index if not exists idx_orders_delivery_status on orders(delivery_status);
create index if not exists idx_orders_expires_at on orders(expires_at);
create unique index if not exists idx_orders_utr_unique on orders(utr_number) where utr_number is not null;
create index if not exists idx_tickets_order_id on tickets(order_id);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_status_created_at on tickets(status, created_at desc, id desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles
for each row execute function set_updated_at();

drop trigger if exists trg_services_updated_at on services;
create trigger trg_services_updated_at before update on services
for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
for each row execute function set_updated_at();

drop trigger if exists trg_tickets_updated_at on tickets;
create trigger trg_tickets_updated_at before update on tickets
for each row execute function set_updated_at();

drop trigger if exists trg_account_credentials_updated_at on account_credentials;
create trigger trg_account_credentials_updated_at before update on account_credentials
for each row execute function set_updated_at();

alter table profiles enable row level security;
alter table services enable row level security;
alter table orders enable row level security;
alter table account_credentials enable row level security;
alter table tickets enable row level security;
alter table telegram_logs enable row level security;

revoke all on profiles, services, orders, account_credentials, tickets, telegram_logs from anon, authenticated;
grant select, insert, update, delete on profiles, services, orders, account_credentials, tickets, telegram_logs to service_role;
