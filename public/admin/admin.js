(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = {
    fa: {
      username: 'نام کاربری', otpCode: 'کد پیامک‌شده', sendCode: 'ارسال کد', usePassword: 'ورود با رمز عبور', useSms: 'ورود با پیامک', codeSent: 'کد ارسال شد', badCode: 'کد نادرست یا منقضی است', storeLink: 'فروشگاه', more: 'بیشتر', changePwHint: 'لطفا رمز عبور خود را تغییر دهید',
      treeHint: 'دسته‌ها به‌صورت درختی هستند؛ با «زیردسته» یک دسته داخل دسته دیگر بسازید و با فلش‌ها ترتیب را عوض کنید.', subcat: 'زیردسته', parentCat: 'دسته والد', rootCat: 'دسته اصلی',
      payment: 'پرداخت', tracking: 'رهگیری', trackingCode: 'کد رهگیری', trackingHint: 'اگر سفارش ارسال شده باشد، کد رهگیری برای مشتری پیامک می‌شود.', notifyDelay: 'اطلاع تاخیر', confirmDelay: 'پیامک تاخیر ارسال برای مشتری فرستاده شود؟', confirmCancel: 'سفارش لغو شود؟ موجودی به انبار برمی‌گردد و غیرقابل بازگشت است.',
      smsWillSend: 'در صورت فعال بودن قالب پیامک، به مشتری اطلاع داده می‌شود.', smsQueued: 'پیامک در صف ارسال قرار گرفت', sendSms: 'پیامک', message: 'متن پیام', send: 'ارسال', chars: 'نویسه', smsParts: 'پیامک', view: 'مشاهده', pricePct: 'تغییر قیمت ٪ (مثلا -10)', stockAdd: 'افزودن به موجودی', makeDiscount: 'ایجاد تخفیف',
      st_new: 'ثبت شد', st_confirmed: 'تایید شد', st_processing: 'در حال پردازش', st_shipped: 'ارسال شد', st_out_for_delivery: 'در مسیر تحویل', st_ready_pickup: 'آماده تحویل حضوری', st_delivered: 'تحویل شد', st_cancelled: 'لغو شد', st_return_requested: 'درخواست مرجوعی', st_return_approved: 'مرجوعی تایید شد', st_return_rejected: 'مرجوعی رد شد', st_returned: 'مرجوع شد',
      pay_unpaid: 'پرداخت نشده', pay_paid: 'پرداخت شد', pay_failed: 'ناموفق', pay_refunded: 'بازپرداخت شد', pay_refund_failed: 'بازپرداخت ناموفق',
      e_forbidden: 'دسترسی ندارید', e_parent_cycle: 'نمی‌توان دسته را داخل خودش یا زیرمجموعه‌اش قرار داد', e_too_deep: 'حداکثر ۴ سطح مجاز است', e_bad_parent: 'دسته والد نامعتبر است', e_category_has_children: 'این دسته زیردسته دارد', e_order_cancelled: 'سفارش لغوشده را نمی‌توان تغییر داد', e_bad_status: 'وضعیت نامعتبر', e_bad_payment: 'وضعیت پرداخت نامعتبر',
      e_invalid_phone: 'شماره موبایل نامعتبر است', e_no_recipients: 'گیرنده‌ای برای ارسال وجود ندارد', e_text_required: 'متن پیام الزامی است', e_too_many: 'تعداد درخواست زیاد است؛ بعدا امتحان کنید', e_too_many_recipients: 'حداکثر ۳۰۰۰ گیرنده در هر ارسال', e_bad_code: 'کد نامعتبر است',
      e_username_taken: 'این نام کاربری قبلا ثبت شده', e_bad_username: 'نام کاربری: ۳ تا ۳۰ حرف انگلیسی/عدد', e_weak_password: 'رمز عبور حداقل ۸ نویسه باشد', e_last_owner: 'حداقل یک مالک فعال باید بماند', e_cannot_disable_self: 'نمی‌توانید خودتان را غیرفعال کنید', e_cannot_delete_self: 'نمی‌توانید خودتان را حذف کنید',
      e_cannot_grant_role: 'نمی‌توانید این نقش را بدهید', e_system_role: 'نقش سیستمی قابل تغییر نیست', e_role_in_use: 'این نقش کاربر دارد', e_role_exists: 'این نقش وجود دارد', e_cannot_edit_own_role: 'نقش خودتان را نمی‌توانید ویرایش کنید', e_bad_password: 'رمز فعلی نادرست است',
      e_bad_value: 'مقدار تخفیف نامعتبر است', e_scope_empty: 'محصول یا دسته‌ای انتخاب نشده', e_code_taken: 'این کد قبلا استفاده شده', e_bad_dates: 'تاریخ پایان قبل از شروع است', e_otp_required: 'قالب کد ورود را نمی‌توان غیرفعال کرد', e_customer_exists: 'این مشتری قبلا ثبت شده',
      search: 'جستجوی نام یا کد…', allF: 'همه', noPrice: 'بدون قیمت', clearSel: 'لغو انتخاب', bulkNone: 'هیچ تغییری انتخاب نشده', discard: 'تغییرات ذخیره‌نشده از بین می‌رود. ادامه می‌دهید؟', mainImg: 'تصویر اصلی',
      bulkSel: 'انتخاب‌شده', bulkApply: 'اعمال', bulkKeep: '— بدون تغییر —', bulkPublish: 'فعال', bulkDraft: 'پیش‌نویس', bulkDelete: 'حذف انتخاب‌شده‌ها', bulkDone: 'اعمال شد', badStock: 'موجودی نامعتبر است', stockAll: 'موجودی هر سایز', selectAll: 'انتخاب همه', noPrice: 'قیمت ندارد', title: 'پنل مدیریت آرموا', dashboard: 'داشبورد', products: 'محصولات', categories: 'دسته‌بندی‌ها', files: 'فایل‌ها', orders: 'سفارش‌ها', logout: 'خروج', login: 'ورود', password: 'رمز عبور', badLogin: 'رمز عبور اشتباه است', tooMany: 'تلاش بیش از حد؛ بعداً امتحان کنید',
      variants: 'تنوع و مشخصات', group: 'گروه رنگ‌ها (کلید)', groupHint: 'محصولاتی با کلید یکسان در صفحه محصول به هم لینک می‌شوند', sku: 'کد محصول', colorFa: 'رنگ (فارسی)', colorEn: 'رنگ (انگلیسی)', colorHex: 'کد رنگ', props: 'ویژگی‌ها', propLabelFa: 'عنوان (فا)', propLabelEn: 'عنوان (EN)', propValFa: 'مقدار (فا)', propValEn: 'مقدار (EN)', addProp: 'افزودن ویژگی', menu: 'منو', more: 'بیشتر', allOrders: 'همه',
      revenue: 'درآمد', views: 'بازدید', newOrders: 'سفارش جدید', totalOrders: 'کل سفارش‌ها', lowStock: 'موجودی کم', outStock: 'ناموجود', last14: 'آمار ۱۴ روز اخیر', topProducts: 'پربازدیدترین محصولات', byCategory: 'محصولات به تفکیک دسته', pViews: 'بازدید محصول', carts: 'افزودن به سبد',
      add: 'افزودن', edit: 'ویرایش', del: 'حذف', save: 'ذخیره', cancel: 'انصراف', confirmDel: 'مطمئن هستید؟', saved: 'ذخیره شد', deleted: 'حذف شد', error: 'خطا رخ داد', name: 'نام', nameFa: 'نام (فارسی)', nameEn: 'نام (انگلیسی)', descFa: 'توضیحات (فارسی)', descEn: 'توضیحات (انگلیسی)', detFa: 'مشخصات (فارسی)', detEn: 'مشخصات (انگلیسی)',
      category: 'دسته', price: 'قیمت (تومان)', compare: 'قیمت قبل از تخفیف', status: 'وضعیت', active: 'فعال', draft: 'پیش‌نویس', stock: 'موجودی', sizes: 'سایزها', size: 'سایز', addSize: 'سایز جدید', images: 'تصاویر', upload: 'آپلود تصویر', fromLib: 'انتخاب از فایل‌ها', kindProduct: 'عکس محصول', kindModel: 'عکس مدل', order: 'ترتیب', count: 'تعداد',
      catInUse: 'این دسته محصول دارد.', fileInUse: 'این فایل در یک محصول استفاده شده است.', usedBy: 'استفاده در', unused: 'استفاده نشده', copyUrl: 'کپی لینک', copied: 'کپی شد', dropHere: 'تصاویر را اینجا رها کنید یا کلیک کنید (JPG, PNG, WebP, حداکثر ۱۰MB)', totalSize: 'حجم کل', empty: 'موردی وجود ندارد', done: 'تأیید', pick: 'انتخاب',
      customer: 'مشتری', total: 'جمع', date: 'تاریخ', phone: 'موبایل', address: 'آدرس', items: 'اقلام', new: 'جدید', processing: 'در حال پردازش', shipped: 'ارسال شد', delivered: 'تحویل شد', cancelled: 'لغو شد', currency: 'تومان', lang: 'EN', nameReq: 'نام الزامی است', badPrice: 'قیمت نامعتبر است', badCategory: 'دسته را انتخاب کنید' },
    en: {
      username: 'Username', otpCode: 'SMS code', sendCode: 'Send code', usePassword: 'Log in with password', useSms: 'Log in with SMS', codeSent: 'Code sent', badCode: 'Wrong or expired code', storeLink: 'Store', more: 'More', changePwHint: 'Please change your password',
      treeHint: 'Categories form a tree: use "Sub-category" to nest one under another and the arrows to reorder.', subcat: 'Sub-category', parentCat: 'Parent category', rootCat: 'Top level',
      payment: 'Payment', tracking: 'Tracking', trackingCode: 'Tracking code', trackingHint: 'If the order is already shipped, the customer gets the tracking code by SMS.', notifyDelay: 'Notify delay', confirmDelay: 'Send a shipping-delay SMS to the customer?', confirmCancel: 'Cancel this order? Stock is returned and this cannot be undone.',
      smsWillSend: 'The customer is notified by SMS if the template is enabled.', smsQueued: 'SMS queued', sendSms: 'SMS', message: 'Message', send: 'Send', chars: 'chars', smsParts: 'SMS', view: 'View', pricePct: 'Price change % (e.g. -10)', stockAdd: 'Add to stock', makeDiscount: 'Create discount',
      st_new: 'Placed', st_confirmed: 'Confirmed', st_processing: 'Processing', st_shipped: 'Shipped', st_out_for_delivery: 'Out for delivery', st_ready_pickup: 'Ready for pickup', st_delivered: 'Delivered', st_cancelled: 'Cancelled', st_return_requested: 'Return requested', st_return_approved: 'Return approved', st_return_rejected: 'Return rejected', st_returned: 'Returned',
      pay_unpaid: 'Unpaid', pay_paid: 'Paid', pay_failed: 'Failed', pay_refunded: 'Refunded', pay_refund_failed: 'Refund failed',
      e_forbidden: 'You do not have access', e_parent_cycle: 'A category cannot be moved under itself or its children', e_too_deep: 'At most 4 levels are allowed', e_bad_parent: 'Invalid parent category', e_category_has_children: 'This category has sub-categories', e_order_cancelled: 'A cancelled order cannot be changed', e_bad_status: 'Invalid status', e_bad_payment: 'Invalid payment status',
      e_invalid_phone: 'Invalid mobile number', e_no_recipients: 'No recipients to send to', e_text_required: 'Message text is required', e_too_many: 'Too many requests, try later', e_too_many_recipients: 'At most 3000 recipients per send', e_bad_code: 'Invalid code',
      e_username_taken: 'That username is taken', e_bad_username: 'Username: 3–30 letters/digits', e_weak_password: 'Password must be at least 8 characters', e_last_owner: 'At least one active owner must remain', e_cannot_disable_self: 'You cannot deactivate yourself', e_cannot_delete_self: 'You cannot delete yourself',
      e_cannot_grant_role: 'You cannot grant that role', e_system_role: 'System roles cannot be changed', e_role_in_use: 'This role still has users', e_role_exists: 'That role already exists', e_cannot_edit_own_role: 'You cannot edit your own role', e_bad_password: 'Current password is wrong',
      e_bad_value: 'Invalid discount value', e_scope_empty: 'No products or categories selected', e_code_taken: 'That code is already used', e_bad_dates: 'End date is before the start', e_otp_required: 'The login-code template cannot be disabled', e_customer_exists: 'Customer already exists',
      search: 'Search name or code…', allF: 'All', noPrice: 'No price', clearSel: 'Clear', bulkNone: 'No change selected', discard: 'Unsaved changes will be lost. Continue?', mainImg: 'Main image',
      bulkSel: 'selected', bulkApply: 'Apply', bulkKeep: '— no change —', bulkPublish: 'Active', bulkDraft: 'Draft', bulkDelete: 'Delete selected', bulkDone: 'Applied', badStock: 'Invalid stock', stockAll: 'Stock per size', selectAll: 'Select all', noPrice: 'No price', title: 'Armova Admin', dashboard: 'Dashboard', products: 'Products', categories: 'Categories', files: 'Files', orders: 'Orders', logout: 'Log out', login: 'Log in', password: 'Password', badLogin: 'Wrong password', tooMany: 'Too many attempts, try later',
      variants: 'Variants & properties', group: 'Color group (key)', groupHint: 'Products sharing a key are linked together on the product page', sku: 'Product code', colorFa: 'Color (Farsi)', colorEn: 'Color (English)', colorHex: 'Color hex', props: 'Properties', propLabelFa: 'Label (FA)', propLabelEn: 'Label (EN)', propValFa: 'Value (FA)', propValEn: 'Value (EN)', addProp: 'Add property', menu: 'Menu', more: 'More', allOrders: 'All',
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
    if (r.status === 401 && !path.startsWith('/login') && !path.startsWith('/otp')) { showLogin(); throw new Error('unauthorized'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { code: j.error });
    return j;
  }
  const errMsg = (e) => (D[lang]['e_' + (e && e.code)] || ({ name_required: t('nameReq'), bad_price: t('badPrice'), bad_stock: t('badStock'), bad_category: t('badCategory'), category_in_use: t('catInUse'), file_in_use: t('fileInUse') }[e && e.code]) || t('error'));
  const setLang = () => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; document.title = t('title'); };

  // ---------- session, permissions & extensions ----------
  let session = null; // { user, role, permissions[], all }
  const can = (...need) => !!session && (session.all || need.some((p) => session.permissions.includes(p)));
  const flatTree = (cats, parent = null, depth = 0) => cats.filter((c) => (c.parentId || null) === parent).sort((a, b) => a.order - b.order || a.id - b.id)
    .flatMap((c) => [{ c, depth }, ...flatTree(cats, c.id, depth + 1)]);
  const catOptions = (cats, selected, exclude = new Set(), blank) => (blank ? `<option value="">${blank}</option>` : '') +
    flatTree(cats).filter((x) => !exclude.has(x.c.id)).map(({ c, depth }) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${'  '.repeat(depth)}${depth ? '└ ' : ''}${esc(nm(c.name))}</option>`).join('');
  const st = (s) => t('st_' + s);
  const money = (n) => `${num(n)} ${t('currency')}`;

  // ---------- login & shell ----------
  function showLogin(mode = 'pw') {
    setLang(); session = null;
    const otp = mode === 'otp';
    $('#root').innerHTML = `<form class="login" id="lf"><h1>${t('title')}</h1>
      ${otp ? `<label>${t('phone')}<input id="ph" dir="ltr" inputmode="tel" placeholder="09xxxxxxxxx" required autofocus></label><label id="cw" hidden>${t('otpCode')}<input id="cd" dir="ltr" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>`
        : `<label>${t('username')}<input id="un" value="owner" autocomplete="username" required></label><label>${t('password')}<input type="password" id="pw" autocomplete="current-password" required autofocus></label>`}
      <div id="le" style="color:var(--bad)"></div><button class="btn" id="lb">${otp ? t('sendCode') : t('login')}</button>
      <button type="button" class="lnk" id="sw">${otp ? t('usePassword') : t('useSms')}</button><button type="button" class="lnk" id="lg0">${t('lang')}</button></form>`;
    $('#sw').onclick = () => showLogin(otp ? 'pw' : 'otp');
    $('#lg0').onclick = () => { lang = lang === 'fa' ? 'en' : 'fa'; try { localStorage.setItem('alang', lang); } catch {} showLogin(mode); };
    let sent = false;
    $('#lf').onsubmit = async (e) => {
      e.preventDefault(); $('#le').textContent = '';
      try {
        if (!otp) { session = await api('/login', { method: 'POST', body: { username: $('#un').value, password: $('#pw').value } }); return shell(); }
        if (!sent) { await api('/otp/request', { method: 'POST', body: { phone: $('#ph').value } }); sent = true; $('#cw').hidden = false; $('#cd').focus(); $('#lb').textContent = t('login'); $('#le').textContent = t('codeSent'); $('#le').style.color = 'var(--ok)'; return; }
        session = await api('/otp/verify', { method: 'POST', body: { phone: $('#ph').value, code: $('#cd').value } }); shell();
      } catch (er) { $('#le').style.color = 'var(--bad)'; $('#le').textContent = er.code === 'too_many' ? t('tooMany') : otp ? t('badCode') : t('badLogin'); }
    };
  }
  // pages: key -> { fn, perm: [..any of..], icon }. Core pages first, extensions append more.
  const pages = {
    dashboard: { fn: () => dashboard(), perm: ['stats.view'], icon: '▦' },
    products: { fn: () => products(), perm: ['products.view'], icon: '👕' },
    categories: { fn: () => categories(), perm: ['categories.manage'], icon: '☰' },
    files: { fn: () => filesPage(), perm: ['files.manage'], icon: '🖼' },
    orders: { fn: () => orders(), perm: ['orders.view'], icon: '🧾' },
  };
  const hidden = { account: { fn: () => (window.AdminAccount || (() => Promise.resolve()))(), perm: [] } };
  const allPages = () => ({ ...pages, ...hidden });
  const ORDER = ['dashboard', 'products', 'categories', 'orders', 'discounts', 'customers', 'messages', 'files', 'team', 'settings'];
  const visiblePages = () => Object.keys(pages).filter((k) => !pages[k].perm.length || can(...pages[k].perm)).sort((x, y) => (ORDER.indexOf(x) + 1 || 99) - (ORDER.indexOf(y) + 1 || 99));
  function shell() {
    setLang();
    const keys = visiblePages(), req = location.hash.slice(1).split('/')[0];
    const cur = allPages()[req] && (!allPages()[req].perm.length || can(...allPages()[req].perm)) ? req : keys[0];
    const u = session.user, role = session.role;
    const item = (k, cls = '') => `<a href="#${k}" class="${k === cur ? 'on' : ''} ${cls}"><i>${pages[k].icon}</i><span>${t(k)}</span></a>`;
    const tabs = keys.length > 5 ? keys.slice(0, 4) : keys, more = keys.length > 5 ? keys.slice(4) : [];
    $('#root').innerHTML = `<div class="layout"><nav class="side"><h2>${t('title')}</h2>
      ${keys.map((k) => item(k)).join('')}<div class="sp"></div>
      <a href="#account" class="who ${cur === 'account' ? 'on' : ''}"><b>${esc(u.name)}</b><small>${esc(role ? nm(role.name) : u.role)}</small></a>
      <button id="lg">${t('lang')}</button><a href="/" target="_blank">↗ ${t('storeLink')}</a><button id="lo">${t('logout')}</button></nav>
      <header class="mtop"><b>${t('title')}</b><span><a class="btn sec sm" href="#account">${esc(u.name)}</a><button id="lg2" class="btn sec sm">${t('lang')}</button><a class="btn sec sm" href="/" target="_blank">↗</a><button id="lo2" class="btn sec sm">${t('logout')}</button></span></header>
      <main class="main" id="main"><p class="muted loading">…</p></main>
      <nav class="mtabs" style="--n:${tabs.length + (more.length ? 1 : 0)}">${tabs.map((k) => item(k)).join('')}${more.length ? `<button id="more" class="${more.includes(cur) ? 'on' : ''}"><i>⋯</i><span>${t('more')}</span></button>` : ''}</nav></div>`;
    const toggle = () => { lang = lang === 'fa' ? 'en' : 'fa'; try { localStorage.setItem('alang', lang); } catch {} shell(); };
    const out = async () => { await api('/logout', { method: 'POST' }); showLogin(); };
    $('#lg').onclick = $('#lg2').onclick = toggle; $('#lo').onclick = $('#lo2').onclick = out;
    if (more.length) $('#more').onclick = () => { modal(`<h1>${t('more')}</h1><div class="morelist">${more.map((k) => `<a class="btn sec" href="#${k}">${pages[k].icon} ${t(k)}</a>`).join('')}</div>`); $('#modal').onclick = (e) => { if (e.target.closest('a')) closeModal(true); }; };
    window.scrollTo(0, 0);
    if (session.user.mustChange && cur !== 'account') toast(t('changePwHint'));
    (allPages()[cur].fn)().catch((e) => e.message !== 'unauthorized' && toast(errMsg(e)));
  }
  addEventListener('hashchange', () => $('#main') && session && shell());

  // ---------- modal ----------
  let dirtyFn = null;
  function modal(html, isDirty) {
    const m = $('#modal'); m.innerHTML = `<div class="sheet">${html}</div>`; m.hidden = false; dirtyFn = isDirty || null; document.body.classList.add('lock');
    m.onmousedown = (e) => { if (e.target === m) closeModal(); }; return m;
  }
  function closeModal(force) {
    if (force !== true && dirtyFn && dirtyFn() && !confirm(t('discard'))) return false;
    dirtyFn = null; $('#modal').hidden = true; $('#modal').innerHTML = ''; document.body.classList.remove('lock'); return true;
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
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
  // ---------- categories (tree) ----------
  async function categories() {
    const list = await api('/categories');
    const rows = flatTree(list);
    $('#main').innerHTML = `<div class="head"><h1>${t('categories')} <small class="muted">(${num(list.length)})</small></h1><button class="btn" id="add">+ ${t('add')}</button></div>
      <p class="muted hint">${t('treeHint')}</p>
      <div class="tree">${rows.map(({ c, depth }) => `<div class="trow" style="--d:${depth}"><div class="tname"><span class="tline">${depth ? '└' : '●'}</span><div><b>${esc(nm(c.name))}</b><small class="muted"> ${esc(lang === 'fa' ? c.name.en : c.name.fa)} · /${esc(c.slug)}</small></div></div>
        <div class="tcount"><span class="pill">${num(c.count)}</span>${c.children ? `<span class="pill" title="${t('total')}">Σ ${num(c.total)}</span>` : ''}</div>
        <div class="actions"><button class="btn sec sm" data-mv="${c.id}:up" aria-label="up">↑</button><button class="btn sec sm" data-mv="${c.id}:down" aria-label="down">↓</button><button class="btn sec sm" data-sub="${c.id}">+ ${t('subcat')}</button><button class="btn sec sm" data-e="${c.id}">${t('edit')}</button><button class="btn danger sm" data-d="${c.id}">${t('del')}</button></div></div>`).join('') || `<p class="emptyrow">${t('empty')}</p>`}</div>`;
    const form = (c = { name: {}, parentId: null }) => {
      const exclude = new Set(); if (c.id) { const walk = (id) => { exclude.add(id); list.filter((x) => x.parentId === id).forEach((x) => walk(x.id)); }; walk(c.id); }
      modal(`<h1>${c.id ? t('edit') : t('add')}</h1><div class="grid2"><label><span>${t('nameFa')}</span><input id="cf" dir="rtl" value="${esc(c.name.fa)}"></label><label><span>${t('nameEn')}</span><input id="ce" dir="ltr" value="${esc(c.name.en)}"></label></div>
        <label><span>${t('parentCat')}</span><select id="cp">${catOptions(list, c.parentId, exclude, '— ' + t('rootCat') + ' —')}</select></label>
        <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
      $('#x').onclick = () => closeModal(); $('#cf').focus();
      $('#ok').onclick = async () => {
        const body = { name: { fa: $('#cf').value, en: $('#ce').value }, parentId: $('#cp').value ? Number($('#cp').value) : null };
        try { await api(c.id ? `/categories/${c.id}` : '/categories', { method: c.id ? 'PUT' : 'POST', body }); closeModal(true); toast(t('saved')); categories(); } catch (e) { toast(errMsg(e)); }
      };
    };
    $('#add').onclick = () => form();
    $('.tree').onclick = async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.e) form(list.find((c) => c.id == b.dataset.e));
      else if (b.dataset.sub) form({ name: {}, parentId: Number(b.dataset.sub) });
      else if (b.dataset.mv) { const [id, dir] = b.dataset.mv.split(':'); try { await api(`/categories/${id}/move`, { method: 'POST', body: { direction: dir } }); categories(); } catch (er) { toast(errMsg(er)); } }
      else if (b.dataset.d) { if (!confirmDel()) return; try { await api('/categories/' + b.dataset.d, { method: 'DELETE' }); toast(t('deleted')); categories(); } catch (er) { toast(errMsg(er)); } }
    };
  }

  // ---------- products ----------
  const pf = { q: '', cat: '', st: '' };
  async function products() {
    const [list, cats] = await Promise.all([api('/products'), api('/categories')]);
    const catName = (id) => { const c = cats.find((x) => x.id === id); if (!c) return ''; const path = []; let n = c, g = 0; while (n && g++ < 6) { path.unshift(nm(n.name)); n = cats.find((x) => x.id === n.parentId); } return path.join(' › '); };
    const canEdit = can('products.edit'), canBulk = can('products.bulk', 'products.edit'), canDel = can('products.delete');
    const sel = new Set();
    const stockOf = (p) => p.sizes.reduce((a, s) => a + s.stock, 0);
    $('#main').innerHTML = `<div class="head"><h1>${t('products')} <small class="muted" id="pcount"></small></h1><button class="btn" id="add">+ ${t('add')}</button></div>
      <div class="filters"><input id="fq" type="search" placeholder="${t('search')}" value="${esc(pf.q)}">
        <select id="fc">${catOptions(cats, Number(pf.cat) || null, new Set(), t('category') + ': ' + t('allF'))}</select>
        <select id="fs">${[['', t('allF')], ['active', t('active')], ['draft', t('draft')], ['noprice', t('noPrice')], ['out', t('outStock')]].map(([v, l]) => `<option value="${v}" ${pf.st === v ? 'selected' : ''}>${t('status')}: ${l}</option>`).join('')}</select></div>
      <div id="bulk" class="bulkbar" hidden>
        <div class="bhead"><b><span id="bc">0</span> ${t('bulkSel')}</b><button class="btn sec sm" id="bclr">${t('clearSel')}</button></div>
        <select id="ba"><option value="">${t('status')}: ${t('bulkKeep')}</option><option value="1">${t('bulkPublish')}</option><option value="0">${t('bulkDraft')}</option></select>
        <select id="bcat">${catOptions(cats, null, new Set(), t('category') + ': ' + t('bulkKeep'))}</select>
        <input id="bp" type="number" min="0" inputmode="numeric" placeholder="${t('price')}"><input id="bs" type="number" min="0" inputmode="numeric" placeholder="${t('stockAll')}"><input id="bpct" type="number" step="1" inputmode="numeric" placeholder="${t('pricePct')}"><input id="bsa" type="number" step="1" inputmode="numeric" placeholder="${t('stockAdd')}">
        <div class="bbtns"><button class="btn sm" id="bgo">${t('bulkApply')}</button>${can('discounts.manage') ? `<button class="btn sec sm" id="bdisc">🏷 ${t('makeDiscount')}</button>` : ''}${canDel ? `<button class="btn danger sm" id="bdel">${t('bulkDelete')}</button>` : ''}</div></div>
      <div class="scroll"><table class="rt"><thead><tr><th class="c-sel"><input type="checkbox" id="sa" title="${t('selectAll')}"></th><th></th><th>${t('name')}</th><th>${t('category')}</th><th>${t('price')}</th><th>${t('stock')}</th><th>${t('status')}</th><th>${t('views')}</th><th></th></tr></thead><tbody id="pb"></tbody></table></div>`;
    const view = () => {
      const q = pf.q.trim().toLowerCase();
      return list.filter((p) => (!q || `${p.name.fa} ${p.name.en} ${p.slug} ${p.sku || ''}`.toLowerCase().includes(q)) && (!pf.cat || String(p.categoryId) === String(pf.cat)) &&
        (!pf.st || (pf.st === 'active' ? p.active : pf.st === 'draft' ? !p.active : pf.st === 'noprice' ? !p.price : stockOf(p) === 0)));
    };
    const syncBar = (v) => {
      $('#bc').textContent = num(sel.size); $('#bulk').hidden = !sel.size; document.body.classList.toggle('hasbulk', !!sel.size);
      const all = $('#sa'); all.checked = !!v.length && v.every((p) => sel.has(p.id)); all.indeterminate = !all.checked && v.some((p) => sel.has(p.id));
    };
    const paint = () => {
      const v = view();
      $('#pcount').textContent = `(${num(v.length)}${v.length !== list.length ? ' / ' + num(list.length) : ''})`;
      $('#pb').innerHTML = v.map((p) => {
        const st = stockOf(p);
        return `<tr class="${sel.has(p.id) ? 'on' : ''}"><td class="c-sel"><input type="checkbox" class="bk" value="${p.id}" ${sel.has(p.id) ? 'checked' : ''}></td>
        <td class="c-img">${p.images[0] ? `<img class="thumb" src="/uploads/t/${encodeURIComponent(p.images[0].file)}?w=480" alt="" loading="lazy">` : ''}</td>
        <td class="c-name"><button class="lnk" data-e="${p.id}">${esc(nm(p.name))}</button>${p.color && p.color.hex ? `<i class="dot" style="background:${esc(p.color.hex)}"></i>` : ''}</td><td data-label="${t('category')}">${esc(catName(p.categoryId))}</td>
        <td data-label="${t('price')}"><input class="inl ${p.price ? '' : 'warn'}" type="number" min="0" inputmode="numeric" data-price="${p.id}" value="${p.price || ''}" placeholder="0" ${canEdit ? '' : 'disabled'}></td>
        <td data-label="${t('stock')}"><span class="pill ${st === 0 ? 'bad' : st < 6 ? 'warn' : 'ok'}">${num(st)}</span></td>
        <td data-label="${t('status')}"><label class="sw"><input type="checkbox" data-act="${p.id}" ${p.active ? 'checked' : ''} ${canEdit ? '' : 'disabled'}><i></i><span>${p.active ? t('active') : t('draft')}</span></label></td><td data-label="${t('views')}">${num(p.views)}</td>
        <td class="c-act"><div class="actions"><button class="btn sec sm" data-e="${p.id}">${canEdit ? t('edit') : t('view')}</button>${canDel ? `<button class="btn danger sm" data-d="${p.id}">${t('del')}</button>` : ''}<a class="btn sec sm" target="_blank" href="/product/${encodeURIComponent(p.slug)}">↗</a></div></td></tr>`;
      }).join('') || `<tr><td colspan="9" class="emptyrow">${t('empty')}</td></tr>`;
      syncBar(v);
    };
    paint();
    const reload = (msg) => { toast(msg); products(); };
    const bulk = async (body) => { try { await api('/products/bulk', { method: 'POST', body: { ids: [...sel], ...body } }); reload(t('bulkDone')); } catch (e) { toast(errMsg(e)); } };
    let qt; $('#fq').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { pf.q = e.target.value; paint(); }, 120); };
    $('#fc').onchange = (e) => { pf.cat = e.target.value; paint(); };
    $('#fs').onchange = (e) => { pf.st = e.target.value; paint(); };
    if (canEdit) $('#add').onclick = () => productForm(null, cats); else $('#add').hidden = true;
    if (!canBulk) { $('#bulk').remove(); }
    $('#sa').onchange = (e) => { view().forEach((p) => (e.target.checked ? sel.add(p.id) : sel.delete(p.id))); paint(); };
    $('#bclr').onclick = () => { sel.clear(); paint(); };
    $('#bgo').onclick = () => {
      const body = {};
      if ($('#ba').value) body.active = $('#ba').value === '1';
      if ($('#bcat').value) body.categoryId = Number($('#bcat').value);
      if ($('#bp').value) body.price = Number($('#bp').value);
      if ($('#bs').value) body.stock = Number($('#bs').value);
      if ($('#bpct').value) { body.priceAdjustPct = Number($('#bpct').value); body.roundTo = 1000; }
      if ($('#bsa').value) body.stockAdd = Number($('#bsa').value);
      if (!Object.keys(body).length) return toast(t('bulkNone'));
      bulk(body);
    };
    if ($('#bdel')) $('#bdel').onclick = () => { if (confirmDel()) bulk({ delete: true }); };
    if ($('#bdisc')) $('#bdisc').onclick = () => window.AdminSales && window.AdminSales.fromProducts([...sel], list);
    const pb = $('#pb'), find = (id) => list.find((p) => p.id == id);
    pb.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.classList.contains('bk')) { el.checked ? sel.add(+el.value) : sel.delete(+el.value); el.closest('tr').classList.toggle('on', el.checked); syncBar(view()); }
      else if (el.dataset.price !== undefined) {
        const p = find(el.dataset.price), v = Math.round(Number(el.value));
        if (!(v >= 0) || el.value === '') { el.value = p.price || ''; return; }
        try { await api('/products/bulk', { method: 'POST', body: { ids: [p.id], price: v } }); p.price = v; el.classList.toggle('warn', !v); toast(t('saved')); } catch (er) { el.value = p.price || ''; toast(errMsg(er)); }
      } else if (el.dataset.act !== undefined) {
        const p = find(el.dataset.act);
        try { await api('/products/bulk', { method: 'POST', body: { ids: [p.id], active: el.checked } }); p.active = el.checked; el.parentElement.querySelector('span').textContent = el.checked ? t('active') : t('draft'); toast(t('saved')); } catch (er) { el.checked = p.active; toast(errMsg(er)); }
      }
    });
    pb.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-e],[data-d]'); if (!b) return;
      if (b.dataset.e) productForm(find(b.dataset.e), cats);
      else if (confirmDel()) { await api('/products/' + b.dataset.d, { method: 'DELETE' }); reload(t('deleted')); }
    });
    pb.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.price !== undefined) e.target.blur(); });
  }

  function productForm(p, cats) {
    const m = p ? JSON.parse(JSON.stringify(p)) : { name: {}, description: {}, details: {}, categoryId: (cats[0] || {}).id, price: 0, comparePrice: 0, sizes: [{ name: 'M', stock: 0 }], images: [], active: true, group: '', sku: '', color: null, properties: [] };
    m.properties = m.properties || []; m.color = m.color || { fa: '', en: '', hex: '' };
    const draw = () => {
      modal(`<h1>${p ? t('edit') : t('add')}</h1>
        <div class="grid2"><label><span>${t('nameFa')}</span><input id="nf" dir="rtl" value="${esc(m.name.fa)}"></label><label><span>${t('nameEn')}</span><input id="ne" dir="ltr" value="${esc(m.name.en)}"></label></div>
        <div class="grid2"><label><span>${t('descFa')}</span><textarea id="df" rows="3" dir="rtl">${esc(m.description.fa)}</textarea></label><label><span>${t('descEn')}</span><textarea id="de" rows="3" dir="ltr">${esc(m.description.en)}</textarea></label></div>
        <div class="grid2"><label><span>${t('detFa')}</span><textarea id="tf" rows="3" dir="rtl">${esc(m.details.fa)}</textarea></label><label><span>${t('detEn')}</span><textarea id="te" rows="3" dir="ltr">${esc(m.details.en)}</textarea></label></div>
        <div class="grid2"><label><span>${t('category')}</span><select id="ct">${catOptions(cats, m.categoryId)}</select></label>
          <label><span>${t('status')}</span><select id="ac"><option value="1" ${m.active ? 'selected' : ''}>${t('active')}</option><option value="0" ${m.active ? '' : 'selected'}>${t('draft')}</option></select></label></div>
        <div class="grid2"><label><span>${t('price')}</span><input id="pr" type="number" min="0" value="${m.price}"></label><label><span>${t('compare')}</span><input id="cp" type="number" min="0" value="${m.comparePrice || 0}"></label></div>
        <fieldset class="fs"><legend>${t('variants')}</legend>
          <div class="grid2"><label><span>${t('group')}</span><input id="gp" dir="ltr" value="${esc(m.group)}" placeholder="pocket"><small>${t('groupHint')}</small></label><label><span>${t('sku')}</span><input id="sk" dir="ltr" value="${esc(m.sku)}"></label></div>
          <div class="grid3"><label><span>${t('colorFa')}</span><input id="cfa" dir="rtl" value="${esc(m.color.fa)}"></label><label><span>${t('colorEn')}</span><input id="cen" dir="ltr" value="${esc(m.color.en)}"></label><label><span>${t('colorHex')}</span><input id="chx" type="color" value="${esc(m.color.hex || '#cccccc')}"></label></div>
          <label><span>${t('props')}</span></label>${m.properties.map((r, i) => `<div class="prow"><input data-pk="${i}:fa" dir="rtl" placeholder="${t('propLabelFa')}" value="${esc(r.label.fa)}"><input data-pk="${i}:en" dir="ltr" placeholder="${t('propLabelEn')}" value="${esc(r.label.en)}"><input data-pv="${i}:fa" dir="rtl" placeholder="${t('propValFa')}" value="${esc(r.value.fa)}"><input data-pv="${i}:en" dir="ltr" placeholder="${t('propValEn')}" value="${esc(r.value.en)}"><button class="btn danger sm" data-pr="${i}">✕</button></div>`).join('')}
          <button class="btn sec sm" id="ap">+ ${t('addProp')}</button></fieldset>
        <div class="sizes"><label><span>${t('sizes')}</span></label>${m.sizes.map((s, i) => `<div class="r"><input data-sn="${i}" value="${esc(s.name)}" placeholder="${t('size')}"><input data-ss="${i}" type="number" min="0" value="${s.stock}" placeholder="${t('stock')}"><button class="btn danger sm" data-sr="${i}">✕</button></div>`).join('')}<button class="btn sec sm" id="as">+ ${t('addSize')}</button></div>
        <div><label><span>${t('images')}</span></label><div class="imgs">${m.images.map((im, i) => `<div class="it">${i === 0 ? `<span class="mainb">★ ${t('mainImg')}</span>` : ''}<img src="/uploads/t/${encodeURIComponent(im.file)}?w=480" alt=""><select data-ik="${i}"><option value="product" ${im.kind === 'product' ? 'selected' : ''}>${t('kindProduct')}</option><option value="model" ${im.kind === 'model' ? 'selected' : ''}>${t('kindModel')}</option></select>
          <div><button class="btn sec sm" data-iu="${i}">↑</button><button class="btn sec sm" data-id="${i}">↓</button><button class="btn danger sm" data-ir="${i}">✕</button></div></div>`).join('')}</div>
          <div style="margin-top:10px;display:flex;gap:8px"><button class="btn sec sm" id="up">${t('upload')}</button><button class="btn sec sm" id="lib">${t('fromLib')}</button><input type="file" id="fi" multiple accept="image/*" hidden></div></div>
        <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`, () => $('#nf') && snap() !== init);
      bind();
    };
    const sync = () => {
      m.name = { fa: $('#nf').value, en: $('#ne').value }; m.description = { fa: $('#df').value, en: $('#de').value }; m.details = { fa: $('#tf').value, en: $('#te').value };
      m.categoryId = Number($('#ct').value); m.active = $('#ac').value === '1'; m.price = Number($('#pr').value); m.comparePrice = Number($('#cp').value);
      m.group = $('#gp').value; m.sku = $('#sk').value; m.color = { fa: $('#cfa').value, en: $('#cen').value, hex: ($('#cfa').value || $('#cen').value) ? $('#chx').value : '' };
      document.querySelectorAll('[data-pk],[data-pv]').forEach((e) => { const [i, l] = (e.dataset.pk || e.dataset.pv).split(':'); m.properties[i][e.dataset.pk ? 'label' : 'value'][l] = e.value; });
      document.querySelectorAll('[data-sn]').forEach((e) => (m.sizes[e.dataset.sn].name = e.value));
      document.querySelectorAll('[data-ss]').forEach((e) => (m.sizes[e.dataset.ss].stock = Number(e.value)));
      document.querySelectorAll('[data-ik]').forEach((e) => (m.images[e.dataset.ik].kind = e.value));
    };
    const snap = () => { sync(); return JSON.stringify(m); };
    let init = '';
    const bind = () => {
      $('#ap').onclick = () => { sync(); m.properties.push({ label: { fa: '', en: '' }, value: { fa: '', en: '' } }); draw(); };
      document.querySelectorAll('[data-pr]').forEach((b) => (b.onclick = () => { sync(); m.properties.splice(b.dataset.pr, 1); draw(); }));
      $('#x').onclick = () => closeModal();
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
        try { await api(p ? `/products/${p.id}` : '/products', { method: p ? 'PUT' : 'POST', body: m }); closeModal(true); toast(t('saved')); products(); }
        catch (e) { toast(errMsg(e)); }
      };
    };
    draw(); init = snap();
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
  const ORDER_STATUSES = ['new', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'ready_pickup', 'delivered', 'cancelled', 'return_requested', 'return_approved', 'return_rejected', 'returned'];
  const PAY_STATUSES = ['unpaid', 'paid', 'failed', 'refunded', 'refund_failed'];
  const STATUS_CLS = { new: 'warn', delivered: 'ok', cancelled: 'bad', return_requested: 'warn', returned: 'bad', return_rejected: 'bad' };
  let ofilter = '';
  async function orders() {
    const list = await api('/orders'), cnt = (s) => list.filter((o) => o.status === s).length;
    const canManage = can('orders.manage'), canSms = can('crm.send');
    $('#main').innerHTML = `<div class="head"><h1>${t('orders')} <small class="muted">(${num(list.length)})</small></h1></div>
      <div class="chips scrollx">${[['', t('allOrders'), list.length], ...ORDER_STATUSES.filter((s) => cnt(s) || s === ofilter).map((s) => [s, st(s), cnt(s)])].map(([v, l, n]) => `<button class="chip ${ofilter === v ? 'on' : ''}" data-f="${v}">${l} <b>${num(n)}</b></button>`).join('')}</div>
      <div class="scroll"><table class="rt"><thead><tr><th>#</th><th>${t('customer')}</th><th>${t('items')}</th><th>${t('total')}</th><th>${t('status')}</th><th>${t('payment')}</th><th></th></tr></thead><tbody id="ob"></tbody></table></div>`;
    const paint = () => {
      const v = list.filter((o) => !ofilter || o.status === ofilter);
      $('#ob').innerHTML = v.map((o) => `<tr class="st-${o.status}"><td class="c-name">#${num(o.id)} <small class="muted">${fmtDate(o.createdAt)}</small></td>
        <td data-label="${t('customer')}"><span><b>${esc(o.customer.name)}</b><br><a dir="ltr" href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a><br><small>${esc(o.customer.address)}${o.customer.note ? '<br>— ' + esc(o.customer.note) : ''}</small></span></td>
        <td data-label="${t('items')}"><span>${o.items.map((i) => `${esc(nm(i.name))} (${esc(i.size)}) ×${num(i.qty)}`).join('<br>')}</span></td>
        <td data-label="${t('total')}"><span><b>${num(o.total)}</b> ${t('currency')}${o.discount ? `<br><small class="muted">−${num(o.discount)}${o.coupon ? ' · ' + esc(o.coupon.code) : ''}</small>` : ''}</span></td>
        <td data-label="${t('status')}"><select data-os="${o.id}" ${canManage ? '' : 'disabled'}>${ORDER_STATUSES.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${st(s)}</option>`).join('')}</select></td>
        <td data-label="${t('payment')}"><select data-op="${o.id}" ${canManage ? '' : 'disabled'}>${PAY_STATUSES.map((s) => `<option value="${s}" ${(o.paymentStatus || 'unpaid') === s ? 'selected' : ''}>${t('pay_' + s)}</option>`).join('')}</select></td>
        <td class="c-act"><div class="actions">${o.trackingCode ? `<span class="pill" dir="ltr">${esc(o.trackingCode)}</span>` : ''}
          ${canManage ? `<button class="btn sec sm" data-tr="${o.id}">${t('tracking')}</button><button class="btn sec sm" data-dl="${o.id}">${t('notifyDelay')}</button>` : ''}${canSms && o.customerId ? `<button class="btn sec sm" data-sm="${o.id}">${t('sendSms')}</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="7" class="emptyrow">${t('empty')}</td></tr>`;
    };
    paint();
    const find = (id) => list.find((x) => x.id == id);
    const save = async (o, body, msg) => { try { Object.assign(o, await api('/orders/' + o.id, { method: 'PUT', body })); toast(msg || t('saved')); orders(); } catch (er) { toast(errMsg(er)); paint(); } };
    document.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { ofilter = b.dataset.f; document.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('on', x === b)); paint(); }));
    const ob = $('#ob');
    ob.addEventListener('change', (e) => {
      const el = e.target, o = find(el.dataset.os || el.dataset.op); if (!o) return;
      if (el.dataset.op) return save(o, { paymentStatus: el.value });
      if (el.value === 'shipped') { // ask for the tracking code first
        modal(`<h1>${t('st_shipped')} · #${num(o.id)}</h1><label><span>${t('trackingCode')}</span><input id="tc" dir="ltr" value="${esc(o.trackingCode || '')}" autofocus></label><p class="muted hint">${t('smsWillSend')}</p>
          <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
        $('#x').onclick = () => { closeModal(true); paint(); };
        $('#ok').onclick = () => { const code = $('#tc').value; closeModal(true); save(o, { status: 'shipped', trackingCode: code }); };
        return;
      }
      if (el.value === 'cancelled' && !confirm(t('confirmCancel'))) { el.value = o.status; return; }
      save(o, { status: el.value });
    });
    ob.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tr) { const o = find(b.dataset.tr);
        modal(`<h1>${t('tracking')} · #${num(o.id)}</h1><label><span>${t('trackingCode')}</span><input id="tc" dir="ltr" value="${esc(o.trackingCode || '')}" autofocus></label><p class="muted hint">${t('trackingHint')}</p><div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
        $('#x').onclick = () => closeModal(); $('#ok').onclick = () => { const code = $('#tc').value; closeModal(true); save(o, { trackingCode: code }); }; }
      else if (b.dataset.dl) { if (confirm(t('confirmDelay'))) api(`/orders/${b.dataset.dl}/delay`, { method: 'POST' }).then(() => toast(t('smsQueued'))).catch((er) => toast(errMsg(er))); }
      else if (b.dataset.sm) { const o = find(b.dataset.sm);
        modal(`<h1>${t('sendSms')} · ${esc(o.customer.name)}</h1><label><span>${t('message')}</span><textarea id="mt" rows="4" maxlength="800"></textarea></label><div class="muted hint"><span id="mc">0</span></div>
          <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('send')}</button></div>`);
        $('#mt').oninput = () => ($('#mc').textContent = smsInfo($('#mt').value)); $('#x').onclick = () => closeModal();
        $('#ok').onclick = async () => { try { await api('/messages/send', { method: 'POST', body: { ids: [o.customerId], kind: 'info', text: $('#mt').value, name: 'Order #' + o.id } }); closeModal(true); toast(t('smsQueued')); } catch (er) { toast(errMsg(er)); } }; }
    });
  }
  // characters / SMS parts (Persian uses UCS-2: 70 chars per part, 67 when multipart)
  const smsInfo = (text) => { const n = [...text].length, uni = /[^\x00-\x7f]/.test(text), parts = !n ? 0 : uni ? (n <= 70 ? 1 : Math.ceil(n / 67)) : (n <= 160 ? 1 : Math.ceil(n / 153)); return `${num(n)} ${t('chars')} · ${num(parts)} ${t('smsParts')}`; };

  // ---------- extensions (public/admin/*.js register via window.AdminExt) ----------
  const kit = { $, esc, t, api, toast, modal, closeModal, confirmDel, num, nm, fmtDate, money, can, errMsg, flatTree, catOptions, smsInfo, st, ORDER_STATUSES, get lang() { return lang; }, rerender: () => shell(), get session() { return session; }, setSession: (s) => { session = s; } };
  (window.AdminExt || []).forEach((factory) => {
    const x = factory(kit);
    Object.entries(x.dict || {}).forEach(([l, d]) => Object.assign(D[l], d));
    Object.entries(x.pages || {}).forEach(([k, v]) => (pages[k] = v));
    Object.entries(x.hidden || {}).forEach(([k, v]) => (hidden[k] = v));
  });
  api('/me').then((s) => { session = s; shell(); }).catch(showLogin);
})();
