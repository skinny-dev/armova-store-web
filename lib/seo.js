// SEO / GEO / AEO for the storefront (a client-rendered SPA): every crawler-facing page gets its own <title>, description, canonical, Open Graph,
// JSON-LD (Organization, WebSite, Product + Offer, BreadcrumbList, CollectionPage, FAQPage) and a plain-HTML copy of the content inside <main>,
// so crawlers and AI engines that do not run JavaScript still read real text. Also robots.txt, sitemap.xml, llms.txt and the FAQ (/api/faq).
// Rules followed: title <= 60 chars, description 120-160 chars with a call to action, one H1, self-referencing canonical, noindex on private pages.
const fs = require('fs');
const path = require('path');
const db = require('./db');
const pricing = require('./pricing');
const orders = require('./orders');
const digipay = require('./digipay');

const INDEX = path.join(__dirname, '..', 'public', 'index.html');
const BRAND = { fa: 'آرموا', en: 'Armova' };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fa = (n) => Number(n || 0).toLocaleString('fa-IR');
const clip = (s, max) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= max ? s : s.slice(0, max - 1).replace(/[\s،,؛;:-]+\S*$/, '').trim() + '…'; };
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const L = (v) => (v && (v.fa || v.en)) || '';

// ---- public address ----
function origin(req) {
  const conf = orders.baseUrl();
  if (conf && !/example|localhost/i.test(conf)) return conf; // the stable, configured address (Settings -> Public site address)
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  const local = /^(localhost|127\.|\[::1\])/.test(host), fwd = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return `${fwd || (local ? req.protocol : 'https')}://${host}`;
}

// ---- data helpers ----
const cats = () => [...db.get().categories].sort((a, b) => a.order - b.order);
const catById = (id) => db.get().categories.find((c) => c.id === id);
const catPath = (id) => { const out = []; for (let c = catById(id), n = 0; c && n < 6; c = catById(c.parentId), n++) out.unshift(c); return out; };
const live = () => db.get().products.filter((p) => p.active).sort((a, b) => b.createdAt - a.createdAt);
const inStock = (p) => !p.sizes.length || p.sizes.some((z) => z.stock > 0);
const img = (base, p, w = 720) => (p.images[0] ? `${base}/uploads/t/${encodeURIComponent(p.images[0].file)}?w=${w}` : '');

// ---- texts (Persian is the primary language of the shop; the client switches title/description when the visitor picks English) ----
const HOME_TITLE = 'آرمووا | پوشاک زنانه و مردانه'; // home page title (set by the owner)
function homeDesc() {
  const names = cats().filter((c) => !c.parentId).map((c) => L(c.name)).slice(0, 6).join('، ');
  return clip(`آرموا؛ پوشاک زنانه و مردانه با طراحی ساده، جنس باکیفیت و دوخت دقیق. ${names ? names + ' را ببینید و ' : ''}همین حالا آنلاین سفارش دهید.`, 160);
}
function productDesc(p) {
  const c = catById(p.categoryId), color = p.color ? L(p.color) : '';
  const own = clip(L(p.description), 90);
  let d = own ? own + ' ' : `${L(p.name)} از برند آرموا${c ? '، ' + L(c.name) : ''}${color ? '، رنگ ' + color : ''}. `;
  d += `قیمت ${fa(pricing.unit(p))} تومان. سایزها و موجودی را ببینید و آنلاین سفارش دهید.`;
  return clip(d, 160);
}
const productTitle = (p) => {
  const c = catById(p.categoryId), n = L(p.name), t = `${n} | ${c ? L(c.name) + ' | ' : ''}${BRAND.fa}`;
  return t.length <= 60 ? t : clip(`${n} | ${BRAND.fa}`, 60);
};
const catTitle = (c) => clip(`${L(c.name)} | خرید آنلاین از ${BRAND.fa}`, 60);
const catDesc = (c, n) => clip(`خرید آنلاین ${L(c.name)} از آرموا: ${n} محصول با طراحی ساده و جنس باکیفیت. سایزها و قیمت‌ها را ببینید و همین حالا سفارش دهید.`, 160);

