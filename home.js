(() => {
  const header = document.querySelector('.home-header');
  if (!header) return;
  const toggle = header.querySelector('.home-menu-toggle');
  const nav = header.querySelector('.home-navigation');
  const scrim = document.querySelector('.menu-scrim');
  const mobile = window.matchMedia('(max-width: 1100px)');
  const background = [...document.querySelectorAll('main, .home-footer')];
  const label = toggle.querySelector('[data-menu-label]');
  document.body.classList.add('menu-ready');

  function setMenu(open, restoreFocus = false) {
    const expanded = mobile.matches && open;
    header.dataset.menuOpen = String(expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Close navigation menu' : 'Open navigation menu');
    label.textContent = expanded ? 'Close' : 'Menu';
    nav.inert = mobile.matches && !expanded;
    if (mobile.matches) nav.setAttribute('aria-hidden', String(!expanded));
    else nav.removeAttribute('aria-hidden');
    scrim.hidden = !expanded;
    document.body.classList.toggle('home-menu-open', expanded);
    background.forEach(element => { element.inert = expanded; });
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setMenu(header.dataset.menuOpen !== 'true'));
  scrim.addEventListener('click', () => setMenu(false, true));
  header.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    setMenu(false);
    if (link.getAttribute('href')?.startsWith('#')) {
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
  });
  document.addEventListener('keydown', event => {
    if (header.dataset.menuOpen !== 'true') return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key !== 'Tab') return;
    const focusable = [...header.querySelectorAll('a[href],button')].filter(element => element.getClientRects().length && !element.closest('[inert]'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  mobile.addEventListener('change', () => setMenu(false));
  window.addEventListener('pageshow', () => setMenu(false));
  setMenu(false);
})();
