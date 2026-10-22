// Shared UX layer: every server request gets (1) a top progress bar, (2) a spinner + lock on the button/form that triggered it,
// (3) a friendly message when the network or server fails. No per-button code is needed.
(() => {
  if (window.__ux) return; window.__ux = true;
  const MSG = {
    fa: { net: 'اتصال به سرور برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.', srv: 'سرور موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.', off: 'اینترنت قطع است.', slow: 'کمی طول می‌کشد؛ لطفاً صبر کنید…' },
    en: { net: 'Could not reach the server. Check your connection and try again.', srv: 'The server is temporarily unavailable. Please try again shortly.', off: 'You are offline.', slow: 'This is taking a while — please wait…' },
  };
  const say = (k) => (MSG[document.documentElement.lang === 'en' ? 'en' : 'fa'])[k];

  const bar = document.createElement('div'); bar.className = 'ux-bar'; bar.innerHTML = '<i></i>';
  const toastEl = document.createElement('div'); toastEl.className = 'ux-toast'; toastEl.setAttribute('role', 'status');
  const mount = () => { document.body.append(bar, toastEl); };
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);

  let toastT, lastToast = 0;
  const toast = (k) => { if (Date.now() - lastToast < 3000) return; lastToast = Date.now(); toastEl.textContent = say(k); toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 4000); };

  // progress bar
  let inflight = 0, creep, hideT;
  const fill = bar.firstElementChild;
  const start = () => { if (inflight++) return; clearTimeout(hideT); fill.style.width = '12%'; bar.classList.add('on'); let w = 12; clearInterval(creep); creep = setInterval(() => { w += (90 - w) * 0.08; fill.style.width = w + '%'; }, 300); };
  const stop = () => { if (--inflight > 0) return; inflight = 0; clearInterval(creep); fill.style.width = '100%'; hideT = setTimeout(() => { bar.classList.remove('on'); setTimeout(() => { if (!inflight) fill.style.width = '0'; }, 250); }, 200); };

  // which button did the user just press?
  let lastEl = null, lastAt = 0;
  const BTN = 'button, input[type=submit], input[type=button]';
  addEventListener('click', (e) => { const b = e.target.closest && e.target.closest(BTN); if (b) { lastEl = b; lastAt = Date.now(); } }, true);
  addEventListener('submit', (e) => { lastEl = e.submitter || (e.target.querySelector && e.target.querySelector('[type=submit], button:not([type])')); lastAt = Date.now(); }, true);
  const busy = (el, d) => {
    el._ux = (el._ux || 0) + d;
    if (el._ux > 0) { el.classList.add('is-loading'); el.setAttribute('aria-busy', 'true'); if (!el.disabled) { el.disabled = true; el._uxLocked = true; } }
    else { el._ux = 0; el.classList.remove('is-loading'); el.removeAttribute('aria-busy'); if (el._uxLocked) { el.disabled = false; el._uxLocked = false; } }
  };

  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/\/api\/track\b/.test(url) || (init && init.quiet)) return origFetch(input, init); // background pings stay silent
    start();
    const el = lastEl && Date.now() - lastAt < 1500 && document.contains(lastEl) ? lastEl : null;
    if (el) busy(el, 1);
    const slow = setTimeout(() => toast('slow'), 8000);
    return origFetch(input, init).then(
      (r) => { if (r.status >= 502 && r.status <= 504) toast('srv'); return r; },
      (e) => { toast(navigator.onLine === false ? 'off' : 'net'); throw e; }
    ).finally(() => { clearTimeout(slow); stop(); if (el) busy(el, -1); });
  };
  addEventListener('offline', () => toast('off'));

  window.UX = {
    skeletonGrid: (n = 8, cols = 4) => `<div class="grid" style="--cols:${cols}">${'<div class="card ux-skel"></div>'.repeat(n)}</div>`,
    skeletonRows: (n = 5) => Array.from({ length: n }, (_, i) => `<div class="ux-skel ${i % 3 ? 'line' : 'block'}" style="${i % 3 ? 'width:' + (60 + ((i * 17) % 35)) + '%' : ''}"></div>`).join(''),
  };
})();
