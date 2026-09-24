(() => {
  const grid = document.querySelector('[data-gallery-grid]');
  const button = document.querySelector('[data-gallery-more]');
  const status = document.querySelector('[data-gallery-status]');
  const toggle = document.querySelector('[data-gallery-toggle]');
  const panel = document.querySelector('[data-gallery-panel]');
  const scrollport = document.querySelector('[data-gallery-scrollport]');
  const hint = document.querySelector('[data-gallery-hint]');
  if (!grid || !button || !status || !toggle || !panel || !scrollport || !hint) return;
  const previewCount = 8;
  let savedScroll = 0;
  let expanded = false;
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-lightbox';
  dialog.setAttribute('aria-label', 'Enlarged gallery photo');
  dialog.innerHTML = '<div class="gallery-lightbox-frame"><button class="gallery-lightbox-close" type="button" aria-label="Close photo" title="Close photo" autofocus><span aria-hidden="true">×</span></button><img alt=""><p></p></div>';
  document.body.append(dialog);
  const fullImage = dialog.querySelector('img');
  let opener;
  function enhancePhotos() {
    [...grid.children].forEach(figure => {
      if (figure.querySelector('.gallery-enlarge')) return;
      const image = figure.querySelector('img');
      const enlarge = document.createElement('button');
      enlarge.type = 'button';
      enlarge.className = 'gallery-enlarge';
      enlarge.setAttribute('aria-label', `Enlarge photo: ${image.alt}`);
      image.before(enlarge);
      enlarge.append(image);
    });
  }
  enhancePhotos();
  grid.addEventListener('click', event => {
    const enlarge = event.target.closest('.gallery-enlarge');
    if (!enlarge) return;
    opener = enlarge;
    const thumbnail = enlarge.querySelector('img');
    fullImage.src = thumbnail.src;
    fullImage.alt = thumbnail.alt;
    fullImage.width = thumbnail.width;
    fullImage.height = thumbnail.height;
    dialog.querySelector('p').textContent = enlarge.closest('figure').querySelector('figcaption').textContent;
    dialog.showModal();
    document.body.classList.add('gallery-lightbox-open');
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('gallery-lightbox-open');
    fullImage.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });
  let photos, pending = false;
  toggle.hidden = false;
  function renderGallery() {
    [...grid.children].forEach((figure, index) => { figure.hidden = !expanded && index >= previewCount; });
    panel.classList.toggle('is-expanded', expanded);
    hint.hidden = !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    const total = photos?.length || Number(button.dataset.total);
    toggle.querySelector('[data-gallery-toggle-label]').textContent = expanded ? 'Collapse gallery' : `Browse all ${total} photos`;
    const shown = expanded ? grid.children.length : previewCount;
    status.textContent = `${shown} of ${total} photos`;
    button.hidden = !expanded || shown >= total;
    if (expanded) {
      scrollport.tabIndex = 0;
      scrollport.setAttribute('role', 'region');
      scrollport.setAttribute('aria-label', 'Scrollable racing photo archive');
      scrollport.setAttribute('aria-describedby', 'gallery-browse-hint');
    } else {
      scrollport.removeAttribute('tabindex');
      scrollport.removeAttribute('role');
      scrollport.removeAttribute('aria-label');
      scrollport.removeAttribute('aria-describedby');
    }
  }
  toggle.addEventListener('click', async () => {
    if (expanded) {
      savedScroll = scrollport.scrollTop;
      expanded = false;
      renderGallery();
      toggle.focus({ preventScroll:true });
      panel.scrollIntoView({ block:'nearest', behavior:'instant' });
    } else {
      expanded = true;
      renderGallery();
      scrollport.scrollTop = savedScroll;
      panel.scrollIntoView({ block:'nearest', behavior:'instant' });
      scrollport.focus({ preventScroll:true });
      if (!photos) await loadMore();
    }
  });
  async function loadMore() {
    if (pending) return;
    pending = true;
    button.disabled = true;
    grid.setAttribute('aria-busy', 'true');
    button.textContent = 'Loading photos...';
    try {
      photos ||= (await import('./gallery-data.js?v=3')).default;
      const offset = grid.children.length;
      const fragment = document.createDocumentFragment();
      for (const photo of photos.slice(offset, offset + 12)) {
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        const caption = document.createElement('figcaption');
        const largest = photo.variants.at(-1);
        image.srcset = photo.variants.map(item => `${item.src} ${item.width}w`).join(', ');
        image.sizes = '(max-width: 700px) 46vw, 400px';
        image.src = largest.src;
        image.width = largest.width;
        image.height = largest.height;
        image.alt = photo.caption;
        image.loading = 'lazy';
        image.decoding = 'async';
        caption.textContent = photo.caption;
        figure.append(image, caption);
        fragment.append(figure);
      }
      grid.append(fragment);
      enhancePhotos();
      renderGallery();
    } catch {
      status.textContent = 'The photos could not load. Please try again.';
    } finally {
      pending = false;
      button.disabled = false;
      grid.removeAttribute('aria-busy');
      button.textContent = 'Load more photos';
    }
  }
  button.addEventListener('click', () => loadMore());
  renderGallery();
})();
