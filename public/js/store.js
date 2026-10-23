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
  const unit = (p) => (p.sale ? p.sale.price : p.price);
  const kids = (id) => data.categories.filter((c) => (c.parentId || null) === id).sort((a, b) => a.order - b.order);
  const descIds = (id) => { const s = new Set([id]); const w = (x) => kids(x).forEach((c) => { s.add(c.id); w(c.id); }); w(id); return s; };
  const catPath = (id) => { const out = []; let c = data.categories.find((x) => x.id === id), g = 0; while (c && g++ < 6) { out.unshift(c); c = data.categories.find((x) => x.id === c.parentId); } return out; };
  const img = (p, kind, dir = 'uploads') => { const im = p.images.find((i) => i.kind === kind) || p.images[0]; return im ? `/${dir}/` + encodeURIComponent(im.file) : ''; };
  const track = (type, productId) => fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, productId }) }).catch(() => {});
  const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); };

  // ---------- chrome ----------
  function chrome() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    if (!document.querySelector('meta[name=x-fixed-title]')) document.title = t('brand');
    $('#logo').textContent = t('brand');
    $('#nav').innerHTML = `<button class="menubtn" id="menuBtn" aria-label="${t('menu')}">☰</button><a href="/" data-link>${t('shop')}</a><a href="/about" data-link>${t('about')}</a><a href="/contact" data-link>${t('contact')}</a>`;
    $('#menuBtn').onclick = () => drawer(`<div class="dh"><b>${t('menu')}</b><button data-close aria-label="${t('close')}">✕</button></div><div class="db"><a class="row" data-link href="/">${t('shop')}</a>${(function walk(pid, depth) { return kids(pid).map((c) => `<a class="row sub" style="padding-inline-start:${20 + depth * 18}px" data-link href="/?cat=${encodeURIComponent(c.slug)}">${depth ? '└ ' : ''}${esc(L(c.name))}</a>${walk(c.id, depth + 1)}`).join(''); })(null, 0)}<a class="row" data-link href="/account">${me ? esc(me.name || t('account')) : t('login')}</a><a class="row" data-link href="/about">${t('about')}</a><a class="row" data-link href="/contact">${t('contact')}</a></div>`, 'side');
    $('#lang').textContent = t('langBtn');
    const ab = $('#acctBtn'); if (ab) { ab.textContent = me ? (me.name || t('account')) : t('login'); ab.onclick = () => (me ? go('/account') : authDrawer()); }
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
    else if (path === '/account') accountPage();
    else if (path === '/about') staticPage(t('about'), t('aboutText'));
    else if (path === '/contact') staticPage(t('contact'), t('contactText'));
    else staticPage('404', t('notFound'));
  }
  const staticPage = (h, body) => { $('#app').innerHTML = `<section class="static"><h1 class="display">${esc(h)}</h1><p>${esc(body)}</p></section>`; };

  // ---------- shop ----------
  function shopPage(catSlug) {
    const cat = data.categories.find((c) => c.slug === catSlug);
    const inCat = cat ? descIds(cat.id) : null;
    let list = data.products.filter((p) => !cat || inCat.has(p.categoryId));
    if (ui.sort === 'priceAsc') list.sort((a, b) => unit(a) - unit(b)); else if (ui.sort === 'priceDesc') list.sort((a, b) => unit(b) - unit(a));
    const href = (c) => (c.slug ? '/?cat=' + encodeURIComponent(c.slug) : '/');
    const tab = (c, on) => `<a class="tab ${on ? 'on' : ''}" data-link href="${href(c)}">${esc(c.name)}</a>`;
    const path = cat ? catPath(cat.id) : [], root = path[0] || null;
    const tabs = [{ slug: '', name: t('all') }, ...kids(null).map((c) => ({ slug: c.slug, name: L(c.name), id: c.id }))].map((c) => tab(c, root ? c.id === root.id : !c.slug)).join('');
    // second row: children of the selected category, or its siblings when it is a leaf
    const parent = cat ? (kids(cat.id).length ? cat : data.categories.find((x) => x.id === cat.parentId)) : null;
    const subs = parent ? [{ slug: parent.slug, name: t('allIn').replace('{c}', L(parent.name)), id: parent.id }, ...kids(parent.id).map((c) => ({ slug: c.slug, name: L(c.name), id: c.id }))] : [];
    const subTabs = subs.length > 1 ? `<div class="tabs sub">${subs.map((c) => tab(c, cat && c.id === cat.id)).join('')}</div>` : '';
    const cards = list.map((p) => {
      const out = p.sizes.length && p.sizes.every((s) => s.stock === 0);
      const gw = innerWidth < 900 ? 480 : 720, main = img(p, ui.kind, 'uploads/t') + '?w=' + gw, alt2 = p.images.map((i) => '/uploads/t/' + encodeURIComponent(i.file) + '?w=' + gw).find((u) => u !== main);
      return `<a class="card" data-link aria-label="${esc(L(p.name))}" href="/product/${encodeURIComponent(p.slug)}"><img loading="lazy" decoding="async" width="720" height="900" src="${main}" alt="${esc(L(p.name))}">${alt2 ? `<img class="alt" decoding="async" data-src="${alt2}" alt="">` : ''}
        ${out ? `<span class="badge">${t('soldOut')}</span>` : p.sale ? `<span class="badge sale">−${num(p.sale.percent)}${lang === 'fa' ? '٪' : '%'}</span>` : ''}</a>`;
    }).join('');
    const gb = (c, rows) => `<button class="gridbtn ${ui.cols === c ? 'on' : ''}" data-cols="${c}" aria-label="${c}"><i style="grid-template-columns:repeat(${rows},1fr)">${'<b></b>'.repeat(rows * rows)}</i></button>`;
    $('#app').innerHTML = `
      <h1 class="page-title display">${esc(cat ? L(cat.name) : t('allProducts'))}</h1>
      <div class="tabs">${tabs}</div>${subTabs}
      <div class="bar">
        <select id="sort">${['newest', 'priceAsc', 'priceDesc'].map((k) => `<option value="${k}" ${ui.sort === k ? 'selected' : ''}>${t(k)}</option>`).join('')}</select>
        <span class="count">${num(list.length)} ${t('products')}</span>
        <span class="seg">${gb(8, 3)}${gb(4, 2)}
          <button data-kind="product" class="${ui.kind === 'product' ? 'on' : ''}">${t('product')}</button><button data-kind="model" class="${ui.kind === 'model' ? 'on' : ''}">${t('model')}</button></span>
      </div>
      ${list.length ? `<div class="grid ${ui.cols >= 8 ? 'dense' : ''}" style="--cols:${ui.cols}">${cards}</div>` : `<p class="empty">${t('noProducts')}</p>`}`;
    document.querySelectorAll('.card').forEach((c) => { const a = c.querySelector('img.alt'); if (a) c.addEventListener('pointerenter', () => { if (a.dataset.src) { a.src = a.dataset.src; delete a.dataset.src; } }, { once: true }); });
    $('#sort').onchange = (e) => { ui.sort = e.target.value; shopPage(catSlug); };
    document.querySelectorAll('[data-cols]').forEach((b) => (b.onclick = () => { ui.cols = +b.dataset.cols; shopPage(catSlug); }));
    document.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => { ui.kind = b.dataset.kind; shopPage(catSlug); }));
  }

  // ---------- product ----------
  let pick = null;
  const thumb = (p, w = 480) => { const im = p.images.find((i) => i.kind === 'product') || p.images[0]; return im ? `/uploads/t/${encodeURIComponent(im.file)}?w=${w}` : ''; };
  const soldOut = (p) => p.sizes.length && p.sizes.every((s) => s.stock === 0);
  function productPage(slug) {
    const p = data.products.find((x) => x.slug === slug);
    if (!p) return staticPage('404', t('notFound'));
    pick = null; track('product', p.id);
    const cat = data.categories.find((c) => c.id === p.categoryId), cpath = catPath(p.categoryId);
    if (!document.querySelector('meta[name=x-fixed-title]')) document.title = `${L(p.name)} | ${t('brand')}`;
    const sibs = p.group ? data.products.filter((x) => x.group === p.group).sort((a, b) => a.id - b.id) : [];
    const colorName = p.color ? L(p.color) : '';
    const cdot = p.color && p.color.hex ? `<i class="cdot" style="background:${esc(p.color.hex)}"></i>` : '';
    const swatches = sibs.length > 1
      ? `<div class="og"><div class="olabel">${t('color')}: <b>${esc(colorName)}</b></div><div class="sw-row">${sibs.map((x) => `<a class="swatch ${x.id === p.id ? 'on' : ''} ${soldOut(x) ? 'out' : ''}" data-link href="/product/${encodeURIComponent(x.slug)}" title="${esc(x.color ? L(x.color) : L(x.name))}" aria-label="${esc(x.color ? L(x.color) : L(x.name))}"><img src="${thumb(x, 120)}" alt="" loading="lazy"></a>`).join('')}</div></div>`
      : colorName ? `<div class="og"><div class="olabel">${t('color')}: <b>${esc(colorName)}</b>${cdot}</div></div>` : '';
    const rows = (p.properties || []).filter((r) => !(colorName && (r.label.en === 'Color' || r.label.fa === 'رنگ'))).map((r) => `<div><dt>${esc(L(r.label))}</dt><dd>${esc(L(r.value))}</dd></div>`).join('');
    const sizeChips = p.sizes.length
      ? `<div class="og"><div class="olabel">${t('size')}: <b id="sizeLbl">—</b><span class="low" id="sizeHint"></span></div>
          <div class="chips" role="radiogroup" aria-label="${t('size')}">${p.sizes.map((s) => `<button type="button" role="radio" aria-checked="false" class="chip ${s.stock <= 0 ? 'out' : ''}" data-size="${esc(s.name)}">${esc(s.name)}</button>`).join('')}</div>
          <div class="notifybox" id="notifyBox" hidden><span id="notifyMsg"></span><button class="link" id="notifyBtn" type="button">${t('notifyMe')}</button></div></div>` : '';
    const allOut = p.sizes.length === 0 || p.sizes.every((s) => s.stock <= 0);
    const peers = data.products.filter((x) => x.categoryId === p.categoryId && x.id !== p.id && (!p.group || x.group !== p.group));
    const start = peers.length ? p.id % peers.length : 0;
    const rel = [...peers.slice(start), ...peers.slice(0, start)].slice(0, 10);
    const order = data.products.filter((x) => x.categoryId === p.categoryId), at = order.findIndex((x) => x.id === p.id);
    const pn = order.length > 1 ? [order[(at - 1 + order.length) % order.length], order[(at + 1) % order.length]] : null;
    const acc = (title, body) => body ? `<details><summary>${title}</summary><div class="body">${esc(body)}</div></details>` : '';
    $('#app').innerHTML = `<div class="pdp">
      <div class="gwrap"><div class="gallery" id="gal">${p.images.map((i) => `<img src="/uploads/${encodeURIComponent(i.file)}" alt="${esc(L(p.name))}">`).join('')}</div>${p.images.length > 1 ? `<div class="gdots" id="gdots">${p.images.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>
      <div class="info">
        <div class="crumbs"><a data-link href="/">${t('shopCrumb')}</a>${cpath.map((c) => ` › <a data-link href="/?cat=${encodeURIComponent(c.slug)}">${esc(L(c.name))}</a>`).join('')}</div>
        <h1 class="display">${esc(L(p.name))}</h1>
        ${p.sale ? `<div class="salebar"><b>−${num(p.sale.percent)}${lang === 'fa' ? '٪' : '%'}</b> ${t('onSale')}${p.sale.endsAt ? ` · ${t('until')} ${new Date(p.sale.endsAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB')}` : ''}</div>` : ''}
        ${swatches}${sizeChips}
        <div class="buy"><button class="addbtn needs" id="addBtn" ${allOut ? 'disabled' : ''}><span id="addLbl">${allOut ? t('soldOut') : t('selectSize')}</span><span>${p.sale ? `<s class="price-old">${num(p.price)}</s>` : p.comparePrice ? `<s class="price-old">${num(p.comparePrice)}</s>` : ''}${money(unit(p))}</span></button></div>
        <p class="desc">${esc(L(p.description))}</p>
        <div class="acc">${rows ? `<details open><summary>${t('props')}</summary><dl class="props">${rows}</dl></details>` : ''}${acc(t('specs'), L(p.details))}</div>
        ${pn ? `<div class="pn"><a data-link href="/product/${encodeURIComponent(pn[0].slug)}">‹ ${t('prev')}</a><a data-link href="/product/${encodeURIComponent(pn[1].slug)}">${t('next')} ›</a></div>` : ''}
      </div></div>
      ${rel.length ? `<section class="related"><h2>${t('related')}</h2><div class="rrow">${rel.map((x) => `<a class="rcard" data-link href="/product/${encodeURIComponent(x.slug)}"><span class="rimg"><img src="${thumb(x)}" alt="${esc(L(x.name))}" loading="lazy" decoding="async"></span><span class="rn">${esc(L(x.name))}</span><span class="rp">${x.sale ? `<s class="price-old">${num(x.price)}</s>` : ''}${money(unit(x))}</span></a>`).join('')}</div></section>` : ''}`;
    const gal = $('#gal'), dots = document.querySelectorAll('#gdots i');
    if (dots.length) gal.addEventListener('scroll', () => { const i = Math.round(Math.abs(gal.scrollLeft) / gal.clientWidth); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
    const chips = [...document.querySelectorAll('.chip[data-size]')], sizeOf = (n) => p.sizes.find((s) => s.name === n), nb = $('#notifyBox');
    const refresh = () => {
      chips.forEach((c) => { const on = c.dataset.size === pick; c.classList.toggle('on', on); c.setAttribute('aria-checked', String(on)); });
      const s = pick && sizeOf(pick);
      if ($('#sizeLbl')) $('#sizeLbl').textContent = pick || '—';
      if ($('#sizeHint')) $('#sizeHint').textContent = s && s.stock <= 3 ? t('fewLeft') : '';
      if (!allOut) { $('#addLbl').textContent = pick ? t('addToCart') : t('selectSize'); $('#addBtn').classList.toggle('needs', !pick); }
    };
    chips.forEach((c) => (c.onclick = () => {
      const s = sizeOf(c.dataset.size);
      if (s.stock <= 0) { pick = null; nb.hidden = false; nb.dataset.size = s.name; $('#notifyMsg').textContent = `${s.name} — ${t('soldOut')}`; refresh(); return; }
      nb.hidden = true; pick = pick === s.name ? null : s.name; refresh();
    }));
    if ($('#notifyBtn')) $('#notifyBtn').onclick = async () => {
      let phone; if (!me) { phone = prompt(t('notifyPhone')); if (!phone) return; }
      try { await jsonApi('/api/stock-watch', { method: 'POST', body: { productId: p.id, size: nb.dataset.size, phone } }); $('#notifyBtn').textContent = t('notifyDone'); $('#notifyBtn').disabled = true; }
      catch (er) { toast((er.data || {}).error === 'invalid_phone' ? t('invalidPhone') : t('errGeneric')); }
    };
    const avail = p.sizes.filter((s) => s.stock > 0); if (avail.length === 1) pick = avail[0].name; // only one size left: preselect it
    refresh();
    $('#addBtn').onclick = () => {
      if (!pick) { // guide the customer to the size row instead of opening another dialog
        const g = $('.chips'); if (g) { g.classList.remove('need'); void g.offsetWidth; g.classList.add('need'); g.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return toast(t('pickSize'));
      }
      addToCart(p, pick); openCart();
    };
  }

  // ---------- cart ----------
  const jsonApi = async (path, opts = {}) => {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { status: r.status, data: j });
    return j;
  };
  let cartSync, coupon = ls.get('coupon', '');
  const saveCart = () => {
    ls.set('cart', cart); chrome(); clearTimeout(cartSync);
    if (me) cartSync = setTimeout(() => jsonApi('/api/auth/cart', { method: 'PUT', body: { items: cart } }).catch(() => {}), 1500);
  };
  function addToCart(p, size) {
    const s = p.sizes.find((z) => z.name === size); if (!s) return;
    const line = cart.find((i) => i.productId === p.id && i.size === size);
    if (line) line.qty = Math.min(s.stock, line.qty + 1); else cart.push({ productId: p.id, size, qty: 1 });
    saveCart(); track('cart');
  }
  const cartLines = () => cart.map((i) => { const p = data.products.find((x) => x.id === i.productId); const s = p && p.sizes.find((z) => z.name === i.size); return p && s ? { ...i, p, max: s.stock } : null; }).filter(Boolean);
  const couponErr = (e, d = {}) => (e === 'coupon_min_order' ? t('couponMinOrder').replace('{n}', money(d.min || 0)) : t(e) !== e ? t(e) : t('errGeneric'));
  // Server-priced totals (sale prices + coupon). Updates the summary rows in the open drawer.
  async function refreshTotals(prefix = 's') {
    const msg = $('#cpnMsg');
    try {
      const q = await jsonApi('/api/cart/quote', { method: 'POST', body: { items: cart, coupon } });
      if ($('#' + prefix + 'Sub')) $('#' + prefix + 'Sub').textContent = money(q.subtotal);
      const row = $('#' + prefix + 'DiscRow'); if (row) { row.hidden = !q.discount; $('#' + prefix + 'Disc').textContent = '−' + money(q.discount); }
      if ($('#' + prefix + 'Tot')) $('#' + prefix + 'Tot').textContent = money(q.total);
      if (msg) { msg.style.color = q.error ? '#c00' : '#1a7f4b'; msg.textContent = q.error ? couponErr(q.error, q) : coupon ? t('couponApplied') : ''; }
      return q;
    } catch (e) { return null; }
  }
  function openCart() {
    cart = cartLines().map(({ productId, size, qty, max }) => ({ productId, size, qty: Math.min(qty, max) })).filter((i) => i.qty > 0); saveCart();
    const lines = cartLines(), est = lines.reduce((a, l) => a + unit(l.p) * l.qty, 0), count = lines.reduce((a, l) => a + l.qty, 0);
    drawer(`<div class="dh"><b>${t('cart')}</b><button data-close aria-label="${t('close')}">✕</button></div>
      <div class="db">${lines.length ? lines.map((l, i) => `<div class="line"><a data-link href="/product/${encodeURIComponent(l.p.slug)}"><img src="${img(l.p, 'product', 'uploads/t')}?w=480" alt=""></a>
        <div class="lc"><div class="top2"><span>${esc(L(l.p.name))}</span><span>${l.p.sale ? `<s class="price-old">${num(l.p.price)}</s>` : ''}${money(unit(l.p))}</span></div><span>${t('size')}: ${esc(l.size)}</span>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto"><div class="qty"><button data-q="${i}:-1">−</button><span>${num(l.qty)}</span><button data-q="${i}:1">+</button></div>
        <button class="link" data-rm="${i}">${t('remove')}</button></div></div></div>`).join('') : `<p class="empty">${t('emptyCart')}</p>`}</div>
      ${lines.length ? `<div class="df"><div class="coupon"><input id="cpn" dir="ltr" autocomplete="off" placeholder="${t('couponCode')}" value="${esc(coupon)}"><button class="btn ghost" id="cpnBtn">${t('apply')}</button></div><div id="cpnMsg" class="err"></div>
        <div class="sumrow"><span>${t('subtotal')} (${num(count)} ${t('items')})</span><span id="sSub">${money(est)}</span></div><div class="sumrow" id="sDiscRow" hidden><span>${t('discount')}</span><span id="sDisc"></span></div>
        <div class="sumrow total"><b>${t('total')}</b><b id="sTot">${money(est)}</b></div><button class="btn" id="goCheckout">${t('checkout')}</button></div>` : ''}`);
    const lines2 = cartLines();
    document.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { const [i, d] = b.dataset.q.split(':').map(Number); const l = lines2[i]; const it = cart.find((c) => c.productId === l.productId && c.size === l.size); it.qty = Math.max(1, Math.min(l.max, it.qty + d)); saveCart(); openCart(); }));
    document.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const l = lines2[+b.dataset.rm]; cart = cart.filter((c) => !(c.productId === l.productId && c.size === l.size)); saveCart(); openCart(); }));
    const g = $('#goCheckout'); if (g) g.onclick = checkoutForm;
    if (lines.length) {
      const apply = () => { coupon = $('#cpn').value.trim(); ls.set('coupon', coupon); refreshTotals(); };
      $('#cpnBtn').onclick = apply; $('#cpn').onkeydown = (e) => e.key === 'Enter' && apply();
      refreshTotals();
    }
  }
  $('#cartBtn').onclick = openCart;

  function checkoutForm() {
    if (checkoutCfg.requireLogin && !me) return authDrawer(() => checkoutForm());
    drawer(`<div class="dh"><b>${t('checkout')}</b><button data-close aria-label="${t('close')}">✕</button></div><form class="form db" id="co">
      <label>${t('name')}<input name="name" required maxlength="100" autocomplete="name" value="${esc(me ? me.name : '')}"></label>
      ${me ? `<div class="sumrow"><span>${t('phone')}</span><b dir="ltr">${esc(me.phone)}</b></div>` : `<label>${t('phone')}<input name="phone" required inputmode="tel" dir="ltr" autocomplete="tel" placeholder="09xxxxxxxxx"></label>${checkoutCfg.requireLogin ? '' : `<button class="link" type="button" id="coLogin">${t('loginFaster')}</button>`}`}
      <label>${t('address')}<textarea name="address" rows="3" required maxlength="500" autocomplete="street-address">${esc(me ? me.address : '')}</textarea></label>
      <label>${t('note')}<textarea name="note" rows="2" maxlength="500"></textarea></label>
      <label class="check"><input type="checkbox" name="opt" ${me && me.marketingOptIn ? 'checked' : ''}> <span>${t('optInSms')}</span></label>
      <div class="sumrow"><span>${t('subtotal')}</span><span id="cSub"></span></div><div class="sumrow" id="cDiscRow" hidden><span>${t('discount')}</span><span id="cDisc"></span></div><div class="sumrow total"><b>${t('total')}</b><b id="cTot"></b></div>
      <div class="err" id="coErr"></div><button class="btn" type="submit">${t('placeOrder')}</button><button class="btn ghost" type="button" id="coBack">${t('back')}</button></form>`);
    $('#coBack').onclick = openCart; if ($('#coLogin')) $('#coLogin').onclick = () => authDrawer(() => checkoutForm());
    refreshTotals('c');
    $('#co').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, btn = f.querySelector('[type=submit]'); btn.disabled = true; $('#coErr').textContent = '';
      try {
        const j = await jsonApi('/api/orders', { method: 'POST', body: { name: f.name.value, phone: f.phone ? f.phone.value : undefined, address: f.address.value, note: f.note.value, items: cart, coupon, marketingOptIn: f.opt.checked } });
        cart = []; coupon = ''; ls.set('coupon', ''); saveCart(); await load(); if (me) await loadMe();
        drawer(`<div class="dh"><b>${t('cart')}</b><button data-close aria-label="${t('close')}">✕</button></div><div class="done"><h2 class="display">${t('orderDone')}</h2><p>${t('orderNum')}: <b>${num(j.orderId)}</b></p><p>${t('orderMsg')}</p>${me ? `<a class="btn ghost" data-link href="/account">${t('myOrders')}</a>` : ''}<button class="btn" data-close>${t('continue')}</button></div>`);
      } catch (er) {
        const d = er.data || {}, c = d.error;
        if (er.status === 401) { btn.disabled = false; return authDrawer(() => checkoutForm()); }
        $('#coErr').textContent = er.status === 409 ? t('errStock') : c === 'invalid_customer' ? t('errInvalid') : c && c.startsWith('coupon_') ? couponErr(c, d) : t('errGeneric');
        if (er.status === 409) await load(); btn.disabled = false;
      }
    };
  }

  // ---------- customer login (SMS code) & account ----------
  let me = null, checkoutCfg = { requireLogin: false };
  async function loadMe() { try { const j = await jsonApi('/api/auth/me'); me = j.customer; checkoutCfg = j.checkout || checkoutCfg; } catch {} chrome(); }
  function authDrawer(after) {
    let phone = '', timer;
    const stepPhone = () => {
      drawer(`<div class="dh"><b>${t('login')}</b><button data-close aria-label="${t('close')}">✕</button></div><form class="form db" id="lf"><p class="muted">${t('loginHint')}</p>
        <label>${t('phone')}<input name="phone" required inputmode="tel" dir="ltr" autocomplete="tel" placeholder="09xxxxxxxxx" value="${esc(phone)}" autofocus></label><div class="err" id="lerr"></div><button class="btn" type="submit">${t('sendCode')}</button></form>`);
      $('#lf').onsubmit = async (e) => {
        e.preventDefault(); phone = e.target.phone.value; const btn = e.target.querySelector('button'); btn.disabled = true;
        try { const r = await jsonApi('/api/auth/otp/request', { method: 'POST', body: { phone } }); stepCode(r.dev || r.smsFailed, r.devCode, r.smsFailed); }
        catch (er) { const c = (er.data || {}).error; if (c === 'wait') return stepCode(false, undefined, false, er.data.retryIn); // a code was just sent and is still valid: go on to the code field
          $('#lerr').textContent = c === 'invalid_phone' ? t('invalidPhone') : c === 'wait' ? t('waitCode').replace('{n}', num(er.data.retryIn)) : c === 'too_many' ? t('tooManyCodes') : c === 'sms_failed' ? t('smsFailedCustomer') : t('errGeneric'); btn.disabled = false; }
      };
    };
    const stepCode = (dev, devCode, failed, wait) => {
      drawer(`<div class="dh"><b>${t('login')}</b><button data-close aria-label="${t('close')}">✕</button></div><form class="form db" id="vf"><p class="muted">${wait ? t('codeAlready') + ' ' : ''}${t('codeSentTo')} <b dir="ltr">${esc(phone)}</b></p>${dev ? `<p class="err" style="color:#8a5a00">${devCode ? `${failed ? t('smsFailedLocal') : t('devCodeIs')} <b dir="ltr">${devCode}</b>` : t('devOtpHint')}</p>` : ''}
        <label>${t('otpCode')}<input name="code" required inputmode="numeric" dir="ltr" autocomplete="one-time-code" maxlength="6" value="${devCode || ''}" autofocus></label>
        <label>${t('nameOptional')}<input name="name" maxlength="100" autocomplete="name"></label><div class="err" id="lerr"></div>
        <button class="btn" type="submit">${t('verify')}</button><button class="btn ghost" type="button" id="chg">${t('changeNumber')}</button><button class="link" type="button" id="rs" disabled></button></form>`);
      let left = wait || 60; const tick = () => { const b = $('#rs'); if (!b) return clearInterval(timer); b.disabled = left > 0; b.textContent = left > 0 ? t('resendIn').replace('{n}', num(left)) : t('resend'); left--; };
      clearInterval(timer); tick(); timer = setInterval(tick, 1000);
      $('#chg').onclick = stepPhone; $('#rs').onclick = async () => { try { await jsonApi('/api/auth/otp/request', { method: 'POST', body: { phone } }); left = 60; toast(t('codeResent')); } catch (er) { $('#lerr').textContent = t('errGeneric'); } };
      $('#vf').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target, btn = f.querySelector('[type=submit]'); btn.disabled = true;
        try { const r = await jsonApi('/api/auth/otp/verify', { method: 'POST', body: { phone, code: f.code.value, name: f.name.value } }); me = r.customer; clearInterval(timer); chrome(); toast(t('welcomeBack')); if (after) after(); else { closeDrawer(); route(); } }
        catch (er) { $('#lerr').textContent = (er.data || {}).error === 'blocked' ? t('errGeneric') : t('wrongCode'); btn.disabled = false; }
      };
    };
    stepPhone();
  }
  const stepIdx = (s) => ({ new: 0, confirmed: 1, processing: 1, shipped: 2, out_for_delivery: 2, ready_pickup: 2, delivered: 3 }[s]);
  async function accountPage() {
    if (!me) { $('#app').innerHTML = `<section class="static"><h1 class="display">${t('account')}</h1><p>${t('loginToSee')}</p><button class="btn" id="al" style="max-width:240px">${t('login')}</button></section>`; $('#al').onclick = () => authDrawer(() => { closeDrawer(); accountPage(); }); return; }
    let orders = []; try { orders = await jsonApi('/api/auth/orders'); } catch {}
    const steps = ['stPlaced', 'stConfirmed', 'stShipped', 'stDelivered'];
    $('#app').innerHTML = `<section class="acct"><h1 class="display">${t('account')}</h1>
      <form class="form prof" id="pf"><h2>${t('profile')}</h2><label>${t('name')}<input name="name" maxlength="100" value="${esc(me.name)}"></label><div class="sumrow"><span>${t('phone')}</span><b dir="ltr">${esc(me.phone)}</b></div>
        <label>${t('address')}<textarea name="address" rows="2" maxlength="500">${esc(me.address)}</textarea></label><label class="check"><input type="checkbox" name="opt" ${me.marketingOptIn ? 'checked' : ''}> <span>${t('optInSms')}</span></label>
        <div class="err" id="pe"></div><button class="btn" type="submit">${t('save')}</button><button class="btn ghost" type="button" id="lo">${t('logout')}</button></form>
      <h2>${t('myOrders')}</h2>${orders.map((o) => { const idx = stepIdx(o.status), bad = ['cancelled', 'return_requested', 'return_approved', 'return_rejected', 'returned'].includes(o.status); return `<div class="ord">
        <div class="oh"><b>${t('orderNum')} ${num(o.id)}</b><span>${new Date(o.createdAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB')}</span><span class="stb ${bad ? 'bad' : ''}">${t('st_' + o.status)}</span></div>
        ${idx !== undefined && !bad ? `<div class="steps">${steps.map((s, i) => `<span class="${i <= idx ? 'on' : ''}">${t(s)}</span>`).join('')}</div>` : ''}
        ${o.items.map((i) => `<div class="oi"><span>${esc(L(i.name))} · ${esc(i.size)} ×${num(i.qty)}</span><span>${money(i.price * i.qty)}</span></div>`).join('')}
        <div class="oi tot"><b>${t('total')}</b><b>${money(o.total)}${o.discount ? ` <small>(−${num(o.discount)})</small>` : ''}</b></div>
        <div class="oi"><span>${t('payment')}</span><span>${t('pay_' + o.paymentStatus)}</span></div>
        ${o.trackingCode ? `<div class="oi"><span>${t('trackingCode')}</span><b dir="ltr">${esc(o.trackingCode)}</b></div>` : ''}
        <div class="oa">${['new', 'confirmed'].includes(o.status) ? `<button class="link" data-cancel="${o.id}">${t('cancelOrder')}</button>` : ''}${o.status === 'delivered' ? `<button class="link" data-return="${o.id}">${t('returnOrder')}</button>` : ''}</div></div>`; }).join('') || `<p class="empty">${t('noOrders')}</p>`}</section>`;
    $('#lo').onclick = async () => { await jsonApi('/api/auth/logout', { method: 'POST' }).catch(() => {}); me = null; cart = cart; chrome(); go('/'); };
    $('#pf').onsubmit = async (e) => { e.preventDefault(); const f = e.target; try { const r = await jsonApi('/api/auth/me', { method: 'PUT', body: { name: f.name.value, address: f.address.value, marketingOptIn: f.opt.checked } }); me = r.customer; chrome(); toast(t('saved')); } catch { $('#pe').textContent = t('errGeneric'); } };
    $('#app').onclick = async (e) => {
      const b = e.target.closest('[data-cancel],[data-return]'); if (!b) return;
      try {
        if (b.dataset.cancel) { if (!confirm(t('confirmCancelOrder'))) return; await jsonApi(`/api/auth/orders/${b.dataset.cancel}/cancel`, { method: 'POST' }); }
        else { const reason = prompt(t('returnReason')); if (reason === null) return; await jsonApi(`/api/auth/orders/${b.dataset.return}/return`, { method: 'POST', body: { reason } }); }
        toast(t('saved')); accountPage();
      } catch { toast(t('errGeneric')); }
    };
  }

  // ---------- drawer ----------
  let drawerOpen = false;
  function drawer(html, cls = '') { const d = $('#drawer'); d.innerHTML = html; d.className = 'drawer on ' + cls; document.body.classList.add('lock'); $('#overlay').classList.add('on'); d.setAttribute('aria-hidden', 'false'); drawerOpen = true; }
  function closeDrawer() { document.body.classList.remove('lock'); $('#drawer').classList.remove('on'); $('#overlay').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); drawerOpen = false; }
  $('#overlay').onclick = closeDrawer;
  $('#drawer').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDrawer(); });
  addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawer());

  // ---------- boot ----------
  async function load() {
    try { data = await (await fetch('/api/store')).json(); } catch { toast(t('errGeneric')); }
  }
  (async () => { chrome(); if (window.UX) $('#app').innerHTML = `<div class="page-title display ux-skel" style="margin:70px 20px 60px;height:90px;width:40%"></div>${UX.skeletonGrid(8, ui.cols)}`; await Promise.all([load(), loadMe()]); route(); track('view'); })();
})();
