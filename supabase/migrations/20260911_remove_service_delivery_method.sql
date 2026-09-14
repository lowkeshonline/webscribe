alter table public.services drop column if exists delivery_method;
notify pgrst, 'reload schema';
