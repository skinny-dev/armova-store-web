(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  let lang = ls.get('lang', 'fa'); if (!I18N[lang]) lang = 'fa';
  let data = { categories: [], products: [] };
  let cart = ls.get('cart', []);
  let ui = { kind: 'product', cols: 4, sort: 'newest' };
  const t = (k) => I18N[lang][k] ?? k;
  const L = (o) => (o && (o[lang] || o.fa || o.en)) || '';
  const nf = () => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
  const num = (n) => nf().format(n);
  const money = (n) => `${num(n)} ${t('currency')}`;
  const img = (p, kind) => { const im = p.images.find((i) => i.kind === kind) || p.images[0]; return im ? '/uploads/' + encodeURIComponent(im.file) : ''; };
  const track = (type, productId) => fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, productId }) }).catch(() => {});
  const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); };

  // ---------- chrome ----------
  function chrome() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.title = t('brand');
    $('#logo').textContent = t('brand');
    $('#nav').innerHTML = `<a href="/" data-link>${t('shop')}</a><a href="/about" data-link>${t('about')}</a><a href="/contact" data-link>${t('contact')}</a>`;
    $('#lang').textContent = t('langBtn');
    const n = cart.reduce((a, i) => a + i.qty, 0);
    $('#cartBtn').textContent = `${t('cart')} (${num(n)})`;
    $('#foot').innerHTML = `<span>© ${num(new Date().getFullYear())} ${t('brand')}. ${t('rights')}</span><span>${t('brand')}</span>`;
  }
  $('#lang').onclick = () => { lang = lang === 'fa' ? 'en' : 'fa'; ls.set('lang', lang); chrome(); route(); if (drawerOpen) openCart(); };

  // ---------- router ----------
  function go(url) { history.pushState({}, '', url); route(); window.scrollTo(0, 0); }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); closeDrawer(); go(a.getAttribute('href')); }
  });
  addEventListener('popstate', route);

  function route() {
    const path = decodeURIComponent(location.pathname), q = new URLSearchParams(location.search);
    let m;
    if (path === '/' || path === '') shopPage(q.get('cat'));
    else if ((m = path.match(/^\/product\/(.+)$/))) productPage(m[1]);
    else if (path === '/about') staticPage(t('about'), t('aboutText'));
    else if (path === '/contact') staticPage(t('contact'), t('contactText'));
    else staticPage('404', t('notFound'));
  }
  const staticPage = (h, body) => { $('#app').innerHTML = `<section class="static"><h1 class="display">${esc(h)}</h1><p>${esc(body)}</p></section>`; };

  // ---------- shop ----------
  function shopPage(catSlug) {
    const cat = data.categories.find((c) => c.slug === catSlug);
    let list = data.products.filter((p) => !cat || p.categoryId === cat.id);
    if (ui.sort === 'priceAsc') list.sort((a, b) => a.price - b.price); else if (ui.sort === 'priceDesc') list.sort((a, b) => b.price - a.price);
    const tabs = [{ slug: '', name: t('all') }, ...data.categories.map((c) => ({ slug: c.slug, name: L(c.name) }))]
      .map((c) => `<a class="tab ${(c.slug || null) === (cat ? cat.slug : null) ? 'on' : ''}" data-link href="${c.slug ? '/?cat=' + encodeURIComponent(c.slug) : '/'}">${esc(c.name)}</a>`).join('');
    const cards = list.map((p) => {
      const out = p.sizes.length && p.sizes.every((s) => s.stock === 0);
      const main = img(p, ui.kind), alt2 = p.images.map((i) => '/uploads/' + encodeURIComponent(i.file)).find((u) => u !== main);
      return `<a class="card" data-link href="/product/${encodeURIComponent(p.slug)}"><img loading="lazy" src="${main}" alt="${esc(L(p.name))}">${alt2 ? `<img class="alt" loading="lazy" src="${alt2}" alt="">` : ''}
        ${out ? `<span class="badge">${t('soldOut')}</span>` : ''}<div class="meta"><span>${esc(L(p.name))}</span><span>${money(p.price)}</span></div></a>`;
    }).join('');
    const gb = (c, rows) => `<button class="gridbtn ${ui.cols === c ? 'on' : ''}" data-cols="${c}" aria-label="${c}"><i style="grid-template-columns:repeat(${rows},1fr)">${'<b></b>'.repeat(rows * rows)}</i></button>`;
    $('#app').innerHTML = `
      <h1 class="page-title display">${esc(cat ? L(cat.name) : t('allProducts'))}</h1>
      <div class="tabs">${tabs}</div>
      <div class="bar">
        <select id="sort">${['newest', 'priceAsc', 'priceDesc'].map((k) => `<option value="${k}" ${ui.sort === k ? 'selected' : ''}>${t(k)}</option>`).join('')}</select>
        <span class="count">${num(list.length)} ${t('products')}</span>
        <span class="seg">${gb(8, 3)}${gb(4, 2)}
          <button data-kind="product" class="${ui.kind === 'product' ? 'on' : ''}">${t('product')}</button><button data-kind="model" class="${ui.kind === 'model' ? 'on' : ''}">${t('model')}</button></span>
      </div>
      ${list.length ? `<div class="grid ${ui.cols >= 8 ? 'dense' : ''}" style="--cols:${ui.cols}">${cards}</div>` : `<p class="empty">${t('noProducts')}</p>`}`;
    $('#sort').onchange = (e) => { ui.sort = e.target.value; shopPage(catSlug); };
    document.querySelectorAll('[data-cols]').forEach((b) => (b.onclick = () => { ui.cols = +b.dataset.cols; shopPage(catSlug); }));
    document.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => { ui.kind = b.dataset.kind; shopPage(catSlug); }));
  }

  // ---------- product ----------
  let pick = null;
  function productPage(slug) {
    const p = data.products.find((x) => x.slug === slug);
    if (!p) return staticPage('404', t('notFound'));
    pick = null; track('product', p.id);
    const cat = data.categories.find((c) => c.id === p.categoryId);
    document.title = `${L(p.name)} | ${t('brand')}`;
    const acc = (title, body) => body ? `<details><summary>${title}</summary><div class="body">${esc(body)}</div></details>` : '';
    $('#app').innerHTML = `<div class="pdp">
      <div class="gallery">${p.images.map((i) => `<img src="/uploads/${encodeURIComponent(i.file)}" alt="${esc(L(p.name))}">`).join('')}</div>
      <div class="info">
        <div class="crumbs"><a data-link href="/">${t('shopCrumb')}</a> › ${cat ? `<a data-link href="/?cat=${encodeURIComponent(cat.slug)}">${esc(L(cat.name))}</a>` : ''}</div>
        <h1 class="display">${esc(L(p.name))}</h1>
        <div class="buy"><button class="sizebtn" id="sizeBtn"><span id="sizeLbl">${t('selectSize')}</span><span>⌄</span></button>
          <button class="addbtn" id="addBtn"><span>${t('addToCart')}</span><span>${p.comparePrice ? `<s class="price-old">${num(p.comparePrice)}</s>` : ''}${money(p.price)}</span></button></div>
        <p class="desc">${esc(L(p.description))}</p>
        <div class="acc">${acc(t('specs'), L(p.details))}</div>
      </div></div>`;
    $('#sizeBtn').onclick = () => sizeDrawer(p);
    $('#addBtn').onclick = () => {
      if (!pick) return sizeDrawer(p);
      addToCart(p, pick); openCart();
    };
  }
  function sizeDrawer(p) {
    drawer(`<div class="dh"><b>${t('selectSize')}</b><button data-close>✕</button></div><div class="db">${p.sizes.map((s) => {
      const out = s.stock <= 0;
      return `<button class="row" data-size="${esc(s.name)}" ${out ? 'disabled' : ''}><span class="n">${esc(s.name)}</span><span>${out ? t('soldOut') : s.stock <= 3 ? t('fewLeft') : ''}</span></button>`;
    }).join('')}</div>`);
    document.querySelectorAll('[data-size]').forEach((b) => (b.onclick = () => { pick = b.dataset.size; $('#sizeLbl').textContent = `${t('size')}: ${pick}`; closeDrawer(); }));
  }

  // ---------- cart ----------
  const saveCart = () => { ls.set('cart', cart); chrome(); };
  function addToCart(p, size) {
    const s = p.sizes.find((z) => z.name === size); if (!s) return;
    const line = cart.find((i) => i.productId === p.id && i.size === size);
    if (line) line.qty = Math.min(s.stock, line.qty + 1); else cart.push({ productId: p.id, size, qty: 1 });
    saveCart(); track('cart');
  }
  const cartLines = () => cart.map((i) => { const p = data.products.find((x) => x.id === i.productId); const s = p && p.sizes.find((z) => z.name === i.size); return p && s ? { ...i, p, max: s.stock } : null; }).filter(Boolean);
  function openCart() {
    cart = cartLines().map(({ productId, size, qty, max }) => ({ productId, size, qty: Math.min(qty, max) })).filter((i) => i.qty > 0); saveCart();
    const lines = cartLines(), total = lines.reduce((a, l) => a + l.p.price * l.qty, 0), count = lines.reduce((a, l) => a + l.qty, 0);
    drawer(`<div class="dh"><b>${t('cart')}</b><button data-close>✕</button></div>
      <div class="db">${lines.length ? lines.map((l, i) => `<div class="line"><img src="${img(l.p, 'product')}" alt="">
        <div class="lc"><div class="top2"><span>${esc(L(l.p.name))}</span><span>${money(l.p.price)}</span></div><span>${t('size')}: ${esc(l.size)}</span>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto"><div class="qty"><button data-q="${i}:-1">−</button><span>${num(l.qty)}</span><button data-q="${i}:1">+</button></div>
        <button class="link" data-rm="${i}">${t('remove')}</button></div></div></div>`).join('') : `<p class="empty">${t('emptyCart')}</p>`}</div>
      ${lines.length ? `<div class="df"><div style="display:flex;justify-content:space-between"><b>${t('subtotal')} (${num(count)} ${t('items')})</b><b>${money(total)}</b></div><button class="btn" id="goCheckout">${t('checkout')}</button></div>` : ''}`);
    const lines2 = cartLines();
    document.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { const [i, d] = b.dataset.q.split(':').map(Number); const l = lines2[i]; const it = cart.find((c) => c.productId === l.productId && c.size === l.size); it.qty = Math.max(1, Math.min(l.max, it.qty + d)); saveCart(); openCart(); }));
    document.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const l = lines2[+b.dataset.rm]; cart = cart.filter((c) => !(c.productId === l.productId && c.size === l.size)); saveCart(); openCart(); }));
    const g = $('#goCheckout'); if (g) g.onclick = checkoutForm;
  }
  $('#cartBtn').onclick = openCart;
  function checkoutForm() {
    drawer(`<div class="dh"><b>${t('checkout')}</b><button data-close>✕</button></div><form class="form db" id="co">
      <label>${t('name')}<input name="name" required maxlength="100" autocomplete="name"></label>
      <label>${t('phone')}<input name="phone" required inputmode="tel" dir="ltr" autocomplete="tel"></label>
      <label>${t('address')}<textarea name="address" rows="3" required maxlength="500" autocomplete="street-address"></textarea></label>
      <label>${t('note')}<textarea name="note" rows="2" maxlength="500"></textarea></label>
      <div class="err" id="coErr"></div><button class="btn" type="submit">${t('placeOrder')}</button><button class="btn ghost" type="button" id="coBack">${t('back')}</button></form>`);
    $('#coBack').onclick = openCart;
    $('#co').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, btn = f.querySelector('[type=submit]'); btn.disabled = true;
      try {
        const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: f.name.value, phone: f.phone.value, address: f.address.value, note: f.note.value, items: cart }) });
        const j = await r.json();
        if (!r.ok) { $('#coErr').textContent = r.status === 409 ? t('errStock') : r.status === 400 ? t('errInvalid') : t('errGeneric'); if (r.status === 409) await load(); btn.disabled = false; return; }
        cart = []; saveCart(); await load();
        drawer(`<div class="dh"><b>${t('cart')}</b><button data-close>✕</button></div><div class="done"><h2 class="display">${t('orderDone')}</h2><p>${t('orderNum')}: <b>${num(j.orderId)}</b></p><p>${t('orderMsg')}</p><button class="btn" data-close>${t('continue')}</button></div>`);
      } catch { $('#coErr').textContent = t('errGeneric'); btn.disabled = false; }
    };
  }

  // ---------- drawer ----------
  let drawerOpen = false;
  function drawer(html) { const d = $('#drawer'); d.innerHTML = html; d.classList.add('on'); $('#overlay').classList.add('on'); d.setAttribute('aria-hidden', 'false'); drawerOpen = true; }
  function closeDrawer() { $('#drawer').classList.remove('on'); $('#overlay').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); drawerOpen = false; }
  $('#overlay').onclick = closeDrawer;
  $('#drawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
  addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawer());

  // ---------- boot ----------
  async function load() {
    try { data = await (await fetch('/api/store')).json(); } catch { toast(t('errGeneric')); }
  }
  (async () => { chrome(); await load(); route(); track('view'); })();
})();
