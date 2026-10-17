// SMS via Kavenegar (https://kavenegar.com) + message templates + customer helpers.
// Without an API key everything runs in "dev mode": messages are logged to the console and the SMS log, never sent.
const crypto = require('crypto');
const db = require('./db');
const A = require('./auth');

// ---------- phone ----------
const DIGITS = { '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9, '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
function normPhone(v) {
  let d = String(v || '').replace(/[۰-۹٠-٩]/g, (c) => DIGITS[c]).replace(/\D/g, '');
  if (d.startsWith('0098')) d = '0' + d.slice(4); else if (d.startsWith('98') && d.length === 12) d = '0' + d.slice(2); else if (d.length === 10 && d.startsWith('9')) d = '0' + d;
  return /^09\d{9}$/.test(d) ? d : '';
}

// ---------- config ----------
function config() {
  const s = (db.get().settings || {}).sms || {};
  return { apiKey: process.env.KAVENEGAR_API_KEY || s.apiKey || '', sender: process.env.KAVENEGAR_SENDER || s.sender || '', otpTemplate: s.otpTemplate || '', enabled: s.enabled !== false, fromEnv: !!process.env.KAVENEGAR_API_KEY };
}
const configured = () => { const c = config(); return !!(c.apiKey && c.enabled); };

// ---------- templates ----------
// priority: essential | recommended | conditional | optional | marketing | admin (also decides the default on/off state)
const T = (key, group, priority, fa, en, when, text, vars) => ({ key, group, priority, label: { fa, en }, when, text, vars, enabled: ['essential', 'recommended', 'admin'].includes(priority) });
const W = (fa, en) => ({ fa, en });
const O = ['name', 'orderId', 'store'];
const DEFAULT_TEMPLATES = [
  T('otp', 'system', 'essential', 'کد ورود (OTP)', 'Login code (OTP)', W('هنگام ورود با پیامک', 'When someone logs in by SMS'), 'کد ورود شما به {store}: {code}\nاین کد را به کسی ندهید.', ['code', 'store']),
  T('welcome', 'system', 'optional', 'خوش‌آمدگویی', 'Welcome', W('بعد از اولین ورود مشتری', 'After a customer first logs in'), '{name} عزیز، به {store} خوش آمدید.', ['name', 'store']),
  T('order_new', 'order', 'essential', 'ثبت سفارش', 'Order placed', W('وقتی سفارش ثبت می‌شود', 'When an order is placed'), '{name} عزیز، سفارش شما با شماره {orderId} ثبت شد.\nمبلغ: {total} تومان\n{store}', [...O, 'total']),
  T('order_confirmed', 'order', 'essential', 'تایید سفارش', 'Order confirmed', W('وضعیت سفارش: تایید شد', 'Order status: confirmed'), '{name} عزیز، سفارش {orderId} تایید شد.\n{store}', O),
  T('order_processing', 'order', 'recommended', 'در حال پردازش', 'Order processing', W('وضعیت سفارش: در حال پردازش', 'Order status: processing'), '{name} عزیز، سفارش {orderId} در حال آماده‌سازی است.\n{store}', O),
  T('order_cancelled', 'order', 'essential', 'لغو سفارش', 'Order cancelled', W('وضعیت سفارش: لغو شد', 'Order status: cancelled'), '{name} عزیز، سفارش {orderId} لغو شد. برای اطلاعات بیشتر با ما تماس بگیرید.\n{store}', O),
  T('payment_success', 'payment', 'essential', 'پرداخت موفق', 'Payment successful', W('وضعیت پرداخت: پرداخت شد', 'Payment status: paid'), '{name} عزیز، پرداخت سفارش {orderId} به مبلغ {total} تومان با موفقیت انجام شد.\n{store}', [...O, 'total']),
  T('payment_failed', 'payment', 'essential', 'پرداخت ناموفق / ناتمام', 'Payment failed / incomplete', W('وضعیت پرداخت: ناموفق', 'Payment status: failed'), '{name} عزیز، پرداخت سفارش {orderId} کامل نشد. لطفا دوباره تلاش کنید یا با ما تماس بگیرید.\n{store}', O),
  T('refund_processed', 'payment', 'essential', 'بازگشت وجه انجام شد', 'Refund processed', W('وضعیت پرداخت: بازپرداخت شد', 'Payment status: refunded'), '{name} عزیز، مبلغ {total} تومان سفارش {orderId} به شما بازگردانده شد.\n{store}', [...O, 'total']),
  T('refund_failed', 'payment', 'recommended', 'بازگشت وجه ناموفق', 'Refund failed', W('وضعیت پرداخت: بازپرداخت ناموفق', 'Payment status: refund failed'), '{name} عزیز، بازگشت وجه سفارش {orderId} با مشکل روبرو شد. لطفا با ما تماس بگیرید.\n{store}', O),
  T('order_shipped', 'shipping', 'essential', 'ارسال سفارش', 'Order shipped', W('وضعیت سفارش: ارسال شد', 'Order status: shipped'), '{name} عزیز، سفارش {orderId} ارسال شد.\nکد رهگیری: {tracking}\n{store}', [...O, 'tracking']),
  T('tracking_available', 'shipping', 'essential', 'کد رهگیری', 'Tracking code available', W('وقتی کد رهگیری بعد از ارسال ثبت می‌شود', 'When a tracking code is added after shipping'), '{name} عزیز، کد رهگیری سفارش {orderId}: {tracking}\n{store}', [...O, 'tracking']),
  T('out_for_delivery', 'shipping', 'recommended', 'در مسیر تحویل', 'Out for delivery', W('وضعیت سفارش: در مسیر تحویل', 'Order status: out for delivery'), '{name} عزیز، سفارش {orderId} امروز تحویل داده می‌شود.\n{store}', O),
  T('order_delivered', 'shipping', 'recommended', 'تحویل سفارش', 'Order delivered', W('وضعیت سفارش: تحویل شد', 'Order status: delivered'), '{name} عزیز، سفارش {orderId} تحویل داده شد. از خرید شما سپاسگزاریم.\n{store}', O),
  T('ready_pickup', 'shipping', 'conditional', 'آماده تحویل حضوری', 'Ready for pickup', W('وضعیت سفارش: آماده تحویل حضوری', 'Order status: ready for pickup'), '{name} عزیز، سفارش {orderId} آماده تحویل حضوری است.\n{store}', O),
  T('shipping_delayed', 'shipping', 'recommended', 'تاخیر در ارسال', 'Shipping delayed', W('با دکمه «اطلاع تاخیر» در صفحه سفارش', 'With the "Notify delay" button on the order'), '{name} عزیز، ارسال سفارش {orderId} با تاخیر مواجه شده است. بابت این موضوع پوزش می‌خواهیم.\n{store}', O),
  T('return_requested', 'returns', 'recommended', 'ثبت درخواست مرجوعی', 'Return request submitted', W('وقتی درخواست مرجوعی ثبت می‌شود', 'When a return request is submitted'), '{name} عزیز، درخواست مرجوعی سفارش {orderId} ثبت شد و بررسی می‌شود.\n{store}', O),
  T('return_approved', 'returns', 'recommended', 'تایید مرجوعی / تعویض', 'Return / exchange approved', W('وضعیت سفارش: مرجوعی تایید شد', 'Order status: return approved'), '{name} عزیز، درخواست مرجوعی سفارش {orderId} تایید شد.\n{store}', O),
  T('return_rejected', 'returns', 'recommended', 'رد مرجوعی / تعویض', 'Return / exchange rejected', W('وضعیت سفارش: مرجوعی رد شد', 'Order status: return rejected'), '{name} عزیز، درخواست مرجوعی سفارش {orderId} تایید نشد. برای توضیح بیشتر با ما تماس بگیرید.\n{store}', O),
  T('back_in_stock', 'marketing', 'optional', 'موجود شدن محصول', 'Back in stock', W('وقتی محصولِ ناموجود دوباره موجود می‌شود', 'When a sold-out product is restocked'), '{name} عزیز، {product} (سایز {size}) دوباره موجود شد.\n{link}', ['name', 'product', 'size', 'link']),
  T('abandoned_cart', 'marketing', 'marketing', 'یادآوری سبد رها شده', 'Abandoned cart reminder', W('چند ساعت بعد از رها شدن سبد خرید (فقط مشتریان با رضایت بازاریابی)', 'Some hours after a cart is abandoned (marketing-consented customers only)'), '{name} عزیز، چند محصول در سبد خرید شما منتظر شماست.\n{link}', ['name', 'link']),
  T('promo', 'marketing', 'marketing', 'کمپین تخفیف / تبلیغاتی', 'Discount or promotional campaign', W('متن پیش‌فرض کمپین‌ها در بخش ارسال پیام', 'Default text for campaigns in the CRM'), '{name} عزیز، تخفیف ویژه {store}!\n{link}', ['name', 'store', 'link']),
  T('coupon_expiring', 'marketing', 'marketing', 'انقضای کد تخفیف', 'Coupon expiring', W('با دکمه «یادآوری» در صفحه تخفیف‌ها', 'With the "Remind" button on a coupon'), '{name} عزیز، کد تخفیف {code} ({discount}) تا {endsAt} معتبر است.\n{link}', ['name', 'code', 'discount', 'endsAt', 'link']),
  T('review_request', 'marketing', 'optional', 'درخواست نظر', 'Review / feedback request', W('چند روز بعد از تحویل سفارش', 'Some days after an order is delivered'), '{name} عزیز، از خرید شما سپاسگزاریم. نظر شما درباره سفارش {orderId} برای ما ارزشمند است.\n{link}', [...O, 'link']),
  T('admin_new_order', 'admin', 'admin', 'سفارش جدید (مدیر)', 'New order (admin)', W('وقتی سفارش جدید ثبت می‌شود', 'When a new order is placed'), 'سفارش جدید {orderId} از {customer} به مبلغ {total} تومان.', ['orderId', 'customer', 'total']),
  T('admin_low_stock', 'admin', 'admin', 'هشدار موجودی کم (مدیر)', 'Low stock (admin)', W('وقتی موجودی یک سایز از حد مجاز کمتر شود', 'When a size drops below the threshold'), 'موجودی کم: {product} سایز {size} فقط {stock} عدد.', ['product', 'size', 'stock']),
  T('admin_high_value', 'admin', 'admin', 'سفارش پرمبلغ یا مشکوک (مدیر)', 'High-value / suspicious order (admin)', W('سفارش بالاتر از سقف، تعداد زیاد یا سفارش‌های پشت‌سرهم از یک شماره', 'Order above the limit, big quantity or repeated orders from one number'), 'هشدار: سفارش {orderId} ({reason}) از {customer} به مبلغ {total} تومان.', ['orderId', 'customer', 'total', 'reason']),
];
function templates() {
  const s = db.get();
  let dirty = false;
  for (const d of DEFAULT_TEMPLATES) {
    const cur = s.templates.find((x) => x.key === d.key);
    if (!cur) { s.templates.push(JSON.parse(JSON.stringify(d))); dirty = true; }
    else if (JSON.stringify([cur.label, cur.when, cur.priority, cur.vars, cur.group]) !== JSON.stringify([d.label, d.when, d.priority, d.vars, d.group])) { Object.assign(cur, { label: d.label, when: d.when, priority: d.priority, vars: d.vars, group: d.group }); dirty = true; }
  }
  const keys = new Set(DEFAULT_TEMPLATES.map((d) => d.key));
  const before = s.templates.length; s.templates = s.templates.filter((x) => keys.has(x.key)); if (s.templates.length !== before) dirty = true;
  s.templates.sort((x, y) => DEFAULT_TEMPLATES.findIndex((d) => d.key === x.key) - DEFAULT_TEMPLATES.findIndex((d) => d.key === y.key));
  if (dirty) db.save();
  return s.templates;
}
const storeName = () => ((db.get().settings || {}).storeName || 'آرموا');
function render(text, vars = {}) {
  const val = (k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k]));
  return String(text || '').split('\n')
    .filter((line) => { const ks = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]); return !ks.length || ks.every((k) => val(k) !== ''); }) // drop lines whose variables are empty
    .map((line) => line.replace(/\{(\w+)\}/g, (_, k) => val(k)).trimEnd()).join('\n').trim();
}

