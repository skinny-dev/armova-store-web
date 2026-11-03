# Armova Store

Bilingual (Farsi default / English) storefront with a management dashboard. Node + Express, no build step, JSON-file storage.

```bash
npm install
ADMIN_PASSWORD='choose-a-password' npm start   # http://localhost:4000
```

- Store: `/` — RTL Farsi by default; language toggle in the header (choice is remembered). Product/Model image toggle, grid density, size drawer, cart drawer, checkout (order saved, stock decremented).
- Admin: `/admin` — dashboard stats, products CRUD (bilingual, sizes/stock, product/model images), categories CRUD, file manager (upload, usage, delete-protection for in-use files), orders with status.
- First run auto-seeds demo data with placeholder images (`AUTO_SEED=0` to disable; `npm run seed -- --force` to reseed).
- Env: `PORT`, `ADMIN_PASSWORD` (used only when the owner account is first created; default `admin123` — change it in *My account*), `SESSION_SECRET`, `APIIR_TOKEN` (api.ir Bearer token), `SMS_PROVIDER` (`apiir` default | `kavenegar`), `KAVENEGAR_API_KEY`, `KAVENEGAR_SENDER`, `PUBLIC_URL` (links inside SMS).
- Storage: set `DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DBNAME` to use PostgreSQL (one JSONB document in table `armova_state`, created automatically; an existing `data/db.json` is imported on first run; `PG_SSL=1` enables SSL). Without it, data lives in `data/db.json`. Run a single app instance. Images always live in `uploads/` — mount that folder on persistent storage.
- Import your own photos: `npm run import -- [folder] [--clear] [--publish]` (default folder `public/armova-products`; subfolders become categories; `name-1.jpg`, `name-2.jpg` group into one product; filenames with "model" become model shots).

## Accounts, roles & permissions
- Staff log in at `/admin` with username + password (first run creates the owner account `owner`), or with an SMS code sent to the phone saved on their account.
- **Team & access**: the owner creates users and roles and ticks permissions per role in a matrix (default roles: owner, manager, marketing, support, catalog editor). Every API route checks permissions on the server; the UI hides what a user cannot do. Nobody can grant a permission they do not have, and the last active owner cannot be removed.

## SMS (api.ir / Kavenegar), customers & CRM
- Settings → SMS: pick the provider and paste its token (or set env `APIIR_TOKEN`). **api.ir** (default): messages go through `POST https://s.api.ir/api/sw1/SendSms`, login codes through the dedicated OTP line `SmsOTP` (type 0-4, default 1 = login code), falling back to a normal SMS if the OTP line fails. **Kavenegar** is still available (sender number + optional verify/lookup template). With no token, or with *SMS sending enabled* switched off, the app runs in **dev mode**: SMS are written to the server console and the SMS log, never sent, and the login code is shown on screen to requests from this computer.
- Note: api.ir's `SendSms` is a *service* (transactional) line. Check with api.ir whether promotional campaigns may be sent over it.
- Customers log in on the store with an SMS code (`/account` shows their orders, tracking, cancel/return). Checkout works as a guest unless *Require SMS-code login* is switched on in Settings.
- **Messages → Templates**: ~27 editable templates (OTP, order placed/confirmed/shipped/delivered/cancelled, payment success/failed, refunds, tracking, out for delivery, pickup, delay, returns, back-in-stock, abandoned cart, review request, coupon expiring, promo, admin alerts for new/low-stock/high-value orders). Owner and marketing can edit them; essential/recommended ones are on by default, marketing/optional ones are off.
- **Customers** (CRM): search, segments, tags, notes, marketing consent, CSV export, single/bulk messages and campaigns (promotional messages only go to customers who consented).
- Status/payment changes on an order send the matching SMS automatically; admin alerts go to the phone numbers set in Settings.

## Discounts & categories
- **Discounts**: automatic sales (change the shown price) or coupon codes, percent or fixed, scoped to everything / categories (including sub-categories) / chosen products, with schedule, minimum order, usage limits. Create one from selected products on the Products page; Products bulk edit also supports price % change, add stock and more.
- **Categories** are a tree (sub-categories up to 4 levels); parent pages list products of all descendants.

