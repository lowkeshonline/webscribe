

- #### Project Name : Webscribe
- #### Author : lowkeshonline
- #### Dev Team : 
	- lowkeshonline(Frontend)
	- lowkeshonline(Backend)
- #### Web URL : Not yet specified



# 1. Project Overview : 

The goal of this project is to build a web-based platform that simplifies the management and sale of budget-friendly OTT services. It is designed to reduce the manual effort involved in handling customer inquiries and orders through Telegram by providing a centralized interface for managing inventory, services, payments, and customer accounts.

The platform aims to automate the overall workflow—from service selection and payment processing to account delivery—making the process faster, more organized, and less dependent on manual communication.

# 2. Problem Statement

The current process of managing and selling OTT services involves several repetitive and time-consuming manual tasks. The project aims to address the following problems:

### 1. Inventory Listing

Whenever a customer contacts me on Telegram, I have to manually provide the list of currently available OTT services and then explain the specifications, pricing, and availability of each service. Repeating this process for every customer consumes significant time and effort.

### 2. Manual Payments

After a customer agrees to purchase a service, I manually share the payment QR code with them. This process should be automated without necessarily integrating a payment gateway. Instead, the system should provide a semi-automated solution that generates a QR code based on the amount the customer needs to pay for the selected service.

### 3. Ticket Resolution

When a provided account stops working, customers typically contact me without providing sufficient details about the affected service or account. Resolving these issues requires manually searching through previous Telegram conversations to identify the account and service details, making the process inefficient and time-consuming.

### 4. Reseller Dashboard

The platform serves both regular customers and resellers. Resellers purchase services at lower prices than regular customers, making it difficult to manage different pricing structures manually. A unified interface is required that differentiates users based on their roles and displays the appropriate pricing accordingly.

### 5. Account Delivery

Customers choose a preferred contact medium at checkout. Administrators can then deliver an assigned account through the customer's Telegram or WhatsApp contact, while the order retains the full delivery state and credential record in the application. Each service can also provide free-form Do's and Don'ts guidance.

# 3. Project Objectives

The primary objective of this project is to build a centralized web-based platform that reduces the manual effort involved in managing, selling, and delivering OTT services. The system aims to achieve the following objectives:

1. **Automate Inventory Listing:** Provide customers with an up-to-date list of available OTT services, including their pricing, specifications, and availability, without requiring manual communication.
    
2. **Semi-Automate Payments:** Generate payment QR codes dynamically based on the selected service and the amount to be paid, reducing the need to manually share payment details for every transaction.
    
3. **Simplify Ticket Resolution:** Maintain service and account information associated with each customer so that account-related issues can be identified and resolved without searching through previous Telegram conversations.
    
4. **Implement Role-Based Pricing:** Provide separate pricing based on user roles, allowing regular customers and resellers to access the appropriate service prices through a unified platform.
    
5. **Automate Account Delivery:** Let administrators assign inventory credentials to an order, deliver them through the customer's selected Telegram or WhatsApp contact, and track fulfillment explicitly.
    
6. **Centralize Service Management:** Provide a single interface for managing inventory, customers, resellers, orders, payments, support tickets, and account deliveries, reducing dependency on manual Telegram-based workflows.

# 4. System Requirements

The system requirements define the features, capabilities, and quality standards that the platform must satisfy to achieve the project objectives.

### 4.1 Functional Requirements

The system should provide the following functional capabilities:

1. **User Authentication & Authorization**
    
    - Allow users to register and log in securely.
        
    - Every newly registered user should automatically be assigned the **Regular Customer** role by default.
        
    - Only administrators can change a user's role from Regular Customer to **Reseller** through the admin dashboard.
        
    - Display features and pricing based on the user's assigned role.
    - Store Supabase Auth access and refresh JWTs in HTTP-only cookies. Verified JWT claims carry the profile ID and role metadata used for fast session hydration; profile-table lookup remains a fallback for sessions issued before these claims were added.
    - Support Google OAuth through Supabase Auth's PKCE flow and an application callback route. First-time non-admin Google users must add at least one Telegram or WhatsApp delivery contact before their profile is created and the application becomes usable; the configured admin email is provisioned directly as the administrator.
        
