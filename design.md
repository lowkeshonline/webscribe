# Webscribe Design System

Webscribe uses a restrained subscription-operations interface over an ambient gradient canvas: glassy compact cards, clear inventory states, and a subtle animated particle field. The UI should feel modern and alive without turning into a decorative landing page.

## Color Tokens

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-canvas` | `#f6f8fb` | `#070914` | Base background fallback |
| `--color-surface` | `rgba(255,255,255,0.82)` | `rgba(15,21,38,0.78)` | Header, cards, modals, nav |
| `--color-surface-hover` | `rgba(237,244,247,0.92)` | `rgba(27,36,58,0.9)` | Hover and active neutral fills |
| `--color-card-border` | `rgba(49,70,84,0.14)` | `rgba(169,189,214,0.16)` | Dividers and card outlines |
| `--color-text-primary` | `#111827` | `#f5f8ff` | Primary copy and icons |
| `--color-text-secondary` | `#53606d` | `#b8c3d3` | Descriptions and support copy |
| `--color-text-muted` | `#7c8896` | `#7f8ba0` | Metadata and placeholders |
| `--color-brand-violet` | `#176b87` | `#4fd1c5` | Primary action and selected state |
| `--color-reseller-indigo` | `#6c5ce7` | `#a78bfa` | Reseller-only emphasis |

Status colors are semantic only: success `#267456`, warning `#b7791f`, danger `#b94343`.

## Typography

- Body: Inter via `--font-inter`.
- Headings: Plus Jakarta Sans via `--font-jakarta`.
- Code and references: JetBrains Mono via `--font-jetbrains`.
- Use `font-semibold` or `font-bold` sparingly for hierarchy. Avoid extra-bold display treatment in compact UI.
- Letter spacing stays at `0`; do not use negative tracking utilities.

## Shape And Elevation

- Cards and panels: `18px` radius through `--radius-card`.
- Inner tiles and icon wells: `14px` radius through `--radius-inner`.
- Inline controls and chips: full pills through `--radius-pill`.
- Use `ws-panel`, `ws-panel-muted`, `ws-chip`, `ws-input`, and `ws-primary-button` before adding one-off Tailwind combinations.
- Shadows should be soft and low-contrast. Avoid neon glows, animated pulse badges, and scaling selected navigation.

## Ambient Background

- The app shell uses `--bg-gradient` for both themes.
- Dark mode uses an ink-to-midnight gradient with teal and violet-blue energy. Do not use mustard, gold, or warm yellow as the main dark-mode accent.
- Light mode uses a soft sky, mist, and pale violet gradient while keeping content contrast high.
- `AmbientBackground` renders deterministic particles behind the app. Keep particle opacity low, motion slow, and respect `prefers-reduced-motion`.
- Do not put particles inside cards, modals, or navigation. The effect belongs to the page canvas only.
- The particle layer must scroll with the app shell, not use a fixed negative z-index layer. Fixed animated backgrounds combined with sticky UI can flicker during rapid scrolling.
- Do not apply `backdrop-filter` to repeated cards or large scrollable lists. Use translucent fills and borders for the glass effect instead.
- Apply the ambient gradient to `html`, `body`, and `.app-shell`. Scroll-edge bounce must use `--scroll-edge-color`, never a white root background.
- Keep horizontal overflow disabled at the document and shell level to prevent side gutters during fast or diagonal scrolling, but do not disable vertical scrolling or overscroll globally.

## Component Rules

- Header: translucent canvas background and compact brand lockup. Catalog owns the service search field so discovery controls stay with the results they filter.
- Hero: practical discovery first. Role banners are panels, not gradients. Explore does not include category filter tabs; its inventory grid stays unfiltered.
- Customer Explore: authenticated customers and resellers get compact dashboard cards for total orders, ready access, support tickets, and access level.
- Service cards: brand color is limited to the service initial tile. App actions use the system accent.
- Reseller mode: use the reseller token for prices and bulk CTAs only.
- Admin: operational panels with semantic statuses. No decorative gradient banners.
- Admin overview: show operational counts for new orders, pending review, fulfilled orders, open tickets, and registered users. The user count is loaded from the server, not inferred from search results.
- Modals: use the same panel system as the page, with neutral QR and credential blocks for readability.
- Mobile nav: selected state uses a tinted fill and accent icon/text, with no scale or pulse animation.
- Network-backed buttons must disable while their action is pending and show a compact spinner or progress label. Per-record actions must lock only the affected record so unrelated work remains usable.
- The explore view shows the live service grid without promotional best-selling cards. The catalog view provides the live search field and category filters.
- Admin service forms: numeric fields use blank input states for zero values so clearing and replacing a value remains possible. Pricing labels must distinguish Original, Our price, and Reseller price.
- Account guidance: use separate Do's and Don'ts text fields with one point per line.
- Paginated admin and customer lists use the shared `PaginationControls` component with clear previous/next icons, numbered pages, and a page summary. Keep the server response page size at ten records and preserve newest-first ordering.
- The customer Support view provides an `Add ticket` action with an order selector, issue type, and description. Keep feedback inside the page UI.

## Dark Mode Direction

Dark mode is an ambient gradient field, not a flat slate page. Surfaces should stay translucent and readable; the accent is teal, reseller emphasis is violet, and particles add motion only in the background layer.
