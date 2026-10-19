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
- Data lives in `data/db.json`; images in `uploads/`. Back up both.
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
