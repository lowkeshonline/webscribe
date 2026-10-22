-- Offer services hide validity and original price on the storefront.
alter table public.services add column if not exists is_offer_service boolean not null default false;

notify pgrst, 'reload schema';
