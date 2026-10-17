// Admin extension: discounts & coupons.
(window.AdminExt = window.AdminExt || []).push((kit) => {
  const { $, esc, t, api, toast, modal, closeModal, confirmDel, num, nm, fmtDate, can, errMsg, flatTree } = kit;

  const dict = {
    fa: {
      discounts: 'تخفیف‌ها', dKindAuto: 'حراج خودکار', dKindCoupon: 'کد تخفیف', dKindAutoHint: 'قیمت محصولات را مستقیم کم می‌کند', dKindCouponHint: 'مشتری کد را در سبد خرید وارد می‌کند',
      dPercent: 'درصدی', dFixed: 'مبلغ ثابت', dValue: 'مقدار', dScope: 'شامل', scAll: 'همه محصولات', scCats: 'دسته‌ها', scProducts: 'محصولات', dStarts: 'شروع (اختیاری)', dEnds: 'پایان (اختیاری)',
      dMin: 'حداقل مبلغ سفارش', dMax: 'حداکثر تعداد استفاده (۰ = نامحدود)', dPer: 'حداکثر برای هر مشتری (۰ = نامحدود)', dExcl: 'روی محصولات حراج‌شده اعمال نشود', dCode: 'کد تخفیف', dGen: 'تولید کد',
      ds_live: 'فعال', ds_scheduled: 'زمان‌بندی‌شده', ds_expired: 'منقضی', ds_off: 'غیرفعال', ds_used_up: 'تمام‌شده', dUses: 'استفاده', dRemind: 'یادآوری انقضا', dRemindOk: 'پیام یادآوری برای مشتریان موافق بازاریابی ارسال شد',
      dRemindAsk: 'یادآوری این کد برای همه مشتریانی که موافق دریافت پیام تبلیغاتی هستند ارسال شود؟', dSearchProducts: 'جستجوی محصول…', dSelected: 'انتخاب‌شده', dCovered: 'محصول مشمول', dAlways: 'بدون محدودیت زمانی', dToggle: 'روشن/خاموش', dNameHint: 'نام داخلی', dPreview: 'پیش‌نمایش', dEmpty: 'هنوز تخفیفی ساخته نشده',
    },
    en: {
      discounts: 'Discounts', dKindAuto: 'Automatic sale', dKindCoupon: 'Coupon code', dKindAutoHint: 'Lowers product prices directly', dKindCouponHint: 'Customer enters the code at checkout',
      dPercent: 'Percent', dFixed: 'Fixed amount', dValue: 'Value', dScope: 'Applies to', scAll: 'All products', scCats: 'Categories', scProducts: 'Products', dStarts: 'Starts (optional)', dEnds: 'Ends (optional)',
      dMin: 'Minimum order amount', dMax: 'Max total uses (0 = unlimited)', dPer: 'Max per customer (0 = unlimited)', dExcl: 'Do not apply to items already on sale', dCode: 'Coupon code', dGen: 'Generate',
      ds_live: 'Live', ds_scheduled: 'Scheduled', ds_expired: 'Expired', ds_off: 'Off', ds_used_up: 'Used up', dUses: 'Uses', dRemind: 'Remind: expiring', dRemindOk: 'Reminder sent to marketing-consented customers',
      dRemindAsk: 'Send a reminder for this code to all customers who agreed to promotional messages?', dSearchProducts: 'Search products…', dSelected: 'selected', dCovered: 'products covered', dAlways: 'No time limit', dToggle: 'On/off', dNameHint: 'Internal name', dPreview: 'Preview', dEmpty: 'No discounts yet',
    },
  };

  const local = (ms) => { if (!ms) return ''; const d = new Date(ms), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const valLabel = (d) => (d.type === 'fixed' ? `${num(d.value)} ${t('currency')}` : `${num(d.value)}٪`.replace('٪', kit.lang === 'fa' ? '٪' : '%'));
  const STATE_CLS = { live: 'ok', scheduled: 'info', expired: 'bad', off: '', used_up: 'warn' };

  async function discounts() {
    const [list, cats] = await Promise.all([api('/discounts'), api('/categories')]);
    const scopeText = (d) => d.scope.mode === 'all' ? t('scAll') : d.scope.mode === 'categories' ? `${t('scCats')}: ${d.scope.categoryIds.map((id) => nm((cats.find((c) => c.id === id) || {}).name)).filter(Boolean).join('، ')}` : `${num(d.scope.productIds.length)} ${t('scProducts')}`;
    $('#main').innerHTML = `<div class="head"><h1>${t('discounts')} <small class="muted">(${num(list.length)})</small></h1><button class="btn" id="add">+ ${t('add')}</button></div>
      <div class="scroll"><table class="rt"><thead><tr><th>${t('name')}</th><th>${t('dScope')}</th><th>${t('dValue')}</th><th>${t('dStarts')} → ${t('dEnds')}</th><th>${t('dUses')}</th><th>${t('status')}</th><th></th></tr></thead><tbody>
      ${list.map((d) => `<tr><td class="c-name"><b>${esc(nm(d.name))}</b> ${d.kind === 'coupon' ? `<span class="pill mk" dir="ltr">${esc(d.code)}</span>` : `<span class="pill info">${t('dKindAuto')}</span>`}</td>
        <td data-label="${t('dScope')}"><span>${esc(scopeText(d))}<br><small class="muted">${num(d.covered)} ${t('dCovered')}</small></span></td>
        <td data-label="${t('dValue')}"><b>${valLabel(d)}</b>${d.minOrder ? `<br><small class="muted">≥ ${num(d.minOrder)}</small>` : ''}</td>
        <td data-label="${t('dStarts')}"><span>${d.startsAt || d.endsAt ? `${d.startsAt ? fmtDate(d.startsAt) : '…'} → ${d.endsAt ? fmtDate(d.endsAt) : '…'}` : t('dAlways')}</span></td>
        <td data-label="${t('dUses')}">${num(d.uses || 0)}${d.maxUses ? ' / ' + num(d.maxUses) : ''}</td>
        <td data-label="${t('status')}"><span class="pill ${STATE_CLS[d.state]}">${t('ds_' + d.state)}</span></td>
        <td class="c-act"><div class="actions"><button class="btn sec sm" data-tg="${d.id}">${t('dToggle')}</button>${d.kind === 'coupon' && can('crm.send') ? `<button class="btn sec sm" data-rm="${d.id}">${t('dRemind')}</button>` : ''}<button class="btn sec sm" data-e="${d.id}">${t('edit')}</button><button class="btn danger sm" data-d="${d.id}">${t('del')}</button></div></td></tr>`).join('') || `<tr><td colspan="7" class="emptyrow">${t('dEmpty')}</td></tr>`}</tbody></table></div>`;
    $('#add').onclick = () => form(null, cats);
    $('#main').onclick = async (e) => {
      const b = e.target.closest('button[data-e],button[data-d],button[data-tg],button[data-rm]'); if (!b) return;
      const d = list.find((x) => x.id == (b.dataset.e || b.dataset.d || b.dataset.tg || b.dataset.rm));
      try {
        if (b.dataset.e) form(d, cats);
        else if (b.dataset.tg) { await api(`/discounts/${d.id}/toggle`, { method: 'POST' }); discounts(); }
        else if (b.dataset.rm) { if (confirm(t('dRemindAsk'))) { await api(`/discounts/${d.id}/remind`, { method: 'POST' }); toast(t('dRemindOk')); } }
        else if (confirmDel()) { await api('/discounts/' + d.id, { method: 'DELETE' }); toast(t('deleted')); discounts(); }
      } catch (er) { toast(errMsg(er)); }
    };
  }

  async function form(d, cats, onSaved, preset = {}) {
    let products = []; try { products = await api('/products'); } catch {}
    const m = d ? JSON.parse(JSON.stringify(d)) : { name: {}, kind: 'auto', type: 'percent', value: '', scope: { mode: 'all', categoryIds: [], productIds: [] }, startsAt: 0, endsAt: 0, active: true, minOrder: 0, maxUses: 0, perCustomer: 0, excludeSaleItems: false, code: '', ...preset };
    m.scope.categoryIds ||= []; m.scope.productIds ||= [];
    const seg = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const draw = () => {
      modal(`<h1>${d ? t('edit') : t('add')} · ${t('discounts')}</h1>
        <div class="grid2"><label><span>${t('nameFa')}</span><input id="nf" dir="rtl" value="${esc(m.name.fa)}"></label><label><span>${t('nameEn')}</span><input id="ne" dir="ltr" value="${esc(m.name.en)}"></label></div>
        <div><label><span>${t('dKindAuto')} / ${t('dKindCoupon')}</span></label>${seg('sk', [['auto', t('dKindAuto')], ['coupon', t('dKindCoupon')]], m.kind)}<p class="muted hint">${m.kind === 'auto' ? t('dKindAutoHint') : t('dKindCouponHint')}</p></div>
        ${m.kind === 'coupon' ? `<label><span>${t('dCode')}</span><div style="display:flex;gap:8px"><input id="cd" dir="ltr" value="${esc(m.code)}" placeholder="SUMMER20" style="text-transform:uppercase"><button type="button" class="btn sec" id="gen">${t('dGen')}</button></div></label>` : ''}
        <div class="grid2"><div><label><span>${t('dValue')}</span></label>${seg('st', [['percent', t('dPercent')], ['fixed', t('dFixed')]], m.type)}</div><label><span>${m.type === 'percent' ? '%' : t('currency')}</span><input id="vl" type="number" min="1" ${m.type === 'percent' ? 'max="100"' : ''} inputmode="numeric" value="${m.value}"></label></div>
        <div><label><span>${t('dScope')}</span></label>${seg('ss', [['all', t('scAll')], ['categories', t('scCats')], ['products', t('scProducts')]], m.scope.mode)}</div>
        ${m.scope.mode === 'categories' ? `<div class="checks">${flatTree(cats).map(({ c, depth }) => `<label style="padding-inline-start:${depth * 16}px"><input type="checkbox" data-cat="${c.id}" ${m.scope.categoryIds.includes(c.id) ? 'checked' : ''}>${esc(nm(c.name))}</label>`).join('')}</div>` : ''}
        ${m.scope.mode === 'products' ? `<input id="ps" type="search" placeholder="${t('dSearchProducts')}"><div class="checks" id="pl"></div><small class="muted"><span id="pc">${num(m.scope.productIds.length)}</span> ${t('dSelected')}</small>` : ''}
        <div class="grid2"><label><span>${t('dStarts')}</span><input id="sa" type="datetime-local" value="${local(m.startsAt)}"></label><label><span>${t('dEnds')}</span><input id="ea" type="datetime-local" value="${local(m.endsAt)}"></label></div>
        ${m.kind === 'coupon' ? `<div class="grid2"><label><span>${t('dMin')}</span><input id="mo" type="number" min="0" inputmode="numeric" value="${m.minOrder || 0}"></label><label><span>${t('dMax')}</span><input id="mu" type="number" min="0" inputmode="numeric" value="${m.maxUses || 0}"></label></div>
          <div class="grid2"><label><span>${t('dPer')}</span><input id="pc2" type="number" min="0" inputmode="numeric" value="${m.perCustomer || 0}"></label><label class="switchrow" style="margin:0"><span style="color:var(--fg)">${t('dExcl')}</span><input type="checkbox" id="ex" ${m.excludeSaleItems ? 'checked' : ''}></label></div>` : ''}
        <label class="switchrow"><span style="color:var(--fg)">${t('active')}</span><input type="checkbox" id="ac" ${m.active ? 'checked' : ''}></label>
        <div class="actions sticky"><button class="btn sec" id="x">${t('cancel')}</button><button class="btn" id="ok">${t('save')}</button></div>`, () => $('#nf') && snap() !== init);
      bind();
    };
    const sync = () => {
      if (!$('#nf')) return;
      m.name = { fa: $('#nf').value, en: $('#ne').value };
      if ($('#cd')) m.code = $('#cd').value.toUpperCase();
      m.value = $('#vl').value;
      document.querySelectorAll('[data-cat]').forEach((c) => { const id = Number(c.dataset.cat); m.scope.categoryIds = m.scope.categoryIds.filter((x) => x !== id); if (c.checked) m.scope.categoryIds.push(id); });
      m.startsAt = $('#sa').value ? Date.parse($('#sa').value) : 0; m.endsAt = $('#ea').value ? Date.parse($('#ea').value) : 0;
      if ($('#mo')) { m.minOrder = Number($('#mo').value) || 0; m.maxUses = Number($('#mu').value) || 0; m.perCustomer = Number($('#pc2').value) || 0; m.excludeSaleItems = $('#ex').checked; }
      m.active = $('#ac').checked;
    };
    const snap = () => { sync(); return JSON.stringify(m); }; let init = '';
    const bind = () => {
      const pick = (id, key, fn) => document.querySelectorAll(`#${id} button`).forEach((b) => (b.onclick = () => { sync(); fn(b.dataset.v); draw(); }));
      pick('sk', 'kind', (v) => (m.kind = v)); pick('st', 'type', (v) => (m.type = v)); pick('ss', 'scope', (v) => (m.scope.mode = v));
      if ($('#gen')) $('#gen').onclick = () => { $('#cd').value = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join(''); };
      if ($('#pl')) {
        const paint = () => {
          const q = ($('#ps').value || '').trim().toLowerCase(), sel = new Set(m.scope.productIds);
          const shown = products.filter((p) => !q || `${p.name.fa} ${p.name.en} ${p.slug}`.toLowerCase().includes(q)).slice(0, 120);
          $('#pl').innerHTML = shown.map((p) => `<label><input type="checkbox" data-p="${p.id}" ${sel.has(p.id) ? 'checked' : ''}>${esc(nm(p.name))}</label>`).join('') || `<small class="muted">${t('empty')}</small>`;
        };
        paint(); $('#ps').oninput = paint;
        $('#pl').onchange = (e) => { const id = Number(e.target.dataset.p); m.scope.productIds = m.scope.productIds.filter((x) => x !== id); if (e.target.checked) m.scope.productIds.push(id); $('#pc').textContent = num(m.scope.productIds.length); };
      }
      $('#x').onclick = () => closeModal();
      $('#ok').onclick = async () => {
        sync();
        const body = { ...m, value: Number(m.value), startsAt: m.startsAt || 0, endsAt: m.endsAt || 0 };
        try { await api(d ? `/discounts/${d.id}` : '/discounts', { method: d ? 'PUT' : 'POST', body }); closeModal(true); toast(t('saved')); onSaved ? onSaved() : discounts(); } catch (e) { toast(errMsg(e)); }
      };
    };
    draw(); init = snap();
  }
  window.AdminSales = {
    // Called from the Products page: create a discount scoped to the selected products.
    async fromProducts(ids) {
      if (!ids.length) return;
      form(null, await api('/categories'), undefined, { scope: { mode: 'products', categoryIds: [], productIds: ids } });
    },
  };

  return { dict, pages: { discounts: { fn: discounts, perm: ['discounts.manage'], icon: '🏷' } } };
});
