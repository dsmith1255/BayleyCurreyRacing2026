(() => {
  // One scroll driver across browsers, including mobile Safari.
  const hero = document.querySelector('.home-hero');
  if (!hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let drift = 0;
  let pan = 0;
  let heroTop = 0;
  let lastShift = '';
  function update() {
    frame = 0;
    if (reduced.matches) return;
    const bounds = hero.getBoundingClientRect();
    // Clamp bounce/overscroll and stop changing styles once the hero exits.
    const progress = Math.max(0, Math.min(1, (heroTop - bounds.top) / Math.max(1, heroTop + bounds.height)));
    const shift = `${progress.toFixed(5)}/${pan}/${drift}`;
    if (shift !== lastShift) {
      hero.style.setProperty('--hero-parallax-x', `${(-progress * pan).toFixed(2)}px`);
      hero.style.setProperty('--hero-parallax-y', `${(-progress * drift).toFixed(2)}px`);
    }
    lastShift = shift;
  }
  function schedule() {
    if (!frame && !reduced.matches) frame = requestAnimationFrame(update);
  }
  function configure() {
    hero.classList.toggle('hero-parallax-active', !reduced.matches);
    const styles = getComputedStyle(hero);
    drift = parseFloat(styles.getPropertyValue('--hero-drift')) || 0;
    pan = parseFloat(styles.getPropertyValue('--hero-pan')) || 0;
    heroTop = hero.getBoundingClientRect().top + window.scrollY;
    if (reduced.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      hero.style.removeProperty('--hero-parallax-x');
      hero.style.removeProperty('--hero-parallax-y');
      lastShift = '';
    }
    schedule();
  }
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', configure);
  window.addEventListener('pageshow', configure);
  reduced.addEventListener('change', configure);
  configure();
})();
