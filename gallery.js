(() => {
  const grid = document.querySelector('[data-gallery-grid]');
  const button = document.querySelector('[data-gallery-more]');
  const status = document.querySelector('[data-gallery-status]');
  if (!grid || !button || !status) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-lightbox';
  dialog.setAttribute('aria-label', 'Enlarged gallery photo');
  dialog.innerHTML = '<div class="gallery-lightbox-frame"><button class="gallery-lightbox-close" type="button" autofocus>Close photo</button><img alt=""><p></p></div>';
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
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (pending) return;
    pending = true;
    button.disabled = true;
    button.textContent = 'Loading photos...';
    try {
      photos ||= (await import('./gallery-data.js?v=2')).default;
      const offset = grid.children.length;
      const fragment = document.createDocumentFragment();
      let first;
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
        first ||= figure;
        fragment.append(figure);
      }
      grid.append(fragment);
      enhancePhotos();
      const shown = grid.children.length;
      status.textContent = `Showing ${shown} of ${photos.length} photos`;
      button.hidden = shown >= photos.length;
      if (first) { first.tabIndex = -1; first.focus({ preventScroll: true }); }
    } catch {
      status.textContent = 'The photos could not load. Please try again.';
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = 'Load more photos';
    }
  });
})();
