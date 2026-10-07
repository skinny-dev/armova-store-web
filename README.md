# Armova Store

Bilingual (Farsi default / English) storefront with a management dashboard. Node + Express, no build step, JSON-file storage.

```bash
npm install
ADMIN_PASSWORD='choose-a-password' npm start   # http://localhost:4000
```

- Store: `/` — RTL Farsi by default; language toggle in the header (choice is remembered). Product/Model image toggle, grid density, size drawer, cart drawer, checkout (order saved, stock decremented).
- Admin: `/admin` — dashboard stats, products CRUD (bilingual, sizes/stock, product/model images), categories CRUD, file manager (upload, usage, delete-protection for in-use files), orders with status.
- First run auto-seeds demo data with placeholder images (`AUTO_SEED=0` to disable; `npm run seed -- --force` to reseed).
- Env: `PORT`, `ADMIN_PASSWORD` (default `admin123` — change it), `SESSION_SECRET`.
- Data lives in `data/db.json`; images in `uploads/`. Back up both.