2. **Service & Inventory Management**
    
    - Allow administrators to add, update, and remove OTT services.
        
    - Maintain current service availability and inventory.
        
    - Display service specifications, pricing, and availability to customers.
	    
	    - Expired account credentials are excluded from active inventory and customer-facing views; order history and order-to-account records remain available for auditability.
        
3. **Order Management**
    
    - Allow customers to select and purchase available services.
        
    - Record order details, customer information, service information, and order status.
        
    - Provide administrators with an interface to manage and track orders.
        
4. **Dynamic Pricing**
    
    - Maintain different pricing structures for regular customers and resellers.
        
    - Automatically display the appropriate price based on the user's role.
        
5. **Payment Management**
    
    - Generate a payment QR code dynamically based on the amount associated with an order.
        
    - Allow the administrator to verify and update the payment status.
        
    - Maintain payment information for each transaction.
        
6. **Dynamic Account Delivery**
    
    - Support customer-selected Telegram or WhatsApp delivery after an account is assigned.
        
    - Allow direct credential delivery through the web application where applicable.
        
    - Allow Telegram and WhatsApp direct-message links where the customer has supplied the selected contact. Telegram bot messages are reserved for administrator notifications.
        
    - Preserve all order details on the web application regardless of the delivery method used.
        
    - Maintain the selected delivery mode and current delivery status for every order.
        
    - Allow administrators to update and track the delivery status from the web application.
        
7. **Customer Support & Ticket Management**
    
    - Allow customers to report issues with their purchased services.
        
    - Automatically associate tickets with the relevant order and account information.
        
    - Allow administrators to view, manage, and resolve support tickets.

    - Show open tickets newest first by default. Resolved tickets remain searchable by ticket ID, customer username, or related order ID and are paginated to keep each server action limited to ten tickets.

    - Let customers create an order-scoped support ticket from the Support page by selecting an order, issue type, and description.
        
8. **Customer & Reseller Management**
    
    - Maintain customer and reseller profiles.
        
    - Track purchase history and relevant account information.
        
    - Provide resellers with access to their applicable pricing and services.

9. **Administrator Operations Workspace**

    - Administrators should use a dedicated operations workspace instead of customer navigation.
    - The workspace should summarize new orders, payment-review orders, fulfilled orders, inventory, open/resolved tickets, and customer/reseller counts.
    - Administrators should be able to create and edit services without a code change.
- A service may include an image URL, description, service-level pricing, stock, validity, and do's/don'ts.
- A service may contain flexible variants. Each variant may define its own name, pricing, stock count, and validity.
        

### 4.2 Non-Functional Requirements

The system should also satisfy the following quality requirements:

- **Security:** Protect user accounts, credentials, payment information, and service data.
    
- **Performance:** Provide fast response times for common operations such as browsing services, placing orders, and accessing dashboards.
    
- **Scalability:** Be designed so that additional services, users, resellers, and features can be added without major architectural changes.
    
- **Reliability:** Maintain consistent order, inventory, payment, and account information.
    
- **Usability:** Provide a simple and intuitive interface for customers, resellers, and administrators.
    
- **Maintainability:** Use a modular and well-structured codebase that can be easily maintained and extended.
    
- **Responsiveness:** Provide a usable experience across desktop, tablet, and mobile devices.

## 5. System Architecture

The system will follow a **modern full-stack web architecture** using Next.js as the primary application framework and Supabase as the backend infrastructure. The architecture is designed to keep the system simple, cost-effective, maintainable, and scalable for the expected user base.

### 5.1 Architecture Overview

The application will use a centralized architecture where the Next.js application handles the user interface and server-side application logic, while Supabase provides database, authentication, and storage services.

```text
                         ┌──────────────────────┐
                         │       Users          │
                         │ Customers / Resellers │
                         │      / Admin          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Next.js         │
                         │  Frontend + Backend  │
                         │                      │
                         │ React / TypeScript   │
                         │ API Routes / Actions │
                         └──────────┬───────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                     ▼              ▼              ▼
              ┌────────────┐ ┌────────────┐ ┌──────────────┐
              │ Supabase   │ │ Supabase   │ │  Telegram    │
              │ PostgreSQL │ │ Auth       │ │  Bot API     │
              │ Database   │ │            │ │              │
              └────────────┘ └────────────┘ └──────────────┘
                     │
                     ▼
              ┌────────────┐
              │ Supabase   │
              │  Storage   │
              └────────────┘

                         ┌──────────────────────┐
                         │       Vercel         │
                         │ Application Hosting  │
                         └──────────────────────┘
```

