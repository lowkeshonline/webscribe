# Webscribe

Webscribe is a Next.js storefront and operations dashboard for subscription-service inventory, semi-automated UPI verification, account assignment, customer delivery, reseller roles, and support tickets.

## Local development

Create `.env.local` from `.env.example`, configure the required values, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database

For a new Supabase project, run `supabase/schema.sql` in the SQL editor. For an existing project, run the dated migrations in order, including `supabase/migrations/20260912_production_hardening.sql` before production deployment.

The application accesses Supabase only from authenticated server actions through the service-role client. Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` variable.

## Vercel deployment

1. Import this repository into Vercel as a Next.js project.
2. Add every variable from `.env.example` to the Production environment.
3. In Supabase Auth URL Configuration, set the Site URL to the production Vercel domain and enable email confirmation for public registration.
4. Use a strong, unique `ADMIN_PASSWORD` only if you retain password login for the administrator. Generate `CREDENTIAL_ENCRYPTION_KEY` once with `openssl rand -base64 32`, store it securely, and keep the same value across deployments.
5. Optional (customer login is disabled for now): configure Google OAuth in Supabase Auth and add the application callback URL described in `supabase/README.md`.
6. Deploy and verify guest checkout (order form collects name, Telegram, and WhatsApp), admin login, payment submission, Telegram admin notification, account assignment, fulfillment, and ticket creation.

Run the local production checks before pushing:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Detailed database and backend notes are in `supabase/README.md`; the current architecture and implementation history are in `system_design.md`.
