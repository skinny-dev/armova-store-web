// Admin extension: team (users & roles/permissions), settings and the personal account page.
(window.AdminExt = window.AdminExt || []).push((kit) => {
  const { $, esc, t, api, toast, modal, closeModal, confirmDel, num, nm, fmtDate, can, errMsg } = kit;

  const PERM_FA = {
    'stats.view': 'مشاهده داشبورد و آمار', 'products.view': 'مشاهده محصولات', 'products.edit': 'ایجاد و ویرایش محصول', 'products.bulk': 'ویرایش گروهی محصولات', 'products.delete': 'حذف محصول', 'categories.manage': 'مدیریت دسته‌بندی‌ها', 'files.manage': 'مدیریت فایل‌ها',
    'discounts.manage': 'مدیریت تخفیف و کد تخفیف', 'orders.view': 'مشاهده سفارش‌ها', 'orders.manage': 'تغییر وضعیت سفارش، پرداخت و رهگیری', 'customers.view': 'مشاهده مشتریان', 'customers.manage': 'ویرایش مشتریان، برچسب و رضایت بازاریابی', 'crm.send': 'ارسال پیام و کمپین', 'templates.edit': 'ویرایش قالب‌های پیامک', 'sms.log': 'مشاهده گزارش پیامک',
    'settings.manage': 'تنظیمات (پیامک، پرداخت، هشدارها)', 'users.manage': 'مدیریت کاربران', 'roles.manage': 'مدیریت نقش‌ها و دسترسی‌ها',
  };
  const PERM_EN = {
    'stats.view': 'View dashboard & stats', 'products.view': 'View products', 'products.edit': 'Create & edit products', 'products.bulk': 'Bulk-edit products', 'products.delete': 'Delete products', 'categories.manage': 'Manage categories', 'files.manage': 'Manage files',
    'discounts.manage': 'Manage discounts & coupons', 'orders.view': 'View orders', 'orders.manage': 'Change order status, payment & tracking', 'customers.view': 'View customers', 'customers.manage': 'Edit customers, tags & marketing consent', 'crm.send': 'Send messages & campaigns', 'templates.edit': 'Edit SMS templates', 'sms.log': 'View SMS log',
    'settings.manage': 'Settings (SMS, alerts, checkout)', 'users.manage': 'Manage users', 'roles.manage': 'Manage roles & permissions',
  };
  const dict = {
    fa: {
      team: 'تیم و دسترسی', settings: 'تنظیمات', account: 'حساب من', tUsers: 'کاربران', tRoles: 'نقش‌ها و دسترسی‌ها', uAdd: 'افزودن کاربر', uUsername: 'نام کاربری', uName: 'نام', uPhone: 'موبایل (برای ورود با پیامک)', uRole: 'نقش', uPass: 'رمز عبور', uNewPass: 'رمز جدید (اختیاری)', uGen: 'تولید', uLast: 'آخرین ورود', uActive: 'فعال', uNever: 'هنوز وارد نشده', uMust: 'باید رمز را عوض کند',
      uPassHint: 'حداقل ۸ نویسه. کاربر در اولین ورود باید رمز را تغییر دهد.', rAdd: 'نقش جدید', rKey: 'کلید (انگلیسی)', rUsers: 'کاربر', rAll: 'همه دسترسی‌ها', rLocked: 'نقش مالک همیشه همه دسترسی‌ها را دارد و قابل ویرایش نیست.', rMatrixHint: 'با تیک زدن، دسترسی همان لحظه ذخیره می‌شود. کاربران آن نقش باید دوباره وارد شوند.', rCopy: 'کپی دسترسی‌ها از', rDelete: 'حذف نقش',
      grp_general: 'عمومی', grp_catalog: 'کاتالوگ', grp_sales: 'فروش', grp_crm: 'مشتریان و پیام‌ها', grp_system: 'سیستم', perm: 'دسترسی',
      sSms: 'پیامک (کاوه‌نگار)', sApiKey: 'کلید API', sApiKeyHint: 'از پنل کاوه‌نگار بگیرید. برای امنیت بهتر می‌توانید آن را در متغیر محیطی KAVENEGAR_API_KEY بگذارید.', sApiKeySet: 'ثبت شده', sApiKeyNone: 'ثبت نشده', sClear: 'حذف کلید', sSender: 'شماره ارسال‌کننده', sOtpTpl: 'نام قالب تایید (verify/lookup)', sOtpTplHint: 'اختیاری: اگر در کاوه‌نگار قالب OTP ساخته‌اید نامش را بنویسید؛ وگرنه کد با پیامک معمولی ارسال می‌شود.', sEnabled: 'ارسال پیامک فعال', sTestPhone: 'شماره برای ارسال آزمایشی', sTest: 'ارسال پیامک آزمایشی',
      sStore: 'فروشگاه', sStoreName: 'نام فروشگاه در پیامک‌ها', sPublicUrl: 'آدرس سایت (برای لینک در پیامک)', sPromoFooter: 'پانویس پیام‌های تبلیغاتی (مثلا لغو۱۱)', sCheckout: 'پرداخت و ثبت سفارش', sRequireLogin: 'ورود با کد پیامک برای ثبت سفارش الزامی باشد', sRequireLoginHint: 'اگر خاموش باشد مشتری می‌تواند بدون ورود سفارش دهد.',
      sAlerts: 'هشدار به مدیران', sAlertPhones: 'شماره‌های دریافت هشدار (با ویرگول)', sNewOrder: 'سفارش جدید', sLowStock: 'موجودی کم', sLowThreshold: 'حد موجودی کم', sHighValue: 'سفارش پرمبلغ یا مشکوک', sHighThreshold: 'سقف مبلغ سفارش (تومان)', sBigQty: 'تعداد زیاد از یک کالا',
      sAuto: 'اتوماسیون', sAbandoned: 'یادآوری سبد رها‌شده بعد از (ساعت)', sReview: 'درخواست نظر بعد از تحویل (روز)', sAutoHint: 'این پیام‌ها فقط وقتی ارسال می‌شوند که قالبشان در بخش پیام‌ها فعال باشد.',
      aProfile: 'پروفایل', aPassword: 'تغییر رمز عبور', aCurrent: 'رمز فعلی', aNew: 'رمز جدید', aRole: 'نقش من',
    },
    en: {
      team: 'Team & access', settings: 'Settings', account: 'My account', tUsers: 'Users', tRoles: 'Roles & permissions', uAdd: 'Add user', uUsername: 'Username', uName: 'Name', uPhone: 'Mobile (for SMS login)', uRole: 'Role', uPass: 'Password', uNewPass: 'New password (optional)', uGen: 'Generate', uLast: 'Last login', uActive: 'Active', uNever: 'Never logged in', uMust: 'Must change password',
      uPassHint: 'At least 8 characters. The user must change it on first login.', rAdd: 'New role', rKey: 'Key (letters)', rUsers: 'users', rAll: 'All permissions', rLocked: 'The Owner role always has every permission and cannot be edited.', rMatrixHint: 'Ticking saves instantly. Users with that role must log in again.', rCopy: 'Copy permissions from', rDelete: 'Delete role',
      grp_general: 'General', grp_catalog: 'Catalog', grp_sales: 'Sales', grp_crm: 'Customers & messages', grp_system: 'System', perm: 'Permission',
      sSms: 'SMS (Kavenegar)', sApiKey: 'API key', sApiKeyHint: 'Get it from your Kavenegar panel. For better security set it in the KAVENEGAR_API_KEY environment variable instead.', sApiKeySet: 'Set', sApiKeyNone: 'Not set', sClear: 'Remove key', sSender: 'Sender number', sOtpTpl: 'Verify template name (verify/lookup)', sOtpTplHint: 'Optional: if you created an OTP template in Kavenegar, enter its name; otherwise the code is sent as a normal SMS.', sEnabled: 'SMS sending enabled', sTestPhone: 'Mobile number for the test', sTest: 'Send test SMS',
      sStore: 'Store', sStoreName: 'Store name used in SMS', sPublicUrl: 'Website URL (for links in SMS)', sPromoFooter: 'Promotional message footer (e.g. opt-out hint)', sCheckout: 'Checkout', sRequireLogin: 'Require SMS-code login to place an order', sRequireLoginHint: 'When off, customers can order without logging in.',
      sAlerts: 'Admin alerts', sAlertPhones: 'Alert phone numbers (comma separated)', sNewOrder: 'New order', sLowStock: 'Low stock', sLowThreshold: 'Low-stock threshold', sHighValue: 'High-value / suspicious order', sHighThreshold: 'Order amount limit (Toman)', sBigQty: 'Big quantity of one item',
      sAuto: 'Automation', sAbandoned: 'Abandoned-cart reminder after (hours)', sReview: 'Review request after delivery (days)', sAutoHint: 'These messages are only sent when their template is enabled under Messages.',
      aProfile: 'Profile', aPassword: 'Change password', aCurrent: 'Current password', aNew: 'New password', aRole: 'My role',
    },
  };
  const permName = (p) => (kit.lang === 'fa' ? PERM_FA : PERM_EN)[p] || p;
  const gen = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 56]).join('');
  const GROUPS = ['general', 'catalog', 'sales', 'crm', 'system'];

  // ---------- team ----------
  let ttab = 'users';
  async function team() {
    const tabs = [['users', t('tUsers'), can('users.manage')], ['roles', t('tRoles'), can('roles.manage', 'users.manage')]].filter((x) => x[2]);
    if (!tabs.some((x) => x[0] === ttab)) ttab = tabs[0][0];
    $('#main').innerHTML = `<div class="head"><h1>${t('team')}</h1></div><div class="tabs2">${tabs.map(([k, l]) => `<button data-t="${k}" class="${ttab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tb"></div>`;
    document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { ttab = b.dataset.t; team(); }));
    return ttab === 'users' ? usersTab() : rolesTab();
  }

  async function usersTab() {
    const [users, { roles }] = await Promise.all([api('/users'), api('/roles')]);
    const roleName = (k) => { const r = roles.find((x) => x.key === k); return r ? nm(r.name) : k; };
    const me = kit.session.user.id;
    $('#tb').innerHTML = `<div class="head" style="margin-bottom:10px"><span></span><button class="btn" id="add">+ ${t('uAdd')}</button></div>
      <div class="scroll"><table class="rt"><thead><tr><th>${t('uName')}</th><th>${t('uRole')}</th><th>${t('uPhone')}</th><th>${t('uLast')}</th><th>${t('uActive')}</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr><td class="c-name"><b>${esc(u.name)}</b> <small class="muted" dir="ltr">@${esc(u.username)}</small>${u.mustChange ? ` <span class="pill warn">${t('uMust')}</span>` : ''}</td><td data-label="${t('uRole')}"><span class="pill ${u.role === 'owner' ? 'ok' : 'info'}">${esc(roleName(u.role))}</span></td>
        <td data-label="${t('uPhone')}" dir="ltr">${esc(u.phone || '—')}</td><td data-label="${t('uLast')}">${u.lastLoginAt ? fmtDate(u.lastLoginAt) : t('uNever')}</td>
        <td data-label="${t('uActive')}"><label class="sw"><input type="checkbox" data-act="${u.id}" ${u.active ? 'checked' : ''} ${u.id === me ? 'disabled' : ''}><i></i></label></td>
        <td class="c-act"><div class="actions"><button class="btn sec sm" data-e="${u.id}">${t('edit')}</button>${u.id !== me ? `<button class="btn danger sm" data-d="${u.id}">${t('del')}</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`;
    const form = (u) => {
      const m = u || { username: '', name: '', phone: '', role: (roles.find((r) => r.key !== 'owner') || roles[0]).key, password: gen() };
      modal(`<h1>${u ? t('edit') : t('uAdd')}</h1>
        <div class="grid2"><label><span>${t('uUsername')}</span><input id="un" dir="ltr" value="${esc(m.username)}" ${u ? 'disabled' : ''} autocapitalize="none"></label><label><span>${t('uName')}</span><input id="nm" value="${esc(m.name)}"></label></div>
        <div class="grid2"><label><span>${t('uPhone')}</span><input id="ph" dir="ltr" inputmode="tel" value="${esc(m.phone)}" placeholder="09xxxxxxxxx"></label><label><span>${t('uRole')}</span><select id="rl">${roles.map((r) => `<option value="${esc(r.key)}" ${r.key === m.role ? 'selected' : ''}>${esc(nm(r.name))}</option>`).join('')}</select></label></div>
        <label><span>${u ? t('uNewPass') : t('uPass')}</span><div style="display:flex;gap:8px"><input id="pw" dir="ltr" value="${u ? '' : esc(m.password)}" autocomplete="new-password"><button type="button" class="btn sec" id="gn">${t('uGen')}</button></div><small class="muted">${t('uPassHint')}</small></label>
        <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
      $('#gn').onclick = () => ($('#pw').value = gen()); $('#x').onclick = () => closeModal();
      $('#ok').onclick = async () => {
        const body = { name: $('#nm').value, phone: $('#ph').value, role: $('#rl').value, ...($('#pw').value ? { password: $('#pw').value } : {}), ...(!u ? { username: $('#un').value } : {}) };
        try { await api(u ? '/users/' + u.id : '/users', { method: u ? 'PUT' : 'POST', body }); closeModal(true); toast(t('saved')); usersTab(); } catch (e) { toast(errMsg(e)); }
      };
    };
    $('#add').onclick = () => form(null);
    $('#tb').addEventListener('click', async (e) => {
      const b = e.target.closest('button'); if (!b) return;
      try { if (b.dataset.e) form(users.find((u) => u.id == b.dataset.e)); else if (b.dataset.d && confirmDel()) { await api('/users/' + b.dataset.d, { method: 'DELETE' }); toast(t('deleted')); usersTab(); } } catch (er) { toast(errMsg(er)); }
    });
    $('#tb').addEventListener('change', async (e) => {
      const el = e.target; if (el.dataset.act === undefined) return;
      try { await api('/users/' + el.dataset.act, { method: 'PUT', body: { active: el.checked } }); toast(t('saved')); } catch (er) { el.checked = !el.checked; toast(errMsg(er)); }
    });
  }

  async function rolesTab() {
    const { roles, catalog } = await api('/roles'), editable = can('roles.manage');
    const perms = Object.keys(catalog), mine = (p) => kit.session.all || kit.session.permissions.includes(p);
    $('#tb').innerHTML = `<div class="head" style="margin-bottom:6px"><p class="muted hint" style="margin:0">${t('rMatrixHint')}</p>${editable ? `<button class="btn" id="add">+ ${t('rAdd')}</button>` : ''}</div>
      <div class="scroll"><table class="matrix"><thead><tr><th>${t('perm')}</th>${roles.map((r) => `<th class="c"><b>${esc(nm(r.name))}</b><br><small class="muted">${num(r.users)} ${t('rUsers')}</small>${editable && !r.system && !r.users ? `<br><button class="lnk" data-rd="${esc(r.key)}">${t('rDelete')}</button>` : ''}</th>`).join('')}</tr></thead><tbody>
      ${GROUPS.map((g) => `<tr class="grp"><td colspan="${roles.length + 1}">${t('grp_' + g)}</td></tr>` + perms.filter((p) => catalog[p] === g).map((p) => `<tr><td>${esc(permName(p))}<br><small class="muted" dir="ltr">${p}</small></td>${roles.map((r) => {
        const on = r.permissions.includes('*') || r.permissions.includes(p), lock = r.system || !editable || (!mine(p) && !on);
        return `<td class="c"><input type="checkbox" data-r="${esc(r.key)}" data-p="${p}" ${on ? 'checked' : ''} ${lock ? 'disabled' : ''}></td>`; }).join('')}</tr>`).join('')).join('')}</tbody></table></div>
      <p class="muted hint">${t('rLocked')}</p>`;
    if ($('#add')) $('#add').onclick = () => {
      modal(`<h1>${t('rAdd')}</h1><div class="grid2"><label><span>${t('nameFa')}</span><input id="rf" dir="rtl"></label><label><span>${t('nameEn')}</span><input id="re" dir="ltr"></label></div>
        <label><span>${t('rKey')}</span><input id="rk" dir="ltr" autocapitalize="none"></label>
        <label><span>${t('rCopy')}</span><select id="rc"><option value="">—</option>${roles.filter((r) => !r.permissions.includes('*')).map((r) => `<option value="${esc(r.key)}">${esc(nm(r.name))}</option>`).join('')}</select></label>
        <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`);
      $('#x').onclick = () => closeModal();
      $('#ok').onclick = async () => {
        const src = roles.find((r) => r.key === $('#rc').value);
        try { await api('/roles', { method: 'POST', body: { key: $('#rk').value || $('#re').value, name: { fa: $('#rf').value, en: $('#re').value }, permissions: src ? src.permissions : [] } }); closeModal(true); toast(t('saved')); rolesTab(); } catch (e) { toast(errMsg(e)); }
      };
    };
    $('#tb').addEventListener('change', async (e) => {
      const el = e.target; if (!el.dataset.r) return;
      const r = roles.find((x) => x.key === el.dataset.r), next = el.checked ? [...r.permissions, el.dataset.p] : r.permissions.filter((p) => p !== el.dataset.p);
      try { const saved = await api('/roles/' + r.key, { method: 'PUT', body: { permissions: next } }); r.permissions = saved.permissions; toast(t('saved')); } catch (er) { el.checked = !el.checked; toast(errMsg(er)); }
    });
    $('#tb').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-rd]'); if (!b || !confirmDel()) return;
      try { await api('/roles/' + b.dataset.rd, { method: 'DELETE' }); toast(t('deleted')); rolesTab(); } catch (er) { toast(errMsg(er)); }
    });
  }

  // ---------- settings ----------
  async function settings() {
    const s = await api('/settings');
    const sw = (id, label, on, hint = '') => `<label class="switchrow"><span style="color:var(--fg)">${label}${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}></label>`;
    const a = s.alerts;
    $('#main').innerHTML = `<div class="head"><h1>${t('settings')}</h1><button class="btn" id="save">${t('save')}</button></div>
      <h3 style="margin:6px 0 8px">${t('sSms')}</h3>
      <div class="banner ${s.sms.configured ? 'ok' : ''}">${s.sms.configured ? t('liveBanner') : t('devBanner')}</div>
      <div class="grid2"><label><span>${t('sApiKey')} — <b>${s.sms.apiKeyMasked ? t('sApiKeySet') + ' (' + esc(s.sms.apiKeyMasked) + ')' : t('sApiKeyNone')}</b></span><input id="ak" dir="ltr" type="password" autocomplete="off" placeholder="${s.sms.apiKeyMasked ? '••••••••' : ''}" ${s.sms.fromEnv ? 'disabled' : ''}><small class="muted">${t('sApiKeyHint')}</small></label>
        <label><span>${t('sSender')}</span><input id="sd" dir="ltr" value="${esc(s.sms.sender)}" placeholder="10008663"></label></div>
      <label><span>${t('sOtpTpl')}</span><input id="ot" dir="ltr" value="${esc(s.sms.otpTemplate)}"><small class="muted">${t('sOtpTplHint')}</small></label>
      ${sw('se', t('sEnabled'), s.sms.enabled)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><input id="tp" dir="ltr" inputmode="tel" placeholder="${t('sTestPhone')}" style="max-width:260px"><button class="btn sec" id="tst">${t('sTest')}</button>${s.sms.apiKeyMasked && !s.sms.fromEnv ? `<button class="btn danger" id="clr">${t('sClear')}</button>` : ''}</div>
      <h3 style="margin:18px 0 8px">${t('sStore')}</h3>
      <div class="grid2"><label><span>${t('sStoreName')}</span><input id="sn" value="${esc(s.storeName)}" placeholder="آرموا"></label><label><span>${t('sPublicUrl')}</span><input id="pu" dir="ltr" value="${esc(s.publicUrl)}" placeholder="https://armova.example"></label></div>
      <label><span>${t('sPromoFooter')}</span><input id="pf" value="${esc(s.promoFooter)}" placeholder="لغو۱۱"></label>
      <h3 style="margin:18px 0 8px">${t('sCheckout')}</h3>${sw('rl', t('sRequireLogin'), s.checkout.requireLogin, t('sRequireLoginHint'))}
      <h3 style="margin:18px 0 8px">${t('sAlerts')}</h3>
      <label><span>${t('sAlertPhones')}</span><input id="ap" dir="ltr" value="${esc(a.phones.join(', '))}" placeholder="09xxxxxxxxx, 09xxxxxxxxx"></label>
      ${sw('an', t('sNewOrder'), a.newOrder)}${sw('al', t('sLowStock'), a.lowStock)}${sw('ah', t('sHighValue'), a.highValue)}
      <div class="grid3" style="grid-template-columns:1fr 1fr 1fr"><label><span>${t('sLowThreshold')}</span><input id="lt" type="number" min="0" value="${a.lowStockThreshold}"></label><label><span>${t('sHighThreshold')}</span><input id="ht" type="number" min="0" value="${a.highValueThreshold}"></label><label><span>${t('sBigQty')}</span><input id="bq" type="number" min="1" value="${a.bigQty}"></label></div>
      <h3 style="margin:18px 0 8px">${t('sAuto')}</h3><p class="muted hint">${t('sAutoHint')}</p>
      <div class="grid2"><label><span>${t('sAbandoned')}</span><input id="ah2" type="number" min="1" value="${s.automation.abandonedHours}"></label><label><span>${t('sReview')}</span><input id="rv" type="number" min="1" value="${s.automation.reviewDays}"></label></div>`;
    const put = async (body, msg) => { try { await api('/settings', { method: 'PUT', body }); toast(msg || t('saved')); settings(); } catch (e) { toast(errMsg(e)); } };
    $('#save').onclick = () => put({
      sms: { ...($('#ak').value ? { apiKey: $('#ak').value } : {}), sender: $('#sd').value, otpTemplate: $('#ot').value, enabled: $('#se').checked },
      storeName: $('#sn').value, publicUrl: $('#pu').value, promoFooter: $('#pf').value, checkout: { requireLogin: $('#rl').checked },
      alerts: { phones: $('#ap').value, newOrder: $('#an').checked, lowStock: $('#al').checked, highValue: $('#ah').checked, lowStockThreshold: $('#lt').value, highValueThreshold: $('#ht').value, bigQty: $('#bq').value },
      automation: { abandonedHours: $('#ah2').value, reviewDays: $('#rv').value },
    });
    if ($('#clr')) $('#clr').onclick = () => confirmDel() && put({ sms: { clearApiKey: true } });
    $('#tst').onclick = async () => { try { const r = await api('/settings/sms/test', { method: 'POST', body: { phone: $('#tp').value } }); toast(r.ok ? (r.status === 'dev' ? t('devBanner').slice(0, 40) + '…' : t('smsQueued')) : (r.error || t('error'))); } catch (e) { toast(errMsg(e)); } };
  }

  // ---------- account ----------
  async function account() {
    const u = kit.session.user, role = kit.session.role;
    $('#main').innerHTML = `<div class="head"><h1>${t('account')}</h1></div>
      <h3 style="margin:0 0 8px">${t('aProfile')}</h3>
      <div class="grid2"><label><span>${t('uName')}</span><input id="nm" value="${esc(u.name)}"></label><label><span>${t('uPhone')}</span><input id="ph" dir="ltr" inputmode="tel" value="${esc(u.phone)}"></label></div>
      <p class="muted hint">${t('uUsername')}: <b dir="ltr">${esc(u.username)}</b> · ${t('aRole')}: <b>${esc(role ? nm(role.name) : u.role)}</b></p><button class="btn" id="sp">${t('save')}</button>
      <h3 style="margin:24px 0 8px">${t('aPassword')}</h3>${u.mustChange ? `<div class="banner">${t('changePwHint')}</div>` : ''}
      <div class="grid2"><label><span>${t('aCurrent')}</span><input id="cp" type="password" autocomplete="current-password"></label><label><span>${t('aNew')}</span><input id="np" type="password" autocomplete="new-password"></label></div><small class="muted">${t('uPassHint')}</small><p><button class="btn" id="spw">${t('aPassword')}</button></p>`;
    $('#sp').onclick = async () => { try { const x = await api('/account', { method: 'PUT', body: { name: $('#nm').value, phone: $('#ph').value } }); kit.session.user = { ...kit.session.user, ...x }; toast(t('saved')); } catch (e) { toast(errMsg(e)); } };
    $('#spw').onclick = async () => { try { await api('/account/password', { method: 'POST', body: { current: $('#cp').value, next: $('#np').value } }); kit.session.user.mustChange = false; toast(t('saved')); account(); } catch (e) { toast(errMsg(e)); } };
  }
  window.AdminAccount = account;

  return { dict, pages: {
    team: { fn: team, perm: ['users.manage', 'roles.manage'], icon: '🔐' },
    settings: { fn: settings, perm: ['settings.manage'], icon: '⚙' },
  } };
});