## Pushing the catalog to your live site (Runflare or any host)
Moves **categories, products and their photos** from your computer to the live site. Orders, customers, users, discounts and settings on the live site are never touched.
1. Deploy the latest code to the host and set these environment variables there: `SYNC_TOKEN` (a long random secret, 24+ chars; sync is switched off if it is not set), and, if the host has a persistent volume, `DATA_DIR` and `UPLOADS_DIR` pointing into it (otherwise the database and photos are lost on every redeploy).
2. Locally run `node scripts/push-catalog.js --init https://your-live-site` — it saves the URL and creates a token in `data/sync.json` (git-ignored). Copy that `token` value into `SYNC_TOKEN` on the host and redeploy.
3. `node scripts/push-catalog.js --dry` shows what would change; `node scripts/push-catalog.js` pushes (only missing photos are uploaded; categories/products are matched by slug, so it is safe to re-run).
   - Existing live products keep their **live stock and visibility** by default; add `--stock` and/or `--active` to overwrite them too.
4. Remove `SYNC_TOKEN` from the host when you are done to switch the endpoint off.

## Online payment (Zibal) and Kavenegar templates / delivery reports

- **Zibal:** Admin → Settings → Online payment. Merchant `zibal` is Zibal's public demo (no real money); use your own merchant ID for real payments (or env `ZIBAL_MERCHANT`). When on, checkout offers "Pay online"; the order is marked paid only after the server verifies it with Zibal (`/pay/zibal/callback`). Unpaid orders can be paid again from the result screen, and admins can re-check a payment from the Orders page.
- **Kavenegar:** choose it as the provider in Settings and paste the API key. Without a sender line the demo line `0018018949161` is used. In Messages → Templates each message can name a template registered in the Kavenegar panel; it is then sent with `verify/lookup` (variables fill `%token`, `%token2`, `%token3`, `%token10`, `%token20` in the order you choose), otherwise as a normal SMS.
- **Reports:** with Kavenegar, delivery states (delivered / not delivered / pending) are fetched every 5 minutes or with the "Refresh delivery status" button; each campaign has a report with a CSV export, and the SMS log shows the credit balance. api.ir does not provide delivery reports here.

## SEO / GEO / AEO

Applied with the checklist from SNLabat/SEO-GEO-AEO-Skill (title ≤ 60 chars, description 150–160 with a call to action, one H1, canonical, Open Graph, JSON-LD, crawlable text, AI-crawler access). `lib/seo.js` renders per-page `<title>`, description, canonical, Open Graph/Twitter tags, JSON-LD (Organization, WebSite, Product + Offer, BreadcrumbList, CollectionPage, FAQPage) and a plain-HTML copy of the content into the page shell, so crawlers that do not run JavaScript still read it. Also `/robots.txt` (AI crawlers allowed; admin, api, account and pay blocked), `/sitemap.xml` (with product images), `/llms.txt` and the FAQ on `/about` (`/api/faq`). Categories live at `/category/<slug>` (old `/?cat=` links redirect with 301). Set Settings → Public site address to the real domain so canonical links use it.

## Installments (Digipay BNPL)

`lib/digipay.js` implements Digipay's UPG API (OAuth login, ticket with `type=13` BNPL / `5` CREDIT, callback, verify, deliver). Credentials come from Digipay after the merchant contract: Settings → Installments (client id/secret, username, password) or env `DIGIPAY_CLIENT_ID`, `DIGIPAY_CLIENT_SECRET`, `DIGIPAY_USERNAME`, `DIGIPAY_PASSWORD`, `DIGIPAY_SANDBOX=0`. It starts in Digipay's test environment (`uat.mydigipay.info`); switch it off only after a full test. Checkout then offers "Pay in installments with Digipay" (next to Zibal's card payment when both are on). The callback URL is `/pay/digipay/callback`; an order becomes paid only after the server verifies it. When an installment order is marked shipped, the app sends Digipay's required delivery confirmation (retry button on the Orders page). Unconfirmed against the real service: the amount unit (rial is the default, switchable), the basket field values (`sellerId`, category) and the delivery `products` format — check these in the sandbox.
