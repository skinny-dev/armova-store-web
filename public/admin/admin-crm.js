// Admin extension: customers (CRM) and messages (templates, campaigns, SMS log).
(window.AdminExt = window.AdminExt || []).push((kit) => {
  const { $, esc, t, api, toast, modal, closeModal, num, nm, fmtDate, can, errMsg, smsInfo, st } = kit;

  const dict = {
    fa: {
      customers: 'مشتریان', messages: 'پیام‌ها', cName: 'نام', cPhone: 'موبایل', cOrders: 'سفارش', cSpent: 'مجموع خرید', cLast: 'آخرین سفارش', cOptIn: 'رضایت بازاریابی', cTags: 'برچسب‌ها', cNotes: 'یادداشت', cAddress: 'آدرس', cBlocked: 'مسدود', cAdd: 'افزودن مشتری', cSearch: 'جستجوی نام، موبایل یا برچسب…',
      segAll: 'همه', segNew: 'بدون خرید', segRepeat: 'مشتری تکراری (۲+ سفارش)', segVip: 'خرید بالا', segInactive: 'غیرفعال (۶۰ روز)', segOptIn: 'موافق بازاریابی', tagAll: 'همه برچسب‌ها', cExport: 'خروجی CSV', cSendAll: 'ارسال پیام به نتیجه فیلتر', cSendSel: 'ارسال پیام', cAddTag: 'افزودن برچسب', cTagPrompt: 'نام برچسب:', cNone: 'مشتری‌ای یافت نشد',
      cTagsHint: 'با ویرگول جدا کنید', cHistory: 'سابقه پیام‌ها', cOrderList: 'سفارش‌ها', cOptInHint: 'پیام‌های تبلیغاتی فقط برای مشتریانی ارسال می‌شود که این گزینه را دارند. پیام‌های سفارش همیشه ارسال می‌شوند.', cSince: 'عضویت', cVerified: 'تایید‌شده با پیامک',
      mCompose: 'ارسال پیام', mKind: 'نوع پیام', mInfo: 'اطلاع‌رسانی', mPromo: 'تبلیغاتی', mText: 'متن پیام', mVars: 'متغیرها', mTemplate: 'از قالب…', mRecipients: 'گیرندگان', mWillSend: 'ارسال می‌شود', mSkipped: 'رد می‌شوند (بدون رضایت/مسدود)', mSendNow: 'ارسال', mCampName: 'نام کمپین', mConfirm: 'پیام برای {n} نفر ارسال شود؟', mStarted: 'ارسال شروع شد',
      mSegment: 'بخش‌بندی مشتریان', mMinOrders: 'حداقل سفارش', mMaxOrders: 'حداکثر سفارش', mMinSpent: 'حداقل خرید (تومان)', mInactive: 'بدون سفارش در N روز اخیر', mOnlyOptIn: 'فقط موافقان بازاریابی',
      tTemplates: 'قالب‌ها', tCampaigns: 'کمپین‌ها', tLog: 'گزارش پیامک', tSave: 'ذخیره', tReset: 'بازنشانی متن', tTest: 'ارسال آزمایشی', tTestPrompt: 'شماره موبایل برای ارسال آزمایشی:', tEnabled: 'فعال', tWhen: 'زمان ارسال', tPreview: 'پیش‌نمایش', tReadOnly: 'فقط مشاهده', tSaved: 'قالب ذخیره شد', tResetAsk: 'متن به حالت پیش‌فرض برگردد؟',
      g_system: 'سیستم', g_order: 'سفارش', g_payment: 'پرداخت', g_shipping: 'ارسال و تحویل', g_returns: 'مرجوعی', g_marketing: 'بازاریابی و تعامل', g_admin: 'هشدار مدیران',
      p_essential: 'ضروری', p_recommended: 'پیشنهادی', p_conditional: 'شرطی', p_optional: 'اختیاری', p_marketing: 'بازاریابی', p_admin: 'مدیر',
      lStatus: 'وضعیت', lType: 'نوع', lTo: 'گیرنده', lText: 'متن', lTime: 'زمان', lAll: 'همه', ls_sent: 'ارسال شد', ls_failed: 'ناموفق', ls_dev: 'آزمایشی (ارسال نشد)', cpTotal: 'کل', cpSent: 'ارسال', cpFailed: 'ناموفق', cpSkipped: 'ردشده', cp_running: 'در حال ارسال…', cp_done: 'تمام شد', cp_error: 'خطا', cpNew: 'کمپین جدید',
      devBanner: 'حالت آزمایشی: کلید API کاوه‌نگار تنظیم نشده و پیامک‌ها واقعا ارسال نمی‌شوند (فقط در گزارش ثبت می‌شوند).', liveBanner: 'اتصال به کاوه‌نگار فعال است.', goSettings: 'تنظیمات',
    },
    en: {
      customers: 'Customers', messages: 'Messages', cName: 'Name', cPhone: 'Mobile', cOrders: 'Orders', cSpent: 'Total spent', cLast: 'Last order', cOptIn: 'Marketing consent', cTags: 'Tags', cNotes: 'Notes', cAddress: 'Address', cBlocked: 'Blocked', cAdd: 'Add customer', cSearch: 'Search name, mobile or tag…',
      segAll: 'All', segNew: 'No purchase yet', segRepeat: 'Repeat (2+ orders)', segVip: 'Big spenders', segInactive: 'Inactive (60 days)', segOptIn: 'Marketing opted-in', tagAll: 'All tags', cExport: 'Export CSV', cSendAll: 'Message everyone in this filter', cSendSel: 'Send message', cAddTag: 'Add tag', cTagPrompt: 'Tag name:', cNone: 'No customers found',
      cTagsHint: 'Separate with commas', cHistory: 'Message history', cOrderList: 'Orders', cOptInHint: 'Promotional messages go only to customers with this on. Order messages are always sent.', cSince: 'Joined', cVerified: 'Verified by SMS',
      mCompose: 'Send message', mKind: 'Message type', mInfo: 'Informational', mPromo: 'Promotional', mText: 'Message', mVars: 'Variables', mTemplate: 'From template…', mRecipients: 'Recipients', mWillSend: 'will receive it', mSkipped: 'skipped (no consent / blocked)', mSendNow: 'Send', mCampName: 'Campaign name', mConfirm: 'Send this message to {n} people?', mStarted: 'Sending started',
      mSegment: 'Customer segment', mMinOrders: 'Min orders', mMaxOrders: 'Max orders', mMinSpent: 'Min spent (Toman)', mInactive: 'No order in the last N days', mOnlyOptIn: 'Opted-in only',
      tTemplates: 'Templates', tCampaigns: 'Campaigns', tLog: 'SMS log', tSave: 'Save', tReset: 'Reset text', tTest: 'Send test', tTestPrompt: 'Mobile number for the test message:', tEnabled: 'Enabled', tWhen: 'When sent', tPreview: 'Preview', tReadOnly: 'Read only', tSaved: 'Template saved', tResetAsk: 'Restore the default text?',
      g_system: 'System', g_order: 'Orders', g_payment: 'Payment', g_shipping: 'Shipping & delivery', g_returns: 'Returns', g_marketing: 'Marketing & engagement', g_admin: 'Admin alerts',
      p_essential: 'Essential', p_recommended: 'Recommended', p_conditional: 'Conditional', p_optional: 'Optional', p_marketing: 'Marketing', p_admin: 'Admin',
      lStatus: 'Status', lType: 'Type', lTo: 'To', lText: 'Text', lTime: 'Time', lAll: 'All', ls_sent: 'Sent', ls_failed: 'Failed', ls_dev: 'Dev (not sent)', cpTotal: 'Total', cpSent: 'Sent', cpFailed: 'Failed', cpSkipped: 'Skipped', cp_running: 'Sending…', cp_done: 'Done', cp_error: 'Error', cpNew: 'New campaign',
      devBanner: 'Dev mode: no Kavenegar API key is set, so SMS are not really sent (they are only recorded in the log).', liveBanner: 'Kavenegar is connected.', goSettings: 'Settings',
    },
  };
  const PCLS = { essential: 'ok', recommended: 'info', conditional: '', optional: '', marketing: 'mk', admin: 'ad' };
  const SEGMENTS = { segAll: {}, segNew: { maxOrders: 0 }, segRepeat: { minOrders: 2 }, segVip: { minSpent: 5000000 }, segInactive: { inactiveDays: 60 }, segOptIn: { optIn: true } };
  const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null)).toString();
  const banner = async () => { try { const s = await api('/settings/status'); return s.smsConfigured ? `<div class="banner ok">${t('liveBanner')}</div>` : `<div class="banner">${t('devBanner')} ${can('settings.manage') ? `<a href="#settings">${t('goSettings')}</a>` : ''}</div>`; } catch { return ''; } };

  // ---------- compose (single / selected / segment) ----------
  async function compose({ ids, filter, title, text = '', kind = 'info', onDone }) {
    let templates = []; try { templates = await api('/templates'); } catch {}
    const f = { ...(filter || {}) }, seg = !!filter;
    const draw = () => {
      modal(`<h1>${esc(title || t('mCompose'))}</h1>
        ${seg ? `<fieldset class="fs"><legend>${t('mSegment')}</legend><div class="grid2"><label><span>${t('mMinOrders')}</span><input id="f1" type="number" min="0" value="${f.minOrders ?? ''}"></label><label><span>${t('mMaxOrders')}</span><input id="f2" type="number" min="0" value="${f.maxOrders ?? ''}"></label>
          <label><span>${t('mMinSpent')}</span><input id="f3" type="number" min="0" value="${f.minSpent ?? ''}"></label><label><span>${t('mInactive')}</span><input id="f4" type="number" min="0" value="${f.inactiveDays ?? ''}"></label></div></fieldset>` : ''}
        <div><label><span>${t('mKind')}</span></label><div class="seg" id="kd"><button type="button" data-v="info" class="${kind === 'info' ? 'on' : ''}">${t('mInfo')}</button><button type="button" data-v="promo" class="${kind === 'promo' ? 'on' : ''}">${t('mPromo')}</button></div></div>
        ${kind === 'promo' ? `<label><span>${t('mCampName')}</span><input id="cn" value="${esc(compose.last || '')}"></label>` : ''}
        <label><span>${t('mText')}</span><textarea id="mt" rows="5" maxlength="800">${esc(text)}</textarea></label>
        <div class="vars">${['name', 'store', 'link'].map((v) => `<button type="button" data-ins="{${v}}">{${v}}</button>`).join('')}${templates.length ? `<select id="tp" style="width:auto"><option value="">${t('mTemplate')}</option>${templates.filter((x) => x.group !== 'admin' && x.key !== 'otp').map((x) => `<option value="${esc(x.key)}">${esc(nm(x.label))}</option>`).join('')}</select>` : ''}</div>
        <div class="muted hint" id="mc"></div><div class="preview" id="pv"></div><div class="muted" id="rc"></div>
        <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('mSendNow')}</button></div>`, () => $('#mt') && $('#mt').value !== text);
      bind();
    };
    const body = () => ({ ...(ids ? { ids } : { filter: { ...f, ...(kind === 'promo' ? { optIn: true } : {}) } }), kind, text: $('#mt').value, name: $('#cn') ? $('#cn').value : '' });
    const syncF = () => { if (!seg) return; f.minOrders = $('#f1').value; f.maxOrders = $('#f2').value; f.minSpent = $('#f3').value; f.inactiveDays = $('#f4').value; };
    const refresh = async () => {
      const v = $('#mt').value; $('#mc').textContent = smsInfo(v);
      $('#pv').textContent = v.replace(/\{name\}/g, 'علی').replace(/\{store\}/g, 'آرموا').replace(/\{link\}/g, 'https://…');
      try { const r = await api('/messages/preview', { method: 'POST', body: body() }); $('#rc').textContent = `${t('mRecipients')}: ${num(r.total)} — ${num(r.willSend)} ${t('mWillSend')}${r.skipped ? ` · ${num(r.skipped)} ${t('mSkipped')}` : ''}`; $('#ok').disabled = !r.willSend; } catch { $('#rc').textContent = ''; }
    };
    const bind = () => {
      document.querySelectorAll('#kd button').forEach((b) => (b.onclick = () => { text = $('#mt').value; syncF(); kind = b.dataset.v; draw(); }));
      document.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => { const a = $('#mt'), s = a.selectionStart; a.value = a.value.slice(0, s) + b.dataset.ins + a.value.slice(a.selectionEnd); a.focus(); a.selectionStart = a.selectionEnd = s + b.dataset.ins.length; refresh(); }));
      if ($('#tp')) $('#tp').onchange = (e) => { const x = templates.find((y) => y.key === e.target.value); if (x) { $('#mt').value = x.text; refresh(); } };
      let tm; const later = () => { clearTimeout(tm); tm = setTimeout(() => { syncF(); refresh(); }, 250); };
      $('#mt').oninput = later; document.querySelectorAll('#f1,#f2,#f3,#f4').forEach((i) => (i.oninput = later));
      $('#x').onclick = () => closeModal();
      $('#ok').onclick = async () => {
        syncF(); const b = body(); if (!b.text.trim()) return toast(errMsg({ code: 'text_required' }));
        const pv = await api('/messages/preview', { method: 'POST', body: b }); if (!confirm(t('mConfirm').replace('{n}', num(pv.willSend)))) return;
        try { const r = await api('/messages/send', { method: 'POST', body: b }); compose.last = b.name; closeModal(true); toast(`${t('mStarted')} (${num(r.total)})`); onDone && onDone(); } catch (e) { toast(errMsg(e)); }
      };
      refresh();
    };
    draw();
  }

  // ---------- customers ----------
  const cf = { q: '', seg: 'segAll', tag: '', minSpent: '' };
  async function customers() {
    const params = () => ({ q: cf.q, tag: cf.tag, ...SEGMENTS[cf.seg] });
    const sel = new Set(); let data = await api('/customers?' + qs(params()));
    const canManage = can('customers.manage'), canSend = can('crm.send');
    $('#main').innerHTML = `<div class="head"><h1>${t('customers')} <small class="muted" id="cc"></small></h1><div class="actions">${canManage ? `<button class="btn" id="add">+ ${t('cAdd')}</button>` : ''}<a class="btn sec" id="ex" href="#">⬇ ${t('cExport')}</a></div></div>
      <div class="filters" style="grid-template-columns:2fr 1fr 1fr"><input id="fq" type="search" placeholder="${t('cSearch')}" value="${esc(cf.q)}"><select id="fs">${Object.keys(SEGMENTS).map((k) => `<option value="${k}" ${cf.seg === k ? 'selected' : ''}>${t(k)}</option>`).join('')}</select><select id="ft"></select></div>
      <div id="bulk" class="bulkbar" hidden><div class="bhead"><b><span id="bc">0</span> ${t('bulkSel')}</b><button class="btn sec sm" id="bclr">${t('clearSel')}</button></div><div class="bbtns">${canSend ? `<button class="btn sm" id="bsend">✉ ${t('cSendSel')}</button>` : ''}${canManage ? `<button class="btn sec sm" id="btag">${t('cAddTag')}</button><button class="btn sec sm" id="bopt">${t('cOptIn')} ✓</button>` : ''}</div></div>
      ${canSend ? `<p><button class="btn sec sm" id="sall">✉ ${t('cSendAll')}</button></p>` : ''}
      <div class="scroll"><table class="rt"><thead><tr><th class="c-sel"><input type="checkbox" id="sa"></th><th>${t('cName')}</th><th>${t('cOrders')}</th><th>${t('cSpent')}</th><th>${t('cLast')}</th><th>${t('cOptIn')}</th><th>${t('cTags')}</th><th></th></tr></thead><tbody id="cb"></tbody></table></div>`;
    const find = (id) => data.customers.find((c) => c.id == id);
    const syncBar = () => { $('#bc').textContent = num(sel.size); $('#bulk').hidden = !sel.size; document.body.classList.toggle('hasbulk', !!sel.size); const a = $('#sa'); a.checked = !!data.customers.length && data.customers.every((c) => sel.has(c.id)); a.indeterminate = !a.checked && data.customers.some((c) => sel.has(c.id)); };
    const paint = () => {
      $('#cc').textContent = `(${num(data.customers.length)})`;
      $('#ft').innerHTML = `<option value="">${t('tagAll')}</option>` + data.tags.map((g) => `<option ${cf.tag === g ? 'selected' : ''}>${esc(g)}</option>`).join('');
      $('#ex').href = '/api/admin/customers/export?' + qs(params());
      $('#cb').innerHTML = data.customers.map((c) => `<tr class="${sel.has(c.id) ? 'on' : ''}"><td class="c-sel"><input type="checkbox" class="bk" value="${c.id}" ${sel.has(c.id) ? 'checked' : ''}></td>
        <td class="c-name"><button class="lnk2" data-o="${c.id}"><b>${esc(c.name || '—')}</b></button> <small class="muted" dir="ltr">${esc(c.phone)}</small>${c.blocked ? ` <span class="pill bad">${t('cBlocked')}</span>` : ''}</td>
        <td data-label="${t('cOrders')}">${num(c.orders)}</td><td data-label="${t('cSpent')}">${num(c.spent)}</td><td data-label="${t('cLast')}">${c.lastOrderAt ? fmtDate(c.lastOrderAt) : '—'}</td>
        <td data-label="${t('cOptIn')}"><span class="pill ${c.marketingOptIn ? 'ok' : ''}">${c.marketingOptIn ? '✓' : '—'}</span></td><td data-label="${t('cTags')}"><span>${(c.tags || []).map((g) => `<span class="pill">${esc(g)}</span>`).join(' ') || '—'}</span></td>
        <td class="c-act"><div class="actions"><button class="btn sec sm" data-o="${c.id}">${t('edit')}</button>${canSend ? `<button class="btn sec sm" data-s="${c.id}">✉</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="8" class="emptyrow">${t('cNone')}</td></tr>`;
      syncBar();
    };
    paint();
    const reload = async () => { data = await api('/customers?' + qs(params())); [...sel].forEach((id) => !find(id) && sel.delete(id)); paint(); };
    let qt; $('#fq').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { cf.q = e.target.value; reload(); }, 250); };
    $('#fs').onchange = (e) => { cf.seg = e.target.value; reload(); }; $('#ft').onchange = (e) => { cf.tag = e.target.value; reload(); };
    $('#sa').onchange = (e) => { data.customers.forEach((c) => (e.target.checked ? sel.add(c.id) : sel.delete(c.id))); paint(); };
    $('#bclr').onclick = () => { sel.clear(); paint(); };
    if ($('#add')) $('#add').onclick = () => detail(null, reload);
    if ($('#sall')) $('#sall').onclick = () => compose({ filter: params(), title: `${t('cSendAll')} (${num(data.customers.length)})`, kind: 'promo' });
    if ($('#bsend')) $('#bsend').onclick = () => compose({ ids: [...sel], title: `${t('cSendSel')} (${num(sel.size)})` });
    if ($('#btag')) $('#btag').onclick = async () => { const tag = prompt(t('cTagPrompt')); if (!tag) return; try { await api('/customers/bulk', { method: 'POST', body: { ids: [...sel], addTags: [tag] } }); toast(t('saved')); reload(); } catch (e) { toast(errMsg(e)); } };
    if ($('#bopt')) $('#bopt').onclick = async () => { try { await api('/customers/bulk', { method: 'POST', body: { ids: [...sel], marketingOptIn: true } }); toast(t('saved')); reload(); } catch (e) { toast(errMsg(e)); } };
    $('#cb').addEventListener('change', (e) => { const el = e.target; if (!el.classList.contains('bk')) return; el.checked ? sel.add(+el.value) : sel.delete(+el.value); el.closest('tr').classList.toggle('on', el.checked); syncBar(); });
    $('#cb').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.o) detail(find(b.dataset.o), reload); else if (b.dataset.s) { const c = find(b.dataset.s); compose({ ids: [c.id], title: `${t('cSendSel')} · ${c.name || c.phone}` }); } });
  }

  async function detail(c, done) {
    const full = c ? await api('/customers/' + c.id) : { customer: { name: '', phone: '', address: '', notes: '', tags: [], marketingOptIn: false, orders: 0, spent: 0 }, orders: [], messages: [] };
    const m = full.customer, canManage = can('customers.manage'), ro = canManage ? '' : 'disabled';
    modal(`<h1>${c ? esc(m.name || m.phone) : t('cAdd')}</h1>
      ${c ? `<dl class="kv"><dt>${t('cOrders')}</dt><dd>${num(m.orders)} · ${num(m.spent)} ${t('currency')}</dd><dt>${t('cSince')}</dt><dd>${fmtDate(m.createdAt)}${m.verified ? ' · ' + t('cVerified') : ''}</dd></dl>` : ''}
      <div class="grid2"><label><span>${t('cName')}</span><input id="n" value="${esc(m.name)}" ${ro}></label><label><span>${t('cPhone')}</span><input id="p" dir="ltr" value="${esc(m.phone)}" ${c ? 'disabled' : ''} placeholder="09xxxxxxxxx"></label></div>
      <label><span>${t('cAddress')}</span><textarea id="a" rows="2" ${ro}>${esc(m.address)}</textarea></label>
      <label><span>${t('cTags')} <small>(${t('cTagsHint')})</small></span><input id="g" value="${esc((m.tags || []).join(', '))}" ${ro}></label>
      <label><span>${t('cNotes')}</span><textarea id="nt" rows="2" ${ro}>${esc(m.notes)}</textarea></label>
      <label class="switchrow"><span style="color:var(--fg)">${t('cOptIn')}<small>${t('cOptInHint')}</small></span><input type="checkbox" id="o" ${m.marketingOptIn ? 'checked' : ''} ${ro}></label>
      ${c ? `<label class="switchrow"><span style="color:var(--fg)">${t('cBlocked')}</span><input type="checkbox" id="b" ${m.blocked ? 'checked' : ''} ${ro}></label>
        <h3>${t('cOrderList')}</h3>${full.orders.map((o) => `<div class="switchrow"><span>#${num(o.id)} · ${fmtDate(o.createdAt)}<small>${num(o.total)} ${t('currency')}</small></span><span class="pill">${st(o.status)}</span></div>`).join('') || `<p class="muted">—</p>`}
        ${full.messages.length ? `<h3>${t('cHistory')}</h3>${full.messages.map((x) => `<div class="switchrow"><span><small>${fmtDate(x.at)} · ${esc(x.type || '')}</small>${esc((x.text || '').slice(0, 140))}</span><span class="pill ${x.status === 'sent' ? 'ok' : x.status === 'failed' ? 'bad' : ''}">${t('ls_' + x.status)}</span></div>`).join('')}` : ''}` : ''}
      <div class="actions sticky"><button class="btn sec" id="x">${canManage ? t('cancel') : t('done')}</button>${canManage ? `<button class="btn" id="ok">${t('save')}</button>` : ''}</div>`);
    $('#x').onclick = () => closeModal(true);
    if ($('#ok')) $('#ok').onclick = async () => {
      const body = { name: $('#n').value, address: $('#a').value, tags: $('#g').value, notes: $('#nt').value, marketingOptIn: $('#o').checked, ...($('#b') ? { blocked: $('#b').checked } : {}), ...(!c ? { phone: $('#p').value } : {}) };
      try { await api(c ? '/customers/' + c.id : '/customers', { method: c ? 'PUT' : 'POST', body }); closeModal(true); toast(t('saved')); done && done(); } catch (e) { toast(errMsg(e)); }
    };
  }

  // ---------- messages: templates / campaigns / log ----------
  let mtab = 'tpl';
  async function messages() {
    const tabs = [['tpl', t('tTemplates'), can('templates.edit', 'crm.send', 'sms.log')], ['cmp', t('tCampaigns'), can('crm.send', 'sms.log')], ['log', t('tLog'), can('sms.log')]].filter((x) => x[2]);
    if (!tabs.some((x) => x[0] === mtab)) mtab = tabs[0][0];
    $('#main').innerHTML = `<div class="head"><h1>${t('messages')}</h1>${can('crm.send') ? `<button class="btn" id="new">✉ ${t('cpNew')}</button>` : ''}</div><div id="bn"></div>
      <div class="tabs2">${tabs.map(([k, l]) => `<button data-t="${k}" class="${mtab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="mb"></div>`;
    $('#bn').innerHTML = await banner();
    document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { mtab = b.dataset.t; messages(); }));
    if ($('#new')) $('#new').onclick = () => compose({ filter: { optIn: true }, kind: 'promo', title: t('cpNew'), onDone: () => { mtab = 'cmp'; messages(); } });
    ({ tpl: templatesTab, cmp: campaignsTab, log: logTab })[mtab]();
  }

  async function templatesTab() {
    const list = await api('/templates'), editable = can('templates.edit'), groups = ['system', 'order', 'payment', 'shipping', 'returns', 'marketing', 'admin'];
    const sample = { name: 'علی', orderId: '۱۲۳', total: '۱٬۲۵۰٬۰۰۰', tracking: '123456789', code: '123456', store: 'آرموا', product: 'بلوز شال‌دار', size: 'M', link: 'https://…', customer: 'علی ۰۹۱۲…', reason: 'مبلغ بالا', stock: '۲', discount: '۲۰٪', endsAt: '۱۴۰۵/۰۸/۳۰' };
    const preview = (text) => { const val = (k) => sample[k] ?? ''; return text.split('\n').filter((l) => [...l.matchAll(/\{(\w+)\}/g)].every((m) => val(m[1]) !== '')).map((l) => l.replace(/\{(\w+)\}/g, (_, k) => val(k))).join('\n'); };
    $('#mb').innerHTML = groups.map((g) => { const items = list.filter((x) => x.group === g); return items.length ? `<h3 style="margin:16px 0 8px">${t('g_' + g)}</h3>` + items.map((x) => `<div class="tpl ${x.enabled ? '' : 'off'}" data-k="${x.key}">
        <h4>${esc(nm(x.label))} <span class="pill ${PCLS[x.priority]}">${t('p_' + x.priority)}</span><label class="sw" style="margin-inline-start:auto"><input type="checkbox" class="en" ${x.enabled ? 'checked' : ''} ${editable ? '' : 'disabled'}><i></i><span>${t('tEnabled')}</span></label></h4>
        <small class="muted">${t('tWhen')}: ${esc(nm(x.when))}</small>
        <textarea rows="3" maxlength="600" ${editable ? '' : 'disabled'}>${esc(x.text)}</textarea>
        <div class="vars">${x.vars.map((v) => `<button type="button" data-ins="{${v}}" ${editable ? '' : 'disabled'}>{${v}}</button>`).join('')}</div>
        <div class="muted hint"><span class="inf">${smsInfo(x.text)}</span></div><div class="preview">${esc(preview(x.text))}</div>
        ${editable ? `<div class="actions" style="justify-content:flex-start"><button class="btn sm sv">${t('tSave')}</button><button class="btn sec sm ts">${t('tTest')}</button><button class="btn sec sm rs">${t('tReset')}</button></div>` : `<small class="muted">${t('tReadOnly')}</small>`}</div>`).join('') : ''; }).join('');
    $('#mb').addEventListener('input', (e) => { const card = e.target.closest('.tpl'); if (!card || e.target.tagName !== 'TEXTAREA') return; card.querySelector('.inf').textContent = smsInfo(e.target.value); card.querySelector('.preview').textContent = preview(e.target.value); });
    $('#mb').addEventListener('click', async (e) => {
      const card = e.target.closest('.tpl'), b = e.target.closest('button'); if (!card || !b) return;
      const key = card.dataset.k, ta = card.querySelector('textarea');
      try {
        if (b.dataset.ins) { const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + b.dataset.ins + ta.value.slice(ta.selectionEnd); ta.focus(); ta.selectionStart = ta.selectionEnd = s + b.dataset.ins.length; ta.dispatchEvent(new Event('input', { bubbles: true })); }
        else if (b.classList.contains('sv')) { await api('/templates/' + key, { method: 'PUT', body: { text: ta.value, enabled: card.querySelector('.en').checked } }); toast(t('tSaved')); }
        else if (b.classList.contains('rs')) { if (!confirm(t('tResetAsk'))) return; await api(`/templates/${key}/reset`, { method: 'POST' }); templatesTab(); }
        else if (b.classList.contains('ts')) { const phone = prompt(t('tTestPrompt')); if (!phone) return; const r = await api(`/templates/${key}/test`, { method: 'POST', body: { phone } }); toast(r.ok ? t('smsQueued') : t('error')); }
      } catch (er) { toast(errMsg(er)); }
    });
    $('#mb').addEventListener('change', async (e) => {
      if (!e.target.classList.contains('en')) return; const card = e.target.closest('.tpl');
      try { await api('/templates/' + card.dataset.k, { method: 'PUT', body: { enabled: e.target.checked } }); card.classList.toggle('off', !e.target.checked); toast(t('tSaved')); } catch (er) { e.target.checked = !e.target.checked; toast(errMsg(er)); }
    });
  }

  async function campaignsTab() {
    const list = await api('/campaigns');
    $('#mb').innerHTML = `<div class="scroll"><table class="rt"><thead><tr><th>${t('name')}</th><th>${t('lTime')}</th><th>${t('cpTotal')}</th><th>${t('cpSent')}</th><th>${t('cpFailed')}</th><th>${t('cpSkipped')}</th><th>${t('status')}</th></tr></thead><tbody>
      ${list.map((c) => `<tr><td class="c-name"><b>${esc(c.name)}</b> <span class="pill ${c.kind === 'promo' ? 'mk' : ''}">${t(c.kind === 'promo' ? 'mPromo' : 'mInfo')}</span><br><small class="muted">${esc((c.text || '').slice(0, 90))}</small></td><td data-label="${t('lTime')}">${fmtDate(c.createdAt)}</td>
        <td data-label="${t('cpTotal')}">${num(c.total)}</td><td data-label="${t('cpSent')}">${num(c.sent)}</td><td data-label="${t('cpFailed')}">${num(c.failed)}</td><td data-label="${t('cpSkipped')}">${num(c.skipped)}</td><td data-label="${t('status')}"><span class="pill ${c.status === 'done' ? 'ok' : c.status === 'error' ? 'bad' : 'warn'}">${t('cp_' + c.status)}</span></td></tr>`).join('') || `<tr><td colspan="7" class="emptyrow">${t('empty')}</td></tr>`}</tbody></table></div>`;
    if (list.some((c) => c.status === 'running')) { clearTimeout(campaignsTab.t); campaignsTab.t = setTimeout(() => { if (location.hash === '#messages' && mtab === 'cmp' && $('#mb')) campaignsTab(); }, 3000); }
  }

  async function logTab() {
    const f = { status: '', q: '' };
    $('#mb').innerHTML = `<div class="filters" style="grid-template-columns:2fr 1fr"><input id="lq" type="search" placeholder="${t('lTo')} / ${t('lText')}"><select id="ls"><option value="">${t('lStatus')}: ${t('lAll')}</option>${['sent', 'failed', 'dev'].map((s) => `<option value="${s}">${t('ls_' + s)}</option>`).join('')}</select></div>
      <div class="scroll"><table class="rt"><thead><tr><th>${t('lTime')}</th><th>${t('lTo')}</th><th>${t('lType')}</th><th>${t('lText')}</th><th>${t('lStatus')}</th></tr></thead><tbody id="lb"></tbody></table></div>`;
    const load = async () => {
      const list = await api('/messages/log?' + qs({ q: f.q, status: f.status, limit: 300 }));
      $('#lb').innerHTML = list.map((m) => `<tr><td class="c-name"><small>${fmtDate(m.at)}</small></td><td data-label="${t('lTo')}" dir="ltr">${esc(m.to)}</td><td data-label="${t('lType')}"><span class="pill">${esc(m.type || '')}</span></td><td data-label="${t('lText')}"><span style="white-space:pre-line;text-align:start">${esc(m.text)}${m.error ? `<br><small style="color:var(--bad)">${esc(m.error)}</small>` : ''}</span></td>
        <td data-label="${t('lStatus')}"><span class="pill ${m.status === 'sent' ? 'ok' : m.status === 'failed' ? 'bad' : ''}">${t('ls_' + m.status)}</span></td></tr>`).join('') || `<tr><td colspan="5" class="emptyrow">${t('empty')}</td></tr>`;
    };
    let qt; $('#lq').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { f.q = e.target.value; load(); }, 250); }; $('#ls').onchange = (e) => { f.status = e.target.value; load(); };
    load();
  }

  return { dict, pages: {
    customers: { fn: customers, perm: ['customers.view'], icon: '👥' },
    messages: { fn: messages, perm: ['templates.edit', 'crm.send', 'sms.log'], icon: '✉' },
  } };
});