// ---------- log ----------
function log(entry) {
  const s = db.get(), e = { id: db.nextId(), at: Date.now(), ...entry };
  s.smsLog.push(e); if (s.smsLog.length > 3000) s.smsLog.splice(0, s.smsLog.length - 3000);
  db.save(); return e;
}

// ---------- Kavenegar ----------
async function kavenegar(endpoint, params) {
  const c = config();
  const r = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(c.apiKey)}/${endpoint}.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params), signal: AbortSignal.timeout(12000),
  });
  const j = await r.json().catch(() => ({}));
  const st = j.return && j.return.status;
  if (st !== 200) throw new Error(`kavenegar ${st || r.status}: ${(j.return && j.return.message) || 'error'}`);
  return j.entries && (Array.isArray(j.entries) ? j.entries[0] : j.entries);
}

// Send a plain SMS. meta: { type, customerId, campaignId, by }
async function send(to, text, meta = {}) {
  const phone = normPhone(to);
  if (!phone) return log({ to: String(to || ''), text, status: 'failed', error: 'invalid_phone', ...meta });
  const c = config();
  if (!c.apiKey || !c.enabled) {
    console.log(`[SMS dev → ${phone}] ${text.replace(/\n/g, ' | ')}`);
    return log({ to: phone, text, status: 'dev', ...meta });
  }
  try {
    const p = { receptor: phone, message: text }; if (c.sender) p.sender = c.sender;
    const e = await kavenegar('sms/send', p);
    return log({ to: phone, text, status: 'sent', providerId: e && e.messageid, ...meta });
  } catch (err) { return log({ to: phone, text, status: 'failed', error: String(err.message || err).slice(0, 200), ...meta }); }
}