// FAQ: only facts the shop really supports (visible on /about and published as FAQPage)
const FAQ = [
  { q: { fa: 'آرموا چه برندی است؟', en: 'What is Armova?' }, a: { fa: 'آرموا برند پوشاک خیابانی است؛ طراحی ساده، جنس باکیفیت و دوخت دقیق. هر مجموعه در تعداد محدود تولید می‌شود.', en: 'Armova is a streetwear label: simple design, quality fabrics and precise construction. Every collection is made in limited runs.' } },
  { q: { fa: 'چطور از آرموا خرید کنم؟', en: 'How do I order from Armova?' }, a: { fa: 'محصول و سایز را انتخاب کنید، به سبد خرید اضافه کنید، نام، شماره موبایل و آدرس را وارد کنید و پرداخت را انجام دهید.', en: 'Choose a product and size, add it to the cart, enter your name, mobile number and address, then pay.' } },
  { q: { fa: 'پرداخت چگونه انجام می‌شود؟', en: 'How does payment work?' }, a: { fa: 'پرداخت به‌صورت آنلاین و از طریق درگاه امن زیبال انجام می‌شود و سفارش پس از تایید پرداخت ثبت‌شده «پرداخت‌شده» می‌شود.', en: 'You pay online through the secure Zibal gateway; the order is marked as paid once the payment is confirmed.' } },
  { q: { fa: 'چطور سفارشم را پیگیری کنم؟', en: 'How do I track my order?' }, a: { fa: 'با ورود به حساب کاربری (کد پیامکی) در بخش «سفارش‌های من» وضعیت سفارش را ببینید؛ تغییر وضعیت سفارش از طریق پیامک هم اطلاع داده می‌شود.', en: 'Log in with an SMS code and open "My orders"; status changes are also sent to you by SMS.' } },
  { q: { fa: 'موجودی هر سایز مشخص است؟', en: 'Can I see stock for each size?' }, a: { fa: 'بله، سایزهای ناموجود در صفحه محصول خط‌خورده نشان داده می‌شوند و می‌توانید برای اطلاع از موجود شدن آن ثبت‌نام کنید.', en: 'Yes. Sold-out sizes are struck through on the product page, and you can ask to be notified when a size is back.' } },
];

const faq = () => (digipay.enabled() ? [...FAQ, { q: { fa: 'آیا خرید اقساطی دارید؟', en: 'Do you offer installments?' }, a: { fa: 'بله، با دیجی‌پی می‌توانید خرید را اقساطی پرداخت کنید. در تسویه حساب «خرید اقساطی با دیجی‌پی» را انتخاب کنید؛ شرایط، سقف اعتبار و کارمزد در صفحه پرداخت دیجی‌پی نمایش داده می‌شود.', en: 'Yes. You can pay in installments with Digipay: choose "Pay in installments with Digipay" at checkout. Terms, credit limit and fees are shown on the Digipay payment page.' } }] : FAQ);

