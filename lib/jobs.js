// Periodic background jobs: abandoned-cart reminders and review requests.
// Both only send when their template is enabled in Messages → Templates.
const db = require('./db');
const sms = require('./sms');
const orders = require('./orders');

const cfg = () => ({ abandonedHours: 3, reviewDays: 3, ...((db.get().settings || {}).automation || {}) });
const on = (key) => { const t = sms.templates().find((x) => x.key === key); return !!(t && t.enabled); };

async function abandonedCarts() {
  if (!on('abandoned_cart')) return;
  const s = db.get(), c = cfg(), now = Date.now(); let n = 0;
  for (const cu of s.customers) {
    if (n >= 50) break;
    if (!cu.marketingOptIn || cu.blocked || !cu.cart || !cu.cart.length || !cu.cartAt) continue;
    const age = now - cu.cartAt;
    if (age < c.abandonedHours * 3600e3 || age > 72 * 3600e3 || cu.cartRemindedAt === cu.cartAt) continue;
    if (sms.ordersOf(cu).some((o) => o.createdAt > cu.cartAt)) continue;
    cu.cartRemindedAt = cu.cartAt; n++;
    await sms.sendTemplate('abandoned_cart', cu.phone, { name: cu.name, link: orders.baseUrl() ? orders.baseUrl() + '/' : '' }, { customerId: cu.id });
  }
  if (n) db.save();
}
async function reviewRequests() {
  if (!on('review_request')) return;
  const s = db.get(), c = cfg(), now = Date.now(); let n = 0;
  for (const o of s.orders) {
    if (n >= 50) break;
    if (o.status !== 'delivered' || o.reviewRequested || !o.deliveredAt || now - o.deliveredAt < c.reviewDays * 864e5) continue;
    o.reviewRequested = true; n++;
    orders.notify(o, 'review_request');
  }
  if (n) db.save();
}
function start() {
  const tick = () => Promise.all([abandonedCarts(), reviewRequests()]).catch((e) => console.error('[jobs]', e.message));
  setTimeout(tick, 30e3); setInterval(tick, 10 * 60e3).unref();
}
module.exports = { start, abandonedCarts, reviewRequests };
