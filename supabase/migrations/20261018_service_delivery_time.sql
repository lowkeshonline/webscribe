-- Adds the admin-facing estimated delivery time shown on the service form and catalog.
alter table services add column if not exists delivery_time text;