### 5.2 Frontend Layer

The frontend will be developed using **Next.js, TypeScript, Tailwind CSS, and shadcn/ui**.

It will provide separate interfaces for:

- Regular Customers
    
- Resellers
    
- Administrators
    

The interface will dynamically display services, pricing, orders, account information, support tickets, and other features based on the authenticated user's role.

### 5.3 Application Layer

Next.js will handle the application's server-side logic using **API Routes and Server Actions** where appropriate.

This layer will manage:

- Service and inventory operations
    
- Order processing
    
- Role-based pricing
    
- Payment information
    
- Account delivery workflows
    
- Customer support tickets
    
- Reseller management
    
- Administrative operations
    
- Telegram integrations
    

Keeping the application logic within Next.js eliminates the need for maintaining a separate backend server.

### 5.4 Database & Authentication Layer

**Supabase PostgreSQL** will serve as the primary database.

It will store information such as:

- User profiles and roles
    
- OTT services and inventory
    
- Service pricing
    
- Orders
    
- Payment records
    
- Account credentials and delivery information
    
- Delivery status and delivery modes
    
- Support tickets
    
- Reseller information
    

Supabase Authentication will handle user registration, login, sessions, and authentication-related functionality.

Newly registered users will receive the **Regular Customer** role by default. Only administrators will be able to promote users to the **Reseller** role.

### 5.5 Storage Layer

**Supabase Storage** will be used for storing application-related files where required, such as service images, QR-related assets, or other non-sensitive media.

Sensitive account credentials should not be stored as publicly accessible files.

### 5.6 Telegram Integration

The **Telegram Bot API** is integrated only for administrator notifications such as payment verification and support-ticket alerts. Customer account delivery is handled by the admin through direct Telegram or WhatsApp contact links; the application does not deliver account credentials or rejection messages through a customer-facing Telegram bot.

For an order requiring account delivery:

1. The customer places an order through the web application.
    
2. The order and delivery details are stored in the database.
    
3. The administrator is notified through Telegram or accesses the order through the admin dashboard.
    
4. Account delivery is completed through Telegram.
    
5. The delivery status is updated and preserved in the web application.
    

This ensures that even when delivery happens outside the web application, the complete order history remains centralized within the system.

### 5.7 Payment Architecture

The system will not initially integrate a third-party payment gateway.

Instead, it will use a **semi-automated UPI payment workflow**:

```text
Customer selects service
        ↓
System calculates amount
        ↓
Dynamic UPI QR generated
        ↓
Customer makes payment
        ↓
Admin verifies payment
        ↓
Payment status updated
        ↓
Order proceeds to delivery
```

# 11. Development Tracking

## 2026-09-10

