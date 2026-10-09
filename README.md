# Liziz — premium modest womenswear

A warm, minimal storefront for Liziz, a women's modest clothing brand that designs and manufactures its own pieces. Built with Next.js App Router, React, Tailwind CSS and SQLite. Requires Node.js 22 or later and a persistent writable filesystem for the database.

## Run locally

```bash
npm ci
# On a new checkout only (do not overwrite an existing .env):
cp .env.example .env
```

Set `JWT_SECRET` to a random secret (at least 32 characters), and set `ADMIN_PASSWORD` before starting. Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The local workspace already has an ignored `.env` with generated credentials; use its `ADMIN_USERNAME` and `ADMIN_PASSWORD` to sign in.

```bash
npm run dev
```

Open `http://localhost:3000`, or `/admin` for the dashboard. `npm run dev` prints a network URL for phone testing. `npm run dev:local` binds to localhost.

The bootstrap creates the schema, the configured administrator and the initial modest-fashion categories. It never inserts sample products, customers, leads, sales, locations or historical claims. `npm run seed` is safe to repeat and preserves existing records. The database is `data/liziz.db` by default.

## Store features

- Server-rendered product listings, search, category filtering and price/newest sorting, with shareable filter URLs.
- Product galleries, sizes, colours, variant stock and pricing, discounts, featured products and new arrivals.
- Persistent shopping bag and WhatsApp checkout without a customer account.
- Admin product, stock, category, image, content, payment-display, social-link, SEO and staff management; role-based access; product-view and checkout-lead analytics.
- Editable home and About content, optional lookbook, milestones, statistics and branch maps.
- Responsive navigation, keyboard-accessible mobile menu, visible focus, reduced-motion support and zoomable forms.

Checkout records an analytics lead before handing the message to WhatsApp. A lead is an expression of interest, not a confirmed payment or fulfilled order. Customers must press Send in WhatsApp; the shop confirms the details there. Payment-provider labels remain configurable display features, not payment-gateway integrations.

## Configure for launch

1. Set Liziz's receiving WhatsApp number in Admin → Settings (international format). The blank default intentionally avoids routing orders to a made-up number.
2. Add real product photography, descriptions, prices, stock, garment measurements and delivery information through the existing admin tools. The catalog starts empty.
3. Set the actual canonical domain in Admin → SEO or `SITE_URL`. No Liziz domain, social account, address or founding date is assumed. Social links, analytics and Search Console are blank until configured.
4. Confirm payment-provider arrangements and update their display options in the admin.
5. Use HTTPS in production, configure `COOKIE_SECURE=true` behind an HTTPS proxy when needed, and back up the SQLite database. Keep `.env` and database files private.

```bash
npm run build
npm start
```

## Design and SEO

Warm Chalk `#FDFBF4`, Cream Tweed `#FAF8F0`, Soft Bisque `#E9D8C8`, Ribbed Taupe `#C1A990` and Dark Mocha `#705E51` form the palette. Deep brown ink is used where text needs more contrast, especially on taupe buttons. System serif and sans-serif fonts avoid external font requests.

Local editorial images use compressed WebP and responsive Next.js image delivery; below-the-fold imagery is lazy-loaded. Product grids and sitemaps use queries that exclude inline image blobs. Public settings are delivered with the server layout to avoid a client fetch waterfall. The app includes canonical URLs, product/organization structured data, a live sitemap, social sharing metadata and robots directives for private routes. Filtered views use the main collection canonical; search query pages are not indexed. Stock and CMS changes remain visible without a rebuild.

Research and generated image provenance: [design notes](docs/liziz-design.md).
