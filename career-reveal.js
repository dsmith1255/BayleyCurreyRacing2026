(() => {
  const cards = [...document.querySelectorAll('.career-card-photo, .career-card-track-reveal')];
  if (!cards.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set(cards);
  let frame = 0;

  function update() {
    frame = 0;
    const height = window.innerHeight;
    // Read all positions before writing styles. Reveal while entering the
    // viewport, completing before the card reaches its reading position.
    const positions = [...visible].map(card => [card, card.getBoundingClientRect().top]);
    for (const [card, top] of positions) {
      const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (height * .92 - top) / (height * .48)));
      card.style.setProperty('--career-reveal', progress.toFixed(4));
    }
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      schedule();
    }, { rootMargin:'80px 0px' });
    cards.forEach(card => observer.observe(card));
  }
  window.addEventListener('scroll', schedule, { passive:true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  reducedMotion.addEventListener('change', () => {
    cards.forEach(card => visible.add(card));
    schedule();
  });
  update();
})();
