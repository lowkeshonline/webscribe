-- Guest checkout: every order must carry both Telegram and WhatsApp delivery contacts.
alter table public.orders drop constraint if exists orders_customer_whatsapp_required;
alter table public.orders add constraint orders_customer_whatsapp_required
  check (nullif(trim(customer_whatsapp), '') is not null) not valid;

notify pgrst, 'reload schema';
