// Admin extension: full backup (database + images) and restore, e.g. to move local data to the live server.
(window.AdminExt = window.AdminExt || []).push((kit) => {
  const { $, t, toast, num, can } = kit;
  const dict = {
    fa: { backup: 'پشتیبان‌گیری', bkTitle: 'پشتیبان‌گیری و بازیابی', bkDownload: 'دانلود پشتیبان کامل', bkDownloadHint: 'یک فایل فشرده شامل همه محصولات، دسته‌ها، سفارش‌ها، کاربران، تنظیمات و عکس‌ها. این فایل محرمانه است؛ آن را امن نگه دارید.',
      bkRestore: 'بازیابی از فایل پشتیبان', bkRestoreHint: 'همه داده‌های فعلی این سایت (محصولات، سفارش‌ها، کاربران و تنظیمات) با محتوای فایل جایگزین می‌شود. عکس‌های موجود حذف نمی‌شوند و عکس‌های فایل به آن‌ها اضافه می‌شود.',
      bkPick: 'انتخاب فایل پشتیبان (.tar.gz)', bkStart: 'بازیابی', bkConfirm: 'همه داده‌های فعلی جایگزین می‌شود. ادامه می‌دهید؟', bkUploading: 'در حال آپلود…', bkWorking: 'آپلود کامل شد؛ در حال بازیابی…',
      bkDone: 'بازیابی انجام شد', bkResult: 'محصول: {p} · دسته: {c} · سفارش: {o} · عکس: {f}', bkRelogin: 'کاربران و رمزها هم جایگزین شده‌اند؛ دوباره وارد شوید.', bkRelog: 'ورود دوباره',
      e_bad_archive: 'فایل پشتیبان معتبر نیست.', e_tar_missing: 'ابزار tar روی سرور در دسترس نیست.', e_no_file: 'فایلی انتخاب نشده.', bkNet: 'ارتباط قطع شد یا فایل برای سرور بزرگ است.' },
    en: { backup: 'Backup', bkTitle: 'Backup & restore', bkDownload: 'Download full backup', bkDownloadHint: 'One compressed file with all products, categories, orders, users, settings and images. It is confidential — keep it safe.',
      bkRestore: 'Restore from a backup file', bkRestoreHint: 'ALL current data on this site (products, orders, users, settings) is replaced by the file contents. Existing images are kept and the file’s images are added.',
      bkPick: 'Choose backup file (.tar.gz)', bkStart: 'Restore', bkConfirm: 'All current data will be replaced. Continue?', bkUploading: 'Uploading…', bkWorking: 'Upload complete; restoring…',
      bkDone: 'Restore complete', bkResult: 'Products: {p} · Categories: {c} · Orders: {o} · Images: {f}', bkRelogin: 'Users and passwords were replaced too — please log in again.', bkRelog: 'Log in again',
      e_bad_archive: 'This is not a valid backup file.', e_tar_missing: 'The tar tool is not available on the server.', e_no_file: 'No file selected.', bkNet: 'Connection lost, or the file is too large for the server.' },
  };

  async function page() {
    const lang = kit.lang;
    $('#main').innerHTML = `<div class="head"><h1>${t('bkTitle')}</h1></div>
      <div class="panel" style="margin-bottom:12px"><h3>${t('bkDownload')}</h3><p class="muted" style="margin-bottom:12px">${t('bkDownloadHint')}</p><a class="btn" id="bkd" href="/api/admin/backup" download>⬇ ${t('bkDownload')}</a></div>
      <div class="panel"><h3>${t('bkRestore')}</h3><p class="muted" style="margin-bottom:12px">${t('bkRestoreHint')}</p>
        <label style="margin-bottom:10px"><span>${t('bkPick')}</span><input type="file" id="bkf" accept=".gz,.tgz,application/gzip,application/x-gzip"></label>
        <div id="bkp" class="bkp" hidden><i></i></div><p id="bkm" class="muted" aria-live="polite"></p>
        <button class="btn danger" id="bkr" disabled>${t('bkStart')}</button></div>`;
    const file = $('#bkf'), btn = $('#bkr'), bar = $('#bkp'), msg = $('#bkm');
    file.onchange = () => { btn.disabled = !file.files.length; };
    btn.onclick = () => {
      if (!file.files.length || !confirm(t('bkConfirm'))) return;
      const fd = new FormData(); fd.append('file', file.files[0]);
      btn.disabled = true; file.disabled = true; btn.classList.add('is-loading'); bar.hidden = false; msg.textContent = t('bkUploading');
      const x = new XMLHttpRequest(); x.open('POST', '/api/admin/restore'); x.withCredentials = true;
      const fail = (code) => { btn.classList.remove('is-loading'); btn.disabled = false; file.disabled = false; bar.hidden = true; msg.style.color = 'var(--bad)'; msg.textContent = t('e_' + code) === 'e_' + code ? t('bkNet') : t('e_' + code); };
      x.upload.onprogress = (e) => { if (e.lengthComputable) { const p = Math.round((e.loaded / e.total) * 100); bar.firstElementChild.style.width = p + '%'; msg.textContent = `${t('bkUploading')} ${num(p)}%`; if (p >= 100) msg.textContent = t('bkWorking'); } };
      x.onerror = x.ontimeout = () => fail('net');
      x.onload = () => {
        let j = {}; try { j = JSON.parse(x.responseText); } catch {}
        if (x.status !== 200 || !j.ok) return fail(j.error || 'net');
        btn.classList.remove('is-loading'); bar.hidden = true; msg.style.color = 'var(--ok)';
        msg.innerHTML = `<b>${t('bkDone')}</b><br>${t('bkResult').replace('{p}', num(j.products)).replace('{c}', num(j.categories)).replace('{o}', num(j.orders)).replace('{f}', num(j.files))}<br>${t('bkRelogin')}`;
        btn.textContent = t('bkRelog'); btn.disabled = false; btn.className = 'btn'; btn.onclick = () => location.reload();
      };
      x.send(fd);
    };
  }
  return { dict, pages: { backup: { fn: page, perm: ['settings.manage'], icon: '💾' } } };
});