- Added the responsive Webscribe storefront, admin dashboard, light/dark design tokens, animated ambient background, smooth scrolling, and scroll-edge canvas handling.
- Added Supabase PostgreSQL schema for profiles, services, orders, tickets, and Telegram logs.
- Added Supabase Auth registration/login/logout with HTTP-only session cookies and server-side authorization checks.
- Optimized authentication hydration by validating the access JWT with Supabase `getClaims()` instead of calling `getUser()` on every reload. Profile ID and reseller role are written to verified Supabase `app_metadata` claims after login, registration, and role changes, avoiding the normal profile lookup for current sessions.
- Removed periodic role synchronization and its repeated network traffic. Role changes update Supabase `app_metadata` for the next login; the current customer session remains unchanged until its normal refresh/re-login because Supabase cannot revoke another user's JWT without that user's token.
- Changed admin user management to search Supabase on demand by email or Telegram username instead of loading every registered profile during admin bootstrap.
- Restricted `/admin` at the server route boundary to the configured administrator email allowlist.
- Added admin operations for order review, approval/rejection, credential delivery, inventory stock updates, ticket resolution, and customer-to-reseller promotion.
- Added Telegram admin notifications and Telegram delivery deep-link generation.
- Added an admin operations overview showing new, pending-review, fulfilled, and ticket states.
- Removed customer navigation from the dedicated admin route.
- Added dynamic service creation/editing with image URLs, pricing, stock, validity, do's/don'ts, and flexible JSON variants.
- Service pricing now distinguishes original price, Webscribe selling price, and reseller price. Service guidance is entered as separate Do's and Don'ts text fields, one point per line.
- Service creation now begins with a single-variant or multiple-variant choice. Single services use service-level pricing and inventory; multiple services expose a price-starting value and require flexible variant entries.
- Removed silent in-memory fallback for authenticated orders, payment verification, tickets, and admin mutations so database failures are visible instead of creating data that the admin cannot see.
- Added an admin-only account credential vault. Available accounts can be attached to matching orders; the linked order stores the credentials and can be explicitly delivered through the customer's selected contact medium.
- Admin inventory now separates stock accounts from service management. Stock is grouped into service cards with account detail dialogs, copyable short account IDs, edit/delete controls, and protected deletion of assigned accounts.
- Admin order management now contains only pending payment reviews and fulfilled-order cards. Both views support service-type filters; order cards support account assignment or reassignment by account ID and direct Telegram or WhatsApp customer messaging.
- Fulfilled orders persist `account_id` so order history maintains a traceable order-to-account relationship.
- Separated admin inventory into stock accounts first and service management below. Stock account storage uses a modal form, generates stable account IDs server-side, groups records by service type with collapsible counts, and supports editing lifecycle dates, account email, optional profile name, and optional PIN.
- Removed the bundled mock dataset and database seed action. The application now renders only records returned from Supabase.
- Admins no longer receive customer footer navigation. A dedicated admin footer exposes Overview, Orders, Inventory, Tickets, and Users.
- Added service validity as a positive value in days or calendar months. The validity starts when the admin fulfills the order and is stored as `expires_at`; expired order history remains in Supabase while expired credentials are excluded from active views.
- Multiple-variant checkout now requires a selected variant and stores that variant on the order. Each variant can define its own validity value and unit; fulfillment uses the selected variant's validity.
- Customer profiles include editable Telegram and WhatsApp contact details while name and email remain immutable. At least one contact method is required at signup and in profile updates; password changes require verification of the existing password.
- Checkout stores the customer's selected contact method and both profile contact values on the order so administrators can prepare Telegram or WhatsApp delivery follow-up actions.
- Pending order cards use an explicit account-assignment save control, show delivery icons only for the customer's selected contact medium, and allow administrators to mark orders fulfilled or return them to pending when delivery needs correction.
- Account assignment uses service-scoped autocomplete suggestions, retains the assignment on the pending card, and displays the attached account before delivery or fulfillment.
- Added an admin-only Delete service action. Services without references are deleted; services referenced by historical orders are archived from the catalog so order history remains intact. Deletion is blocked when inventory accounts are still stored for that service.
- Assigning an account does not fulfill or deliver an order. Administrators explicitly send the deliverable and then mark the order fulfilled; returning an order to pending clears its fulfillment expiry so validity starts again on the next fulfillment.
- Admin ticket lists use a server-side ten-item page size, newest-first ordering, and server-side resolved-ticket search. Pagination metadata is returned with each page, and the shared pagination control is designed for reuse by fulfilled-order lists.
- Removed ticket replacement-account controls and their server action from the admin support workflow.
- Added server-side ten-item pagination for fulfilled admin orders and customer order/ticket history. Customer Support now includes an `Add ticket` form with an order selector; all paginated lists use newest-first ordering and the shared pagination control.
- Removed the exploratory best-selling card strip. Service search now lives in the Catalog tab and filters service title, description, and category while the Explore tab stays focused on the live inventory grid.
- Added an admin Overview user analytics count backed by an exact Supabase profile count.
- Added shared loading-button behavior for network-backed authentication, checkout, support, inventory, order, role, ticket, and pagination actions. Pending record actions are disabled until their server action completes to prevent duplicate submissions.
- Removed category filter tabs from the customer Explore view. Explore now presents the complete live service inventory, while Catalog owns category and text filtering.
- Added authenticated customer/reseller Explore dashboard cards for order count, ready access, support ticket count, and current access level.
- Hardened profile authentication for production: profile persistence is now internal to login/registration, existing roles are preserved, public admin-email/password fallbacks were removed, and logout revokes the Supabase refresh-token family before clearing cookies.
- Consolidated checkout into one server action that validates a unique 12-digit UTR, calculates server-owned pricing, creates the verification-pending order, and sends the admin notification. Order IDs and secrets now use cryptographic randomness.
- Added production database hardening with RLS enabled, direct browser-role table grants revoked, new-row contact/account/UTR constraints, unique UTR enforcement, and account timestamp maintenance.
- Removed account deletion side effects from admin page loads. Expired credentials are hidden immediately and remain available for deliberate administrative cleanup; no scheduled deletion job is configured.
- Escaped user-controlled Telegram HTML, bounded notification content, and added an external request timeout with failure logging.
- Added Vercel-ready environment documentation, a tracked `.env.example`, QR image host configuration, and baseline response security headers.
- Added server-side AES-256-GCM encryption for newly stored account passwords, PINs, and additional credential notes, with backward-compatible reads for existing plaintext rows.