// Send a template-based message (checks the template is enabled).
async function sendTemplate(key, to, vars = {}, meta = {}) {
  const t = templates().find((x) => x.key === key);
  if (!t || !t.enabled) return null;
  return send(to, render(t.text, { store: storeName(), ...vars }), { type: key, ...meta });
}

// OTP: uses Kavenegar's verify/lookup (template defined in their panel) when configured, otherwise a plain SMS.
async function sendOtp(phone, code, meta = {}) {
  const c = config();
  if (c.apiKey && c.enabled && c.otpTemplate) {
    try {
      await kavenegar('verify/lookup', { receptor: phone, token: code, template: c.otpTemplate });
      return log({ to: phone, text: '[OTP]', status: 'sent', type: 'otp', ...meta });
    } catch (err) { return log({ to: phone, text: '[OTP]', status: 'failed', error: String(err.message || err).slice(0, 200), type: 'otp', ...meta }); }
  }
  const e = await sendTemplate('otp', phone, { code }, meta);
  if (e && e.status === 'dev') console.log(`[OTP dev] ${phone} → ${code}`);
  return e || send(phone, `${code}`, { type: 'otp', ...meta });
}

// ---------- OTP codes (in memory) ----------
const otps = new Map();
const hashCode = (phone, code) => crypto.createHmac('sha256', A.sign('otp')).update(phone + ':' + code).digest('hex');
async function requestOtp(phone, purpose) {
  const now = Date.now(), k = purpose + ':' + phone, o = otps.get(k) || { sent: [] };
  o.sent = o.sent.filter((t) => now - t < 3600e3);
  if (o.last && now - o.last < 60e3) return { error: 'wait', retryIn: Math.ceil((60e3 - (now - o.last)) / 1000) };
  if (o.sent.length >= 5) return { error: 'too_many' };
  const code = String(crypto.randomInt(100000, 1000000));
  Object.assign(o, { hash: hashCode(phone, code), exp: now + 120e3, tries: 0, last: now }); o.sent.push(now); otps.set(k, o);
  const e = await sendOtp(phone, code);
  if (e && e.status === 'failed') { otps.delete(k); return { error: 'sms_failed' }; }
  const dev = !!(e && e.status === 'dev');
  return { ok: true, dev, expiresIn: 120, ...(dev ? { devCode: code } : {}) };
}
function verifyOtp(phone, purpose, code) {
  const k = purpose + ':' + phone, o = otps.get(k);
  if (!o || o.exp < Date.now()) return false;
  if (++o.tries > 5) { otps.delete(k); return false; }
  const ok = A.safeEq(hashCode(phone, String(code || '').replace(/[۰-۹٠-٩]/g, (c) => DIGITS[c]).trim()), o.hash);
  if (ok) otps.delete(k);
  return ok;
}

