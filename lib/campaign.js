// Background bulk SMS sender (~4 messages/second) with a progress record in db.campaigns.
const db = require('./db');
const sms = require('./sms');
const orders = require('./orders');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// recipients: customer records (already filtered). vars(c) -> extra template variables per customer.
function start({ name, kind, text, recipients, skipped = 0, by = null, vars = () => ({}), templateKey = '' }) {
  const footer = kind === 'promo' ? String(((db.get().settings || {}).promoFooter) || '').trim().slice(0, 100) : '';
  const camp = { id: db.nextId(), name: String(name || 'Campaign').slice(0, 80), kind, text, footer, total: recipients.length, sent: 0, failed: 0, skipped, status: 'running', by, createdAt: Date.now() };
  db.get().campaigns.push(camp); db.save();
  (async () => {
    for (const c of recipients) {
      const msg = sms.render(text, { name: c.name, store: sms.storeName(), link: orders.baseUrl(), ...vars(c) }) + (footer ? '\n' + footer : '');
      const e = await sms.send(c.phone, msg, { type: templateKey || (kind === 'promo' ? 'campaign' : 'message'), customerId: c.id, campaignId: camp.id, by });
      e && e.status === 'failed' ? camp.failed++ : camp.sent++;
      await sleep(250);
    }
    camp.status = 'done'; camp.doneAt = Date.now(); db.save();
  })().catch((e) => { camp.status = 'error'; console.error(e); db.save(); });
  return camp;
}
module.exports = { start };
