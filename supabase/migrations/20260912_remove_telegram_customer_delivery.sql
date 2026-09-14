alter table public.profiles drop column if exists telegram_chat_id;
drop index if exists public.idx_profiles_telegram_chat_id;
alter table public.orders drop column if exists telegram_link;
notify pgrst, 'reload schema';
