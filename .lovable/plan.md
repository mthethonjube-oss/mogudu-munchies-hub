- ***Mogudu Monday — Build Plan***

**Tagline:** "Authentic Flavour, Every Monday."
**Cuisine:** Traditional African — mogodu (tripe) specialties, fast food, takeaway.

## Design Direction

- **Theme:** Deep matte black (#0B0B0B) backgrounds, warm gold (#D4A24C / #F4C76A gradient) accents, ivory white (#F8F5EE) text. Subtle film-grain texture on hero sections.
- **Type:** "Fraunces" (display, for hero headings + "Monday" emphasis) + "Inter" (UI). Loaded via @fontsource.
- **Feel:** Editorial restaurant + modern delivery app. Rounded-2xl cards, soft gold glow shadows, generous spacing.
- **Motion:** Framer Motion — fade/slide on scroll, card lift on hover, animated cart badge, dish image zoom, smooth page transitions, animated number counters on analytics.
- **Mobile-first:** Bottom tab bar on mobile (Home, Menu, Orders, Account), sticky top nav on desktop.

## Pages / Routes

Public:

- `/` Landing — hero, today's special, "How it works", featured dishes, CTA
- `/menu` Browse menu (categories: Mogodu Specials, Mains, Sides, Drinks, Combos)
- `/menu/$itemId` Dish detail with add-to-cart
- `/specials` Weekly specials calendar (Mon–Sun grid showing each day's featured dish)
- `/about`, `/contact`
- `/auth` Sign in / sign up (email + password, Google)

Authenticated (`/_authenticated/`):

- `/cart` Review cart + checkout (delivery address + map pin)
- `/orders` Order history
- `/orders/$orderId` Live tracking — map with driver location, status timeline, ETA
- `/account` Profile + notifications

Admin (`/_authenticated/admin/`, gated by `admin` role):

- `/admin` Analytics dashboard — 6-month sales trend, top dishes, orders by status, revenue today/week/month
- `/admin/orders` Order queue — accept, mark preparing/out-for-delivery/delivered, assign driver
- `/admin/menu` CRUD menu items + weekly special schedule
- `/admin/drivers` Driver list + live locations

## Features

1. **Auth** — Email/password + Google via Lovable Cloud. Profile auto-created on signup. Roles via `user_roles` table + `has_role()` security-definer fn.
2. **Menu & cart** — Cart in localStorage (guest) → persisted to DB on checkout. Quantity, notes per item.
3. **Ordering** — Address autocomplete via Google Places (New), delivery pin on Google Map, order summary, place order (no payments in v1 — "Pay on delivery" + placeholder for future Stripe).
4. **Live tracking** — Order detail shows Google Map with driver marker. Driver location stored in `driver_locations` table, updated by driver-side "Driver mode" toggle in `/admin/drivers` that polls `navigator.geolocation` every 10s. Customer view subscribes to Supabase Realtime channel for that order's driver, animating marker between updates. Status timeline (Placed → Preparing → Out for delivery → Delivered) with admin-set ETA.
5. **Weekly specials calendar** — Admin assigns a dish to each weekday; public `/specials` page renders the week with the current day highlighted in gold.
6. **In-app notifications** — Bell icon in header; `notifications` table; Supabase Realtime inserts toast via sonner + adds to dropdown list. Triggers: order status changes, new weekly special, admin broadcasts.
7. **Admin analytics dashboard** — Recharts: 6-month revenue line, orders-per-day bar, top 5 dishes, status breakdown donut, KPI cards with animated counters. Seeded with ~6 months of demo orders via migration (cleanly flagged `is_demo=true` so it can be cleared later).
8. **Admin order management** — Live order queue with realtime updates, status buttons, driver assignment.

## Tech / Architecture

- TanStack Start, Tailwind v4, shadcn/ui, Framer Motion, Recharts, Lucide icons.
- Lovable Cloud (Supabase) for DB, auth, realtime, storage (dish images).
- Google Maps connector for Maps JS API, Places autocomplete, geocoding, and Routes API (driver→customer route + ETA).
- TanStack Query for data; `createServerFn` for writes (place order, update status); Realtime subscriptions in components for live order/driver updates.

### Database (all with RLS + grants)

- `profiles` (id → auth.users, full_name, phone, default_address, lat, lng)
- `user_roles` (user_id, role: 'admin' | 'driver' | 'customer') + `app_role` enum + `has_role()` fn
- `categories` (id, name, sort_order)
- `menu_items` (id, category_id, name, description, price, image_url, is_available)
- `weekly_specials` (day_of_week 0–6, menu_item_id)
- `orders` (id, user_id, status, subtotal, delivery_fee, total, address, lat, lng, eta_at, driver_id, is_demo, created_at)
- `order_items` (order_id, menu_item_id, qty, unit_price, notes)
- `driver_locations` (driver_id, lat, lng, updated_at)
- `notifications` (id, user_id, title, body, read, created_at)
- Trigger: on `orders.status` change → insert notification + (if status='out_for_delivery') set driver.
- Migration seeds: categories, ~20 menu items with placeholder images, weekly specials, and 6 months of demo orders distributed across days for the analytics chart.

### Security

- RLS: customers see only their own orders/notifications; admins see all via `has_role(auth.uid(),'admin')`; drivers see assigned orders; `driver_locations` readable by the order owner + admins.
- Public reads (`menu_items`, `categories`, `weekly_specials`) via narrow `TO anon` SELECT.
- Place-order server fn uses `requireSupabaseAuth`; recomputes totals server-side from DB prices (never trust client totals).
- Google Maps managed key works on `*.lovable.app`; note custom-domain setup for later.

## Out of Scope (v1)

- Real payments (stub "Pay on delivery"; Stripe can be added later).
- Browser web push / SMS — in-app notifications only as requested.
- Dedicated driver mobile app — driver location is captured via the admin "Driver mode" toggle in the browser.

## Build Order

1. Enable Lovable Cloud, connect Google Maps, install deps (framer-motion, recharts, @fontsource/fraunces, @fontsource/inter, date-fns).
2. Theme tokens in `src/styles.css` + fonts + base layout (header, mobile bottom nav, footer).
3. Auth pages + `_authenticated` gate + roles + profile trigger.
4. DB schema + seed migration (menu, specials, 6 months demo orders).
5. Public pages: landing, menu, item detail, specials calendar.
6. Cart + checkout with Places autocomplete + map pin.
7. Orders list + live tracking page (map + realtime driver marker + status timeline).
8. Notifications (bell + realtime + sonner).
9. Admin: analytics dashboard, order queue, menu CRUD, weekly specials editor, drivers + Driver mode.
10. Polish: animations, empty states, loading skeletons, SEO metadata per route.