alter table public.profiles add column if not exists whatsapp text;
alter table public.orders add column if not exists customer_whatsapp text;
alter table public.orders add column if not exists contact_method text not null default 'telegram';
alter table public.orders drop constraint if exists orders_contact_method_check;
alter table public.orders add constraint orders_contact_method_check check (contact_method in ('telegram', 'whatsapp'));
notify pgrst, 'reload schema';
