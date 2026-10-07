(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = {
    fa: { title: 'پنل مدیریت آرموا', dashboard: 'داشبورد', products: 'محصولات', categories: 'دسته‌بندی‌ها', files: 'فایل‌ها', orders: 'سفارش‌ها', logout: 'خروج', login: 'ورود', password: 'رمز عبور', badLogin: 'رمز عبور اشتباه است', tooMany: 'تلاش بیش از حد؛ بعداً امتحان کنید',
      revenue: 'درآمد', views: 'بازدید', newOrders: 'سفارش جدید', totalOrders: 'کل سفارش‌ها', lowStock: 'موجودی کم', outStock: 'ناموجود', last14: 'آمار ۱۴ روز اخیر', topProducts: 'پربازدیدترین محصولات', byCategory: 'محصولات به تفکیک دسته', pViews: 'بازدید محصول', carts: 'افزودن به سبد',
      add: 'افزودن', edit: 'ویرایش', del: 'حذف', save: 'ذخیره', cancel: 'انصراف', confirmDel: 'مطمئن هستید؟', saved: 'ذخیره شد', deleted: 'حذف شد', error: 'خطا رخ داد', name: 'نام', nameFa: 'نام (فارسی)', nameEn: 'نام (انگلیسی)', descFa: 'توضیحات (فارسی)', descEn: 'توضیحات (انگلیسی)', detFa: 'مشخصات (فارسی)', detEn: 'مشخصات (انگلیسی)',
      category: 'دسته', price: 'قیمت (تومان)', compare: 'قیمت قبل از تخفیف', status: 'وضعیت', active: 'فعال', draft: 'پیش‌نویس', stock: 'موجودی', sizes: 'سایزها', size: 'سایز', addSize: 'سایز جدید', images: 'تصاویر', upload: 'آپلود تصویر', fromLib: 'انتخاب از فایل‌ها', kindProduct: 'عکس محصول', kindModel: 'عکس مدل', order: 'ترتیب', count: 'تعداد',
      catInUse: 'این دسته محصول دارد.', fileInUse: 'این فایل در یک محصول استفاده شده است.', usedBy: 'استفاده در', unused: 'استفاده نشده', copyUrl: 'کپی لینک', copied: 'کپی شد', dropHere: 'تصاویر را اینجا رها کنید یا کلیک کنید (JPG, PNG, WebP, حداکثر ۱۰MB)', totalSize: 'حجم کل', empty: 'موردی وجود ندارد', done: 'تأیید', pick: 'انتخاب',
      customer: 'مشتری', total: 'جمع', date: 'تاریخ', phone: 'موبایل', address: 'آدرس', items: 'اقلام', new: 'جدید', processing: 'در حال پردازش', shipped: 'ارسال شد', delivered: 'تحویل شد', cancelled: 'لغو شد', currency: 'تومان', lang: 'EN', nameReq: 'نام الزامی است', badPrice: 'قیمت نامعتبر است', badCategory: 'دسته را انتخاب کنید' },
    en: { title: 'Armova Admin', dashboard: 'Dashboard', products: 'Products', categories: 'Categories', files: 'Files', orders: 'Orders', logout: 'Log out', login: 'Log in', password: 'Password', badLogin: 'Wrong password', tooMany: 'Too many attempts, try later',
      revenue: 'Revenue', views: 'Visits', newOrders: 'New orders', totalOrders: 'Total orders', lowStock: 'Low stock', outStock: 'Out of stock', last14: 'Last 14 days', topProducts: 'Most viewed products', byCategory: 'Products by category', pViews: 'Product views', carts: 'Add to cart',
      add: 'Add', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', confirmDel: 'Are you sure?', saved: 'Saved', deleted: 'Deleted', error: 'Something went wrong', name: 'Name', nameFa: 'Name (Farsi)', nameEn: 'Name (English)', descFa: 'Description (Farsi)', descEn: 'Description (English)', detFa: 'Specifications (Farsi)', detEn: 'Specifications (English)',
      category: 'Category', price: 'Price (Toman)', compare: 'Compare-at price', status: 'Status', active: 'Active', draft: 'Draft', stock: 'Stock', sizes: 'Sizes', size: 'Size', addSize: 'Add size', images: 'Images', upload: 'Upload images', fromLib: 'Pick from files', kindProduct: 'Product shot', kindModel: 'Model shot', order: 'Order', count: 'Count',
      catInUse: 'This category still has products.', fileInUse: 'This file is used by a product.', usedBy: 'Used by', unused: 'Unused', copyUrl: 'Copy URL', copied: 'Copied', dropHere: 'Drop images here or click (JPG, PNG, WebP, max 10MB)', totalSize: 'Total size', empty: 'Nothing here yet', done: 'Done', pick: 'Pick',
      customer: 'Customer', total: 'Total', date: 'Date', phone: 'Phone', address: 'Address', items: 'Items', new: 'New', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', currency: 'Toman', lang: 'فا', nameReq: 'Name is required', badPrice: 'Invalid price', badCategory: 'Choose a category' },
  };
  let lang = (() => { try { return localStorage.getItem('alang') || 'fa'; } catch { return 'fa'; } })();
  const t = (k) => D[lang][k] || k;
  const nf = () => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
  const num = (n) => nf().format(n || 0);
  const nm = (o) => (o && (o[lang] || o.fa || o.en)) || '';
  const fmtDate = (ts) => new Date(ts).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const toast = (m) => { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2000); };

  async function api(path, opts = {}) {
    const o = { credentials: 'same-origin', ...opts };
    if (o.body && !(o.body instanceof FormData)) { o.headers = { 'Content-Type': 'application/json' }; o.body = JSON.stringify(o.body); }
    const r = await fetch('/api/admin' + path, o);
    if (r.status === 401 && path !== '/login') { showLogin(); throw new Error('unauthorized'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { code: j.error });
    return j;
  }
  const errMsg = (e) => ({ name_required: t('nameReq'), bad_price: t('badPrice'), bad_category: t('badCategory'), category_in_use: t('catInUse'), file_in_use: t('fileInUse') }[e.code] || t('error'));
  const setLang = () => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; document.title = t('title'); };

  // ---------- login & shell ----------
  function showLogin() {
    setLang();
    $('#root').innerHTML = `<form class="login" id="lf"><h1>${t('title')}</h1><label>${t('password')}<input type="password" id="pw" required autofocus></label><div id="le" style="color:var(--bad)"></div><button class="btn">${t('login')}</button></form>`;
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      try { await api('/login', { method: 'POST', body: { password: $('#pw').value } }); shell(); }
      catch (er) { $('#le').textContent = er.code === 'too_many' ? t('tooMany') : t('badLogin'); }
    };
  }
  const pages = { dashboard: dashboard, products: products, categories: categories, files: filesPage, orders: orders };
  function shell() {
    setLang();
    const cur = location.hash.slice(1) || 'dashboard';
    $('#root').innerHTML = `<div class="layout"><nav class="side"><h2>${t('title')}</h2>
      ${Object.keys(pages).map((k) => `<a href="#${k}" class="${k === cur ? 'on' : ''}">${t(k)}</a>`).join('')}<div class="sp"></div>
      <button id="lg">${t('lang')}</button><a href="/" target="_blank">↗ Store</a><button id="lo">${t('logout')}</button></nav><main class="main" id="main"></main></div>`;
    $('#lg').onclick = () => { lang = lang === 'fa' ? 'en' : 'fa'; try { localStorage.setItem('alang', lang); } catch {} shell(); };
    $('#lo').onclick = async () => { await api('/logout', { method: 'POST' }); showLogin(); };
    (pages[cur] || dashboard)().catch((e) => e.message !== 'unauthorized' && toast(t('error')));
  }
  addEventListener('hashchange', () => $('#main') && shell());

  // ---------- modal ----------
  function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; m.onmousedown = (e) => { if (e.target === m) closeModal(); }; return m; }
  function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
  const confirmDel = () => confirm(t('confirmDel'));

  // ---------- dashboard ----------
  async function dashboard() {
    const s = await api('/stats'), T = s.totals;
    const max = Math.max(1, ...s.days.map((d) => d.views));
    const card = (l, v) => `<div class="card"><small>${l}</small><b>${v}</b></div>`;
    const maxCat = Math.max(1, ...s.byCategory.map((c) => c.count));
    $('#main').innerHTML = `<div class="head"><h1>${t('dashboard')}</h1></div>
      <div class="cards">${card(t('revenue'), `${num(T.revenue)} <small style="display:inline">${t('currency')}</small>`)}${card(t('views'), num(T.views))}${card(t('newOrders'), num(T.newOrders))}${card(t('totalOrders'), num(T.orders))}
      ${card(t('products'), num(T.products))}${card(t('categories'), num(T.categories))}${card(t('lowStock'), num(T.lowStock))}${card(t('outStock'), num(T.outOfStock))}</div>
      <div class="two"><div class="panel"><h3>${t('last14')} — ${t('views')}</h3><div class="bars">${s.days.map((d) => `<div title="${d.date}: ${d.views} / ${t('pViews')} ${d.productViews} / ${t('carts')} ${d.addToCart} / ${t('orders')} ${d.orders}"><span>${num(d.views)}</span><i style="height:${(d.views / max) * 100}%"></i><span>${d.date.slice(8)}</span></div>`).join('')}</div></div>
      <div class="panel"><h3>${t('topProducts')}</h3><ul class="list">${s.topProducts.map((p) => `<li><span>${esc(nm(p.name))}</span><b>${num(p.views)}</b></li>`).join('') || t('empty')}</ul></div></div>
      <div class="two"><div class="panel"><h3>${t('byCategory')}</h3><ul class="list">${s.byCategory.map((c) => `<li style="display:grid;grid-template-columns:110px 1fr 30px;align-items:center"><span>${esc(nm(c.name))}</span><i style="display:block;height:8px;background:var(--accent);border-radius:4px;width:${(c.count / maxCat) * 100}%"></i><b>${num(c.count)}</b></li>`).join('')}</ul></div>
      <div class="panel"><h3>${t('last14')}</h3><ul class="list"><li><span>${t('pViews')}</span><b>${num(s.days.reduce((a, d) => a + d.productViews, 0))}</b></li><li><span>${t('carts')}</span><b>${num(s.days.reduce((a, d) => a + d.addToCart, 0))}</b></li><li><span>${t('orders')}</span><b>${num(s.days.reduce((a, d) => a + d.orders, 0))}</b></li></ul></div></div>`;
  }

  // ---------- categories ----------
  async function categories() {
    const list = await api('/categories');
    $('#main').innerHTML = `<div class="head"><h1>${t('categories')}</h1><button class="btn" id="add">+ ${t('add')}</button></div>
      <table><tr><th>${t('nameFa')}</th><th>${t('nameEn')}</th><th>${t('order')}</th><th>${t('count')}</th><th></th></tr>
      ${list.map((c) => `<tr><td>${esc(c.name.fa)}</td><td>${esc(c.name.en)}</td><td>${num(c.order)}</td><td>${num(c.count)}</td><td><div class="actions"><button class="btn sec sm" data-e="${c.id}">${t('edit')}</button><button class="btn danger sm" data-d="${c.id}">${t('del')}</button></div></td></tr>`).join('') || `<tr><td colspan="5">${t('empty')}</td></tr>`}</table>`;
    const form = (c = { name: {}, order: list.length }) => {
      modal(`<h1>${c.id ? t('edit') : t('add')}</h1><div class="grid2"><label><span>${t('nameFa')}</span><input id="cf" dir="rtl" value="${esc(c.name.fa)}"></label><label><span>${t('nameEn')}</span><input id="ce" dir="ltr" value="${esc(c.name.en)}"></label></div>
        <label><span>${t('order')}</span><input id="co" type="number" value="${c.order}"></label><div class="actions"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
      $('#x').onclick = closeModal;
      $('#ok').onclick = async () => { try { await api(c.id ? `/categories/${c.id}` : '/categories', { method: c.id ? 'PUT' : 'POST', body: { name: { fa: $('#cf').value, en: $('#ce').value }, order: $('#co').value } }); closeModal(); toast(t('saved')); categories(); } catch (e) { toast(errMsg(e)); } };
    };
    $('#add').onclick = () => form();
    document.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => form(list.find((c) => c.id == b.dataset.e))));
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { if (!confirmDel()) return; try { await api('/categories/' + b.dataset.d, { method: 'DELETE' }); toast(t('deleted')); categories(); } catch (e) { toast(errMsg(e)); } }));
  }

  // ---------- products ----------
  async function products() {
    const [list, cats] = await Promise.all([api('/products'), api('/categories')]);
    const catName = (id) => nm((cats.find((c) => c.id === id) || {}).name);
    $('#main').innerHTML = `<div class="head"><h1>${t('products')}</h1><button class="btn" id="add">+ ${t('add')}</button></div><div class="scroll"><table>
      <tr><th></th><th>${t('name')}</th><th>${t('category')}</th><th>${t('price')}</th><th>${t('stock')}</th><th>${t('status')}</th><th>${t('views')}</th><th></th></tr>
      ${list.map((p) => { const st = p.sizes.reduce((a, s) => a + s.stock, 0); return `<tr><td>${p.images[0] ? `<img class="thumb" src="/uploads/${encodeURIComponent(p.images[0].file)}" alt="">` : ''}</td><td>${esc(nm(p.name))}</td><td>${esc(catName(p.categoryId))}</td><td>${num(p.price)}</td>
        <td><span class="pill ${st === 0 ? 'bad' : st < 6 ? 'warn' : 'ok'}">${num(st)}</span></td><td><span class="pill ${p.active ? 'ok' : ''}">${p.active ? t('active') : t('draft')}</span></td><td>${num(p.views)}</td>
        <td><div class="actions"><button class="btn sec sm" data-e="${p.id}">${t('edit')}</button><button class="btn danger sm" data-d="${p.id}">${t('del')}</button></div></td></tr>`; }).join('') || `<tr><td colspan="8">${t('empty')}</td></tr>`}</table></div>`;
    $('#add').onclick = () => productForm(null, cats);
    document.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => productForm(list.find((p) => p.id == b.dataset.e), cats)));
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { if (!confirmDel()) return; await api('/products/' + b.dataset.d, { method: 'DELETE' }); toast(t('deleted')); products(); }));
  }

  function productForm(p, cats) {
    const m = p ? JSON.parse(JSON.stringify(p)) : { name: {}, description: {}, details: {}, categoryId: (cats[0] || {}).id, price: 0, comparePrice: 0, sizes: [{ name: 'M', stock: 0 }], images: [], active: true };
    const draw = () => {
      modal(`<h1>${p ? t('edit') : t('add')}</h1>
        <div class="grid2"><label><span>${t('nameFa')}</span><input id="nf" dir="rtl" value="${esc(m.name.fa)}"></label><label><span>${t('nameEn')}</span><input id="ne" dir="ltr" value="${esc(m.name.en)}"></label></div>
        <div class="grid2"><label><span>${t('descFa')}</span><textarea id="df" rows="3" dir="rtl">${esc(m.description.fa)}</textarea></label><label><span>${t('descEn')}</span><textarea id="de" rows="3" dir="ltr">${esc(m.description.en)}</textarea></label></div>
        <div class="grid2"><label><span>${t('detFa')}</span><textarea id="tf" rows="3" dir="rtl">${esc(m.details.fa)}</textarea></label><label><span>${t('detEn')}</span><textarea id="te" rows="3" dir="ltr">${esc(m.details.en)}</textarea></label></div>
        <div class="grid2"><label><span>${t('category')}</span><select id="ct">${cats.map((c) => `<option value="${c.id}" ${c.id === m.categoryId ? 'selected' : ''}>${esc(nm(c.name))}</option>`).join('')}</select></label>
          <label><span>${t('status')}</span><select id="ac"><option value="1" ${m.active ? 'selected' : ''}>${t('active')}</option><option value="0" ${m.active ? '' : 'selected'}>${t('draft')}</option></select></label></div>
        <div class="grid2"><label><span>${t('price')}</span><input id="pr" type="number" min="0" value="${m.price}"></label><label><span>${t('compare')}</span><input id="cp" type="number" min="0" value="${m.comparePrice || 0}"></label></div>
        <div class="sizes"><label><span>${t('sizes')}</span></label>${m.sizes.map((s, i) => `<div class="r"><input data-sn="${i}" value="${esc(s.name)}" placeholder="${t('size')}"><input data-ss="${i}" type="number" min="0" value="${s.stock}" placeholder="${t('stock')}"><button class="btn danger sm" data-sr="${i}">✕</button></div>`).join('')}<button class="btn sec sm" id="as">+ ${t('addSize')}</button></div>
        <div><label><span>${t('images')}</span></label><div class="imgs">${m.images.map((im, i) => `<div class="it"><img src="/uploads/${encodeURIComponent(im.file)}" alt=""><select data-ik="${i}"><option value="product" ${im.kind === 'product' ? 'selected' : ''}>${t('kindProduct')}</option><option value="model" ${im.kind === 'model' ? 'selected' : ''}>${t('kindModel')}</option></select>
          <div><button class="btn sec sm" data-iu="${i}">↑</button><button class="btn sec sm" data-id="${i}">↓</button><button class="btn danger sm" data-ir="${i}">✕</button></div></div>`).join('')}</div>
          <div style="margin-top:10px;display:flex;gap:8px"><button class="btn sec sm" id="up">${t('upload')}</button><button class="btn sec sm" id="lib">${t('fromLib')}</button><input type="file" id="fi" multiple accept="image/*" hidden></div></div>
        <div class="actions"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
      bind();
    };
    const sync = () => {
      m.name = { fa: $('#nf').value, en: $('#ne').value }; m.description = { fa: $('#df').value, en: $('#de').value }; m.details = { fa: $('#tf').value, en: $('#te').value };
      m.categoryId = Number($('#ct').value); m.active = $('#ac').value === '1'; m.price = Number($('#pr').value); m.comparePrice = Number($('#cp').value);
      document.querySelectorAll('[data-sn]').forEach((e) => (m.sizes[e.dataset.sn].name = e.value));
      document.querySelectorAll('[data-ss]').forEach((e) => (m.sizes[e.dataset.ss].stock = Number(e.value)));
      document.querySelectorAll('[data-ik]').forEach((e) => (m.images[e.dataset.ik].kind = e.value));
    };
    const bind = () => {
      $('#x').onclick = closeModal;
      $('#as').onclick = () => { sync(); m.sizes.push({ name: '', stock: 0 }); draw(); };
      document.querySelectorAll('[data-sr]').forEach((b) => (b.onclick = () => { sync(); m.sizes.splice(b.dataset.sr, 1); draw(); }));
      document.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => { sync(); m.images.splice(b.dataset.ir, 1); draw(); }));
      document.querySelectorAll('[data-iu],[data-id]').forEach((b) => (b.onclick = () => { sync(); const i = +(b.dataset.iu ?? b.dataset.id), j = b.dataset.iu !== undefined ? i - 1 : i + 1; if (m.images[j]) { [m.images[i], m.images[j]] = [m.images[j], m.images[i]]; } draw(); }));
      $('#up').onclick = () => $('#fi').click();
      $('#fi').onchange = async (e) => { sync(); const fd = new FormData(); [...e.target.files].forEach((f) => fd.append('files', f)); try { const r = await api('/files', { method: 'POST', body: fd }); r.uploaded.forEach((f) => m.images.push({ file: f, kind: 'product' })); } catch { toast(t('error')); } draw(); };
      $('#lib').onclick = async () => { sync(); const { files } = await api('/files'); const sel = new Set(); const prev = $('#modal').innerHTML;
        $('#modal').innerHTML = `<div class="sheet"><h1>${t('fromLib')}</h1><div class="lib">${files.map((f) => `<button class="f" data-f="${esc(f.name)}"><img src="${f.url}" alt=""><div>${esc(f.name)}</div></button>`).join('') || t('empty')}</div><div class="actions"><button class="btn sec" id="lx">${t('cancel')}</button><button class="btn" id="lo">${t('done')}</button></div></div>`;
        document.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { const f = b.dataset.f; sel.has(f) ? sel.delete(f) : sel.add(f); b.classList.toggle('sel'); }));
        $('#lx').onclick = draw; $('#lo').onclick = () => { sel.forEach((f) => m.images.push({ file: f, kind: 'product' })); draw(); }; };
      $('#ok').onclick = async () => {
        sync();
        try { await api(p ? `/products/${p.id}` : '/products', { method: p ? 'PUT' : 'POST', body: m }); closeModal(); toast(t('saved')); products(); }
        catch (e) { toast(errMsg(e)); }
      };
    };
    draw();
  }

  // ---------- files ----------
  async function filesPage() {
    const { files, totalSize } = await api('/files');
    $('#main').innerHTML = `<div class="head"><h1>${t('files')}</h1><span>${num(files.length)} · ${t('totalSize')}: ${fmtSize(totalSize)}</span></div>
      <label class="drop" id="drop" style="display:block;cursor:pointer">${t('dropHere')}<input type="file" id="fi" multiple accept="image/*" hidden></label>
      <div class="fgrid">${files.map((f) => `<div class="f"><img src="${f.url}" alt="" loading="lazy"><div><b>${esc(f.name)}</b><span>${fmtSize(f.size)} · ${fmtDate(f.mtime)}</span>
        <span>${f.usedBy.length ? t('usedBy') + ': ' + f.usedBy.map((u) => esc(nm(u.name))).join('، ') : `<i>${t('unused')}</i>`}</span>
        <div class="actions" style="justify-content:flex-start"><button class="btn sec sm" data-c="${esc(f.url)}">${t('copyUrl')}</button><button class="btn danger sm" data-d="${esc(f.name)}" ${f.usedBy.length ? 'disabled' : ''}>${t('del')}</button></div></div></div>`).join('') || t('empty')}</div>`;
    const upload = async (fl) => { const fd = new FormData(); [...fl].forEach((f) => fd.append('files', f)); try { await api('/files', { method: 'POST', body: fd }); toast(t('saved')); } catch { toast(t('error')); } filesPage(); };
    $('#fi').onchange = (e) => upload(e.target.files);
    const dz = $('#drop'); dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over'); dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); upload(e.dataTransfer.files); };
    document.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(location.origin + b.dataset.c).then(() => toast(t('copied'))); }));
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = async () => { if (!confirmDel()) return; try { await api('/files/' + encodeURIComponent(b.dataset.d), { method: 'DELETE' }); toast(t('deleted')); filesPage(); } catch (e) { toast(errMsg(e)); } }));
  }

  // ---------- orders ----------
  async function orders() {
    const list = await api('/orders'), sts = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
    const cls = { new: 'warn', processing: '', shipped: '', delivered: 'ok', cancelled: 'bad' };
    $('#main').innerHTML = `<div class="head"><h1>${t('orders')}</h1></div><div class="scroll"><table><tr><th>#</th><th>${t('date')}</th><th>${t('customer')}</th><th>${t('items')}</th><th>${t('total')}</th><th>${t('status')}</th></tr>
      ${list.map((o) => `<tr><td>${num(o.id)}</td><td>${fmtDate(o.createdAt)}</td><td><b>${esc(o.customer.name)}</b><br><span dir="ltr">${esc(o.customer.phone)}</span><br><small>${esc(o.customer.address)}${o.customer.note ? '<br>— ' + esc(o.customer.note) : ''}</small></td>
        <td>${o.items.map((i) => `${esc(nm(i.name))} (${esc(i.size)}) ×${num(i.qty)}`).join('<br>')}</td><td>${num(o.total)}</td>
        <td><select data-o="${o.id}">${sts.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${t(s)}</option>`).join('')}</select></td></tr>`).join('') || `<tr><td colspan="6">${t('empty')}</td></tr>`}</table></div>`;
    document.querySelectorAll('[data-o]').forEach((s) => (s.onchange = async () => { try { await api('/orders/' + s.dataset.o, { method: 'PUT', body: { status: s.value } }); toast(t('saved')); } catch { toast(t('error')); } }));
  }

  api('/me').then(shell).catch(showLogin);
})();
