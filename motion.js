(() => {
  const mobileMenu = window.matchMedia('(max-width: 600px)');
  const setMenu = (header, open) => {
    if (!header) return;
    const menuButton = header.querySelector('.menu-toggle');
    const menu = header.querySelector('.site-nav');
    if (!menuButton || !menu) return;
    const expanded = mobileMenu.matches && open;
    header.dataset.menuOpen = String(expanded);
    menuButton.setAttribute('aria-expanded', String(expanded));
    if (mobileMenu.matches) menu.setAttribute('aria-hidden', String(!expanded));
    else menu.removeAttribute('aria-hidden');
  };

  document.addEventListener('click', event => {
    const menuButton = event.target.closest('.menu-toggle');
    if (menuButton) {
      const header = menuButton.closest('.site-header');
      setMenu(header, menuButton.getAttribute('aria-expanded') !== 'true');
      return;
    }
    const menuLink = event.target.closest('.site-nav a');
    if (menuLink) {
      setMenu(menuLink.closest('.site-header'), false);
      return;
    }
    if (!event.target.closest('.site-header')) {
      document.querySelectorAll('.site-header').forEach(header => setMenu(header, false));
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openHeader = document.querySelector('.site-header[data-menu-open="true"]');
    if (!openHeader) return;
    setMenu(openHeader, false);
    openHeader.querySelector('.menu-toggle')?.focus();
  });

  mobileMenu.addEventListener('change', () => {
    document.querySelectorAll('.site-header').forEach(header => setMenu(header, false));
  });

  const start = () => {
    document.querySelectorAll('.site-header').forEach(header => setMenu(header, false));
    const story = document.querySelector('.journey-story');
    if (!story || story.dataset.ready) return;
    story.dataset.ready = 'true';
    const chapters = [...document.querySelectorAll('.journey-chapter')];
    const milestones = [...document.querySelectorAll('.milestone')];
    const links = [...document.querySelectorAll('.chapter-nav a')];
    let pending = false;
    function update() {
      pending = false;
      const bounds = story.getBoundingClientRect();
      const line = window.innerHeight * .45;
      const progress = Math.max(0, Math.min(1, (line - bounds.top) / bounds.height));
      story.style.setProperty('--journey-progress', progress);
      let current = chapters[0];
      chapters.forEach(chapter => { if (chapter.getBoundingClientRect().top <= line) current = chapter; });
      links.forEach(link => {
        if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      milestones.forEach(item => item.classList.toggle('is-current', item.getBoundingClientRect().top < line));
    }
    function schedule() { if (!pending) { pending = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(story);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('image-arrive');
          observer.unobserve(entry.target);
        });
      }, { threshold: .12 });
      document.querySelectorAll('.milestone figure, #gallery figure').forEach(image => observer.observe(image));
    }
    update();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
