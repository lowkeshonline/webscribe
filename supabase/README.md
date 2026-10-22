# Webscribe Backend Setup

This project uses Supabase PostgreSQL for profiles, inventory, orders, delivery state, support tickets, and Telegram delivery logs.

## 1. Create Tables

Run `supabase/schema.sql` in the Supabase SQL editor.

The script is safe to rerun for the current tables and adds the service variants and Do's/Don'ts guidance columns to an existing `services` table.
If the database was created with an earlier version of the schema, run `supabase/migrations/20260911_service_fields.sql` and `supabase/migrations/20260911_service_validity.sql` as well. The latter adds validity columns and the expiry index required by the current order lifecycle, then reloads the Supabase API schema cache.
For older databases, run `supabase/migrations/20260911_service_guidance.sql` to remove the old structured service fields and add Do's/Don'ts guidance. For multiple-variant services, run `supabase/migrations/20260911_order_variants.sql` so checkout can persist the selected variant. Run `supabase/migrations/20260911_account_credentials.sql` to add the reusable admin account vault.
Run `supabase/migrations/20260912_ticket_pagination.sql` on existing databases to add the status and newest-first ticket index.
Run `supabase/migrations/20260912_order_customer_pagination.sql` on existing databases to add the composite order indexes used by fulfilled-order and customer-history pages.
Run `supabase/migrations/20261022_offer_services.sql` on existing databases to add the offer-service flag used to hide validity and original price.
Before production, run `supabase/migrations/20260912_production_hardening.sql`. It enables RLS, removes direct `anon`/`authenticated` table access, validates new contact/account/UTR records, adds UTR uniqueness, and installs the account timestamp trigger.

The UTR uniqueness index requires existing non-null UTR values to be unique. Check before applying the hardening migration:

```sql
select utr_number, count(*)
from public.orders
where utr_number is not null
group by utr_number
having count(*) > 1;
```

Resolve any test-data duplicates returned by this query before running the migration.

## 2. Environment

Copy `.env.example` to `.env.local` and set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CREDENTIAL_ENCRYPTION_KEY`
- `ADMIN_EMAILS`
- `ADMIN_PASSWORD`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`

The anon key is used only by the server-side Supabase Auth client. The service role key must only be used server-side. Do not expose it to browser code.
`ADMIN_PASSWORD` is only used to bootstrap an allowlisted admin Supabase Auth user if one does not exist yet.
For older local environments, `ADMIN_EMAIL` and `ADMIN_PASS` are accepted as compatibility aliases, but new deployments should use the names above.
Generate `CREDENTIAL_ENCRYPTION_KEY` with `openssl rand -base64 32`. Back it up securely and do not rotate it without re-encrypting stored values; losing it makes encrypted credentials unrecoverable.

Authentication uses Supabase Auth JWT access and refresh tokens stored in HTTP-only cookies. The OAuth callback attaches those cookies directly to its redirect response. The access token is verified with `getClaims()` during session hydration, with a validated Supabase Auth `getUser()` fallback only for projects where local claim verification is unavailable. After a profile is created or promoted, the server writes its profile ID and role to Supabase `app_metadata`, allowing subsequent reloads to restore the session without a profile-table round trip. Older sessions transparently fall back to the profiles table and receive the optimized claims after the next login.
Registration uses the normal Supabase Auth signup endpoint rather than the Admin API. Enable email confirmation and set the production Site URL in Supabase Auth settings before opening registration publicly. When confirmation is enabled, the profile is created on the first successful login after confirmation.
Role changes update Supabase `app_metadata` for the next login. The application does not poll or maintain a Realtime connection for role changes; an already-issued customer JWT remains valid until its normal refresh or logout because Supabase's Admin API cannot revoke another user's JWT without the user's token.
Google sign-in uses Supabase's PKCE OAuth flow through `/auth/callback`. Enable Google in Supabase Auth, use `https://<project-ref>.supabase.co/auth/v1/callback` as the Google Cloud OAuth client's authorized redirect URI, and add the exact browser origin plus `/auth/callback` to Supabase's redirect allow list. For example, use `http://localhost:3000/auth/callback` on a computer and `http://172.20.10.3:3000/auth/callback` when testing through that LAN address on a phone. The OAuth client persists only its short-lived PKCE verifier in an HTTP-only cookie before the provider redirect; normal server-side Auth clients remain memory-only. The application can recover a code sent to the Site URL and can complete an older implicit callback as configuration fallbacks, but the callback URL must still be allow-listed for the normal flow. A first-time non-admin Google account must complete a short profile step with at least a Telegram username or WhatsApp number before it can place orders. An allowlisted admin Google account is provisioned directly as the admin profile.

## 3. Server Actions

Backend mutations live in `src/app/actions/backend.ts`.

Implemented actions:

- `beginGoogleSignInAction`
- `completeGoogleProfileAction`
- `registerProfileAction`
- `loginAction`
- `logoutAction`
- `updateProfileRoleAction`
- `upsertServiceAction`
- `deleteServiceAction`
- `updateServiceStockAction`
- `createOrderAction` (creates the order and submits its validated UTR in one operation)
- `rejectOrderAction`
- `createTicketAction`
- `resolveTicketAction`
- `listAdminTicketsAction` (server-paginated open/resolved ticket lists, ten records per page)
- `listAdminFulfilledOrdersAction` (server-paginated fulfilled-order list, ten records per page, service filter)
- `listCustomerOrdersAction` (server-paginated active order history, ten records per page)
- `listCustomerTicketsAction` (server-paginated customer ticket history, ten records per page)
- `listAdminDashboardAction`
- `searchProfilesAction`
- `listAccountCredentialsAction`
- `createAccountCredentialAction`
- `attachAccountToOrderAction`

Telegram messages are sent to the administrator for payment verification requests and support tickets. Customer account delivery is handled through the order page and the selected Telegram or WhatsApp contact link; account credentials are not delivered through a customer-facing bot action. If Telegram env vars are missing, the action records a skipped log instead of failing the business operation. Services, users, orders, and tickets are loaded only from Supabase; there is no bundled demo dataset.

Order creation happens only when payment verification is submitted. The server calculates pricing from the stored service and role, validates a 12-digit UTR, rejects reused UTRs, creates a verification-pending order, and then sends the admin notification. User-provided Telegram message fields are HTML-escaped and the external bot request has a timeout, so Telegram downtime does not lose the order.

Administrators can store reusable credentials in `account_credentials`, organized by service type. Account IDs are generated by the server and remain stable for order mapping. Each record supports account email/password, created date, expiry date, optional profile name, and optional PIN. Accounts can be edited from the expanded service group and attached to a matching order.
New passwords, PINs, and additional credential notes are encrypted with AES-256-GCM before they are stored in inventory or copied into an order. Existing plaintext records remain readable and are encrypted the next time the account is edited or assigned.

Fulfilled orders retain their database history after expiry. Expired account credentials are hidden from active inventory and customer-facing views; no scheduled purge job is configured, so order history and expired account records remain available for deliberate administrative cleanup.

Admin ticket pages are queried with a Supabase range rather than loading the complete ticket table. Results are ordered by newest `created_at` first with a ticket ID tie-breaker. Resolved-ticket search is applied in the server action before pagination.

Fulfilled admin orders and customer orders/tickets use the same ten-item newest-first pagination contract and the shared `PaginationControls` component. Customers can create a ticket from Support by selecting one of their orders; tickets remain order-scoped. Ticket replacement-account controls are not exposed in the admin UI.

The admin overview also receives an exact registered-profile count for its user analytics metric. Network-backed UI actions use pending state and disable the initiating control until the server action completes.