// Dev mode only (no API key): the code may be shown on screen, but only to requests coming from this machine.
const isLocal = (req) => ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(req.ip) && !req.headers['x-forwarded-for'];
const exposeDev = (req, r) => { if (r && r.devCode && !isLocal(req)) { const { devCode, ...rest } = r; return rest; } return r; };

// ---------- customers ----------
function findCustomer(phone) { return db.get().customers.find((c) => c.phone === phone); }
function upsertCustomer(phone, patch = {}, { verified = false } = {}) {
  const s = db.get(); let c = findCustomer(phone), created = false;
  if (!c) { c = { id: db.nextId(), phone, name: '', address: '', tags: [], notes: '', marketingOptIn: false, verified: false, createdAt: Date.now(), lastLoginAt: 0 }; s.customers.push(c); created = true; }
  for (const [k, v] of Object.entries(patch)) if (v !== undefined && v !== '' && v !== null) c[k] = v;
  if (verified) c.verified = true;
  db.save(); return { customer: c, created };
}
function ordersOf(c) { return db.get().orders.filter((o) => o.customerId === c.id || normPhone(o.customer && o.customer.phone) === c.phone); }
function statsOf(c) {
  const os = ordersOf(c), live = os.filter((o) => o.status !== 'cancelled' && o.status !== 'returned');
  return { orders: os.length, spent: live.reduce((a, o) => a + (o.total || 0), 0), lastOrderAt: os.reduce((a, o) => Math.max(a, o.createdAt), 0) };
}
// Create customers for orders placed before the CRM existed.
function syncCustomersFromOrders() {
  let n = 0;
  for (const o of db.get().orders) {
    const phone = normPhone(o.customer && o.customer.phone); if (!phone) continue;
    const { customer, created } = upsertCustomer(phone, { name: o.customer.name, address: o.customer.address });
    if (!o.customerId) o.customerId = customer.id;
    if (created) n++;
  }
  if (n) db.save();
  return n;
}

module.exports = { exposeDev, normPhone, config, configured, templates, render, storeName, log, send, sendTemplate, sendOtp, requestOtp, verifyOtp, findCustomer, upsertCustomer, ordersOf, statsOf, syncCustomersFromOrders, DEFAULT_TEMPLATES };
