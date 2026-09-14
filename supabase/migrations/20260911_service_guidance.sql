-- Replace structured service specifications and usage rules with free-form guidance.
alter table public.services drop column if exists specs;
alter table public.services drop column if exists usage_instructions;
alter table public.services add column if not exists dos text;
alter table public.services add column if not exists donts text;

alter table public.orders drop column if exists usage_instructions;
alter table public.orders add column if not exists dos text;
alter table public.orders add column if not exists donts text;

notify pgrst, 'reload schema';