// ---- structured data ----
const crumbs = (base, items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: base + url })) });
const org = (base) => ({ '@type': 'Organization', '@id': base + '/#org', name: BRAND.fa, alternateName: BRAND.en, url: base + '/', logo: { '@type': 'ImageObject', url: base + '/img/brand/icon-512.png', width: 512, height: 512 }, description: 'آرموا برند پوشاک خیابانی با طراحی ساده، جنس باکیفیت و دوخت دقیق.' });
const site = (base) => ({ '@type': 'WebSite', '@id': base + '/#site', url: base + '/', name: BRAND.fa, alternateName: BRAND.en, inLanguage: ['fa-IR', 'en'], publisher: { '@id': base + '/#org' }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: base + '/search?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } });
function productLd(base, p) {
  const c = catById(p.categoryId), url = `${base}/product/${encodeURIComponent(p.slug)}`;
  return { '@type': 'Product', '@id': url + '#product', name: L(p.name), url, description: productDesc(p), sku: p.sku || undefined, color: p.color ? L(p.color) : undefined, category: c ? catPath(c.id).map((x) => L(x.name)).join(' > ') : undefined,
    image: p.images.map((i) => `${base}/uploads/${encodeURIComponent(i.file)}`), brand: { '@type': 'Brand', name: BRAND.fa },
    offers: { '@type': 'Offer', url, priceCurrency: 'IRR', price: String(Math.round(pricing.unit(p) * 10)), itemCondition: 'https://schema.org/NewCondition', availability: inStock(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@id': base + '/#org' } } };
}

// ---- page model ----
function pageFor(req) {
  const base = origin(req), p = decodeURIComponent(req.path).replace(/\/+$/, '') || '/', q = req.query || {};
  let m;
  const page = { status: 200, index: true, url: p, title: HOME_TITLE, desc: homeDesc(), image: '', type: 'website', ld: [], body: '' };
  const prods = live(), link = (x) => `<li><a href="/product/${encodeURIComponent(x.slug)}">${esc(L(x.name))}</a> — ${fa(pricing.unit(x))} تومان</li>`;
  if (p === '/' || (m = p.match(/^\/category\/([^/]+)$/))) {
    const c = m ? cats().find((x) => x.slug === m[1]) : null;
    if (m && !c) return { ...page, status: 404, index: false, title: 'صفحه پیدا نشد | آرموا', desc: 'این صفحه پیدا نشد. محصولات آرموا را ببینید.', body: '<h1>صفحه پیدا نشد</h1><p><a href="/">بازگشت به فروشگاه</a></p>' };
    const ids = c ? new Set(pricing.descendants(c.id)) : null, list = c ? prods.filter((x) => ids.has(x.categoryId)) : prods;
    page.url = c ? `/category/${encodeURIComponent(c.slug)}` : '/';
    if (c) { page.title = catTitle(c); page.desc = catDesc(c, fa(list.length)); }
    page.image = list[0] ? img(base, list[0]) : '';
    const kids = cats().filter((x) => (c ? x.parentId === c.id : !x.parentId));
    page.body = `<h1>${esc(c ? L(c.name) : 'آرموا — فروشگاه آنلاین پوشاک خیابانی')}</h1><p>${esc(page.desc)}</p>${kids.length ? `<nav>${kids.map((k) => `<a href="/category/${encodeURIComponent(k.slug)}">${esc(L(k.name))}</a>`).join(' · ')}</nav>` : ''}<ul>${list.slice(0, 80).map(link).join('')}</ul>`;
    page.ld = [org(base), site(base), { '@type': 'CollectionPage', '@id': base + page.url + '#list', url: base + page.url, name: c ? L(c.name) : BRAND.fa, description: page.desc, inLanguage: 'fa-IR', mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.slice(0, 50).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/product/${encodeURIComponent(x.slug)}`, name: L(x.name) })) } },
      crumbs(base, [['آرموا', '/'], ...(c ? catPath(c.id).map((x) => [L(x.name), `/category/${encodeURIComponent(x.slug)}`]) : [])])];
  } else if ((m = p.match(/^\/product\/(.+)$/))) {
    const x = prods.find((y) => y.slug === m[1]);
    if (!x) return { ...page, status: 404, index: false, title: 'محصول پیدا نشد | آرموا', desc: 'این محصول پیدا نشد. سایر محصولات آرموا را ببینید.', body: '<h1>محصول پیدا نشد</h1><p><a href="/">بازگشت به فروشگاه</a></p>' };
    const c = catById(x.categoryId);
    Object.assign(page, { url: `/product/${encodeURIComponent(x.slug)}`, title: productTitle(x), desc: productDesc(x), image: img(base, x), type: 'product' });
    page.body = `<h1>${esc(L(x.name))}</h1>${x.images.slice(0, 4).map((i) => `<img src="/uploads/t/${encodeURIComponent(i.file)}?w=480" alt="${esc(L(x.name))}" width="480" height="600" loading="lazy">`).join('')}<p>${esc(page.desc)}</p><p>قیمت: ${fa(pricing.unit(x))} تومان — ${inStock(x) ? 'موجود' : 'ناموجود'}</p>${x.sizes.length ? `<p>سایزها: ${x.sizes.map((z) => esc(z.name) + (z.stock > 0 ? '' : ' (ناموجود)')).join('، ')}</p>` : ''}${x.properties.length ? `<ul>${x.properties.map((r) => `<li>${esc(L(r.label))}: ${esc(L(r.value))}</li>`).join('')}</ul>` : ''}${c ? `<p><a href="/category/${encodeURIComponent(c.slug)}">${esc(L(c.name))}</a></p>` : ''}`;
    page.ld = [org(base), productLd(base, x), crumbs(base, [['آرموا', '/'], ...(c ? catPath(c.id).map((k) => [L(k.name), `/category/${encodeURIComponent(k.slug)}`]) : []), [L(x.name), page.url]])];
  } else if (p === '/about') {
    Object.assign(page, { url: '/about', title: 'درباره آرموا | برند پوشاک خیابانی', desc: 'با آرموا آشنا شوید: برند پوشاک خیابانی با طراحی ساده، جنس باکیفیت و دوخت دقیق. پرسش‌های متداول خرید و پرداخت را بخوانید.' });
    page.body = `<h1>درباره آرموا</h1><p>${esc(L(FAQ[0].a))}</p><h2>پرسش‌های متداول</h2>${faq().map((f) => `<h3>${esc(f.q.fa)}</h3><p>${esc(f.a.fa)}</p>`).join('')}`;
    page.ld = [org(base), site(base), { '@type': 'FAQPage', mainEntity: faq().map((f) => ({ '@type': 'Question', name: f.q.fa, acceptedAnswer: { '@type': 'Answer', text: f.a.fa } })) }, crumbs(base, [['آرموا', '/'], ['درباره ما', '/about']])];
  } else if (p === '/contact') {
    Object.assign(page, { url: '/contact', title: 'تماس با آرموا | پیگیری سفارش و پشتیبانی', desc: 'برای پیگیری سفارش و پشتیبانی با آرموا در ارتباط باشید. وضعیت سفارش از بخش «سفارش‌های من» هم قابل مشاهده است.' });
    page.body = `<h1>تماس با آرموا</h1><p>برای پیگیری سفارش و پشتیبانی با ما در ارتباط باشید.</p>`;
    page.ld = [org(base), crumbs(base, [['آرموا', '/'], ['تماس با ما', '/contact']])];
  } else if (p === '/search') {
    Object.assign(page, { url: '/search', index: false, title: 'جستجو | آرموا', desc: 'جستجوی محصول، دسته و رنگ در آرموا.', body: '<h1>جستجو</h1>' });
  } else if (p === '/account') {
    Object.assign(page, { url: '/account', index: false, title: 'حساب من | آرموا', desc: 'حساب کاربری و سفارش‌های شما در آرموا.', body: '' });
  } else {
    return { ...page, status: 404, index: false, title: 'صفحه پیدا نشد | آرموا', desc: 'این صفحه پیدا نشد. محصولات آرموا را ببینید.', body: '<h1>صفحه پیدا نشد</h1><p><a href="/">بازگشت به فروشگاه</a></p>' };
  }
  if (q.cat && p === '/') page.redirect = `/category/${encodeURIComponent(String(q.cat))}`; // old ?cat= links
  page.base = base; return page;
}

// ---- HTML ----
let shell = '';
function render(req) {
  if (!shell || process.env.NODE_ENV !== 'production') shell = fs.readFileSync(INDEX, 'utf8');
  const pg = pageFor(req), base = origin(req), canon = base + (pg.url === '/' ? '/' : pg.url);
  if (!pg.image && pg.index) pg.image = base + '/img/brand/og-default.png'; // pages without a product photo share the brand image
  const head = [
    `<meta name="description" content="${esc(pg.desc)}">`,
    `<meta name="robots" content="${pg.index ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'}">`,
    pg.index ? `<link rel="canonical" href="${esc(canon)}">` : '',
    `<meta property="og:site_name" content="آرموا"><meta property="og:locale" content="fa_IR"><meta property="og:type" content="${pg.type}">`,
    `<meta property="og:title" content="${esc(pg.title)}"><meta property="og:description" content="${esc(pg.desc)}"><meta property="og:url" content="${esc(canon)}">`,
    pg.image ? `<meta property="og:image" content="${esc(pg.image)}"><meta name="twitter:image" content="${esc(pg.image)}">` : '',
    `<meta name="twitter:card" content="${pg.image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(pg.title)}"><meta name="twitter:description" content="${esc(pg.desc)}">`,
    pg.ld.length ? `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': pg.ld })}</script>` : '',
  ].filter(Boolean).join('\n  ');
  const html = shell.replace(/<title>[^<]*<\/title>/, `<title>${esc(pg.title)}</title>\n  ${head}`)
    .replace('<main id="app"></main>', `<main id="app">${pg.body ? `<section class="static seo-static">${pg.body}</section>` : ''}</main>`);
  return { html, status: pg.status, redirect: pg.redirect };
}

// ---- robots / sitemap / llms ----
const robots = (req) => `# Armova — all crawlers, including AI search and answer engines, are welcome on the public catalog.
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /account
Disallow: /pay/

User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: ${origin(req)}/sitemap.xml
`;
function sitemap(req) {
  const base = origin(req), u = (loc, extra = '') => `<url><loc>${esc(base + loc)}</loc>${extra}</url>`;
  const urls = [u('/'), ...cats().map((c) => u(`/category/${encodeURIComponent(c.slug)}`)), u('/about'), u('/contact'),
    ...live().map((p) => u(`/product/${encodeURIComponent(p.slug)}`, p.images.slice(0, 5).map((i) => `<image:image><image:loc>${esc(base + '/uploads/' + encodeURIComponent(i.file))}</image:loc><image:title>${esc(L(p.name))}</image:title></image:image>`).join('')))];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
}
function llms(req) {
  const base = origin(req), c0 = cats().filter((c) => !c.parentId);
  return `# آرموا (Armova)

> ${homeDesc()}

آرموا یک فروشگاه آنلاین پوشاک خیابانی است. محتوا به فارسی است و برای هر محصول نام، رنگ، دسته، قیمت (تومان)، سایزها و موجودی در صفحه محصول آمده است. پرداخت آنلاین از طریق زیبال انجام می‌شود.${digipay.enabled() ? ' خرید اقساطی با دیجی‌پی هم فعال است.' : ''}

## صفحات اصلی
- [فروشگاه](${base}/): همه محصولات
- [درباره آرموا و پرسش‌های متداول](${base}/about)
- [تماس با ما](${base}/contact)

## دسته‌ها
${c0.map((c) => `- [${L(c.name)}](${base}/category/${encodeURIComponent(c.slug)})`).join('\n')}

## محصولات
${live().map((p) => `- [${L(p.name)}](${base}/product/${encodeURIComponent(p.slug)}): ${fa(pricing.unit(p))} تومان${inStock(p) ? '' : ' — ناموجود'}`).join('\n')}

## نقشه سایت
- ${base}/sitemap.xml
`;
}

module.exports = { render, robots, sitemap, llms, FAQ, faq, pageFor, productTitle, productDesc, catTitle, HOME_TITLE, homeDesc };