## 2026-09-13

- Added Google sign-in through Supabase Auth's PKCE flow with a short-lived HTTP-only OAuth verifier cookie and `/auth/callback` route. Existing email/password accounts remain supported during the migration.
- Added mandatory first-login profile completion for new non-admin Google accounts. The profile can proceed only after a Telegram username or WhatsApp number is supplied; Google-provided name and email remain read-only.
- Allowlisted administrator Google sign-in provisions the administrator profile directly and routes to the admin dashboard.
- Hardened the Google callback by attaching session cookies directly to its redirect response. Session hydration now falls back to Supabase Auth's validated `getUser` request only when local JWT claim verification is unavailable, so valid Google sessions are not silently rendered as anonymous.
- Added a Site URL OAuth-code recovery path. When Supabase returns a PKCE code to `/` because a redirect URL is not yet allow-listed, the client exchanges it before bootstrapping the interface rather than rendering an anonymous Explore view.
- Google OAuth now derives its return URL from the validated browser origin, which keeps LAN/mobile testing on the same host that started sign-in. The callback reports a missing verifier or failed exchange to the sign-in UI instead of silently rendering an anonymous state, and supports an implicit-token callback only as a transition fallback for legacy Supabase Auth settings.
- Corrected the server-side Supabase Auth client so PKCE OAuth enables its supplied cookie storage adapter. Supabase ignores custom storage when `persistSession` is disabled; this had prevented the short-lived verifier cookie from being written before the Google redirect.
- Removed the weekly expired-account Vercel cron, its `CRON_SECRET` configuration, route handler, and cleanup helper. Expired accounts are filtered from active views but are no longer automatically deleted.

## 2026-09-14

- Restructured admin-generated Telegram and WhatsApp delivery messages into readable sections with blank-line separation, greetings, order details, credentials, and service-specific Do's and Don'ts. Telegram keeps the requested emojis; WhatsApp uses the same structure with plain-text labels to avoid unsupported emoji replacement characters. Admin payment notifications continue to include their existing service, customer, and payment details without the Do's and Don'ts section.
- Added shared strict validation for authentication, profile, Google profile completion, and stored account email inputs. Customer Telegram usernames accept only valid 5-32 character Telegram handles, WhatsApp is restricted to Indian mobile numbers beginning with 6-9 with optional +91 formatting, names accept letters with common name punctuation, emails require a valid domain, and new passwords are limited to 8-72 characters. Existing passwords remain accepted for login so legacy accounts are not locked out; the length policy applies to registration and password changes.

## Remaining Implementation

- Complete live verification of administrator Telegram notifications and direct-message delivery links.
- Move stock deduction to an atomic database function to prevent concurrent overselling.
- Add automated integration tests and live end-to-end verification.
- Enable Supabase email confirmation and configure the production Site URL before opening registration to untrusted public traffic.
- Configure Google OAuth credentials and Supabase redirect URLs, then complete a live first-login/profile-completion verification.

### 5.8 Hosting & Deployment

The application will be deployed using **Vercel**.

The initial infrastructure will use free-tier services wherever possible:

- **Vercel** → Application hosting
    
- **Supabase** → PostgreSQL, Authentication, and Storage
    
- **Telegram Bot API** → Telegram integration
    

This architecture avoids the need for a dedicated backend server or traditional VPS, keeping the initial operating cost at **₹0** while providing a path for future scaling.

### 5.9 Scalability

The architecture is designed to support the expected initial user base and future growth.

With Next.js handling the application layer and Supabase providing managed backend infrastructure, the system can be scaled by increasing the resources of the respective services when required, without requiring a complete architectural redesign.
