// Bayley Currey Racing v2: interactions
// Motion follows the same rules as v2.css: transform/opacity/clip-path only,
// interruptible where users can repeat the action, no animation on keyboard input.

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ---------- Header: solid once the page has scrolled ---------- */
const bar = document.querySelector('[data-bar]');
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    bar.dataset.scrolled = String(scrollY > 24);
    updateStory();
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });

/* ---------- Active section in the desktop nav ---------- */
const navLinks = [...document.querySelectorAll('.bar-links a[href^="#"]')];
const sectionFor = new Map(navLinks.map(a => [document.querySelector(a.hash), a]));
const navObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    navLinks.forEach(a => a.removeAttribute('aria-current'));
    sectionFor.get(entry.target)?.setAttribute('aria-current', 'true');
  }
}, { rootMargin: '-45% 0px -50% 0px' });
sectionFor.forEach((_, section) => section && navObserver.observe(section));

/* ---------- Bottom sheet menu (drag or flick to dismiss) ---------- */
const sheet = document.querySelector('[data-sheet]');
const scrim = document.querySelector('[data-sheet-scrim]');
const openButton = document.querySelector('[data-sheet-open]');
const handle = document.querySelector('[data-sheet-handle]');

function openSheet() {
  scrim.hidden = false;
  sheet.inert = false;
  root.classList.add('locked');
  openButton.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => {
    sheet.dataset.open = 'true';
    scrim.dataset.open = 'true';
    sheet.querySelector('a')?.focus({ preventScroll: true });
  });
}
function closeSheet({ restoreFocus = true } = {}) {
  sheet.dataset.open = 'false';
  scrim.dataset.open = 'false';
  sheet.style.transform = '';
  sheet.inert = true;
  root.classList.remove('locked');
  openButton.setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (sheet.dataset.open !== 'true') scrim.hidden = true; }, 300);
  if (restoreFocus) openButton.focus({ preventScroll: true });
}
openButton.addEventListener('click', openSheet);
scrim.addEventListener('click', () => closeSheet());
document.querySelector('[data-sheet-close]').addEventListener('click', () => closeSheet());
sheet.addEventListener('click', e => { if (e.target.closest('a')) closeSheet({ restoreFocus: false }); });
addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.dataset.open === 'true') closeSheet(); });

let drag = null;
handle.addEventListener('pointerdown', e => {
  if (drag) return; // ignore a second finger mid-drag
  drag = { y: e.clientY, t: performance.now(), id: e.pointerId, dy: 0 };
  handle.setPointerCapture(e.pointerId);
  sheet.dataset.dragging = 'true';
});
handle.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const raw = e.clientY - drag.y;
  // Friction when pulled up past the top instead of a hard stop
  drag.dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
  sheet.style.transform = `translateY(${drag.dy}px)`;
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const velocity = Math.abs(drag.dy) / (performance.now() - drag.t);
  sheet.dataset.dragging = 'false';
  if (drag.dy > sheet.offsetHeight * 0.3 || (drag.dy > 0 && velocity > 0.11)) closeSheet();
  else sheet.style.transform = '';
  drag = null;
}
handle.addEventListener('pointerup', endDrag);
handle.addEventListener('pointercancel', endDrag);

/* ---------- Scroll reveals ---------- */
document.querySelectorAll('[data-reveal-group]').forEach(group => {
  [...group.children].forEach((child, i) => child.style.setProperty('--d', `${i * 60}ms`));
});
document.querySelectorAll('[data-tracks] path').forEach((path, i) => path.style.setProperty('--d', `${i * 70}ms`));

const revealObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('is-in');
    revealObserver.unobserve(entry.target);
    if (entry.target.matches('.stats-row')) countUp(entry.target);
  }
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
document.querySelectorAll('[data-reveal], [data-reveal-group], [data-clip], [data-tracks], .mile')
  .forEach(el => revealObserver.observe(el));

/* ---------- Stat count-up (once, on first view) ---------- */
function countUp(row) {
  if (reduceMotion.matches) return;
  row.querySelectorAll('[data-count]').forEach((el, i) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1100;
    const start = performance.now() + i * 60;
    const step = now => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}

/* ---------- Story: progress rail + active chapter ---------- */
const story = document.querySelector('[data-story]');
const storyFill = document.querySelector('[data-story-fill]');
function updateStory() {
  if (!story) return;
  const rect = story.getBoundingClientRect();
  const p = clamp((innerHeight * 0.55 - rect.top) / rect.height, 0, 1);
  storyFill.style.transform = `scaleY(${p})`;
}
updateStory();
const chapterLinks = [...document.querySelectorAll('[data-chapters] a')];
const chapterObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    chapterLinks.forEach(a => a.hash === `#${entry.target.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
  }
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('.chapter').forEach(c => chapterObserver.observe(c));

/* ---------- Gallery: full archive from gallery-data.js ---------- */
const grid = document.querySelector('[data-gallery]');
const moreButton = document.querySelector('[data-gallery-more]');
const statusEl = document.querySelector('[data-gallery-status]');
const PAGE = 12;
let photos = [];
let shown = 0;
const cleanCaption = text => text.replace(/\s+[—–]\s+/g, ', ');

function photoItem(photo, delay) {
  const small = photo.variants[0];
  const large = photo.variants.at(-1);
  const li = document.createElement('li');
  li.style.setProperty('--d', `${delay}ms`);
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.lightbox = '';
  const img = new Image(small.width, small.height);
  img.src = small.src;
  img.dataset.full = large.src;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = cleanCaption(photo.caption);
  button.append(img);
  li.append(button);
  return li;
}
function showMore() {
  const next = photos.slice(shown, shown + PAGE);
  const frag = document.createDocumentFragment();
  next.forEach((p, i) => frag.append(photoItem(p, i * 35)));
  grid.append(frag);
  shown += next.length;
  statusEl.textContent = `Showing ${shown} of ${photos.length} photos`;
  moreButton.hidden = shown >= photos.length;
}
import('/gallery-data.js').then(({ default: data }) => {
  photos = data;
  document.querySelector('[data-gallery-total]').textContent = data.length;
  grid.replaceChildren();
  shown = 0;
  showMore();
  // First page keeps no stagger so the swap from static thumbnails is invisible
  grid.querySelectorAll('li').forEach(li => li.style.animation = 'none');
  moreButton.hidden = shown >= photos.length;
}).catch(() => { /* static thumbnails stay */ });
moreButton.addEventListener('click', showMore);

/* ---------- Lightbox: grows out of the tapped photo ---------- */
const dialog = document.querySelector('[data-lightbox-dialog]');
const frame = dialog.querySelector('.lightbox-frame');
const lbImg = dialog.querySelector('[data-lightbox-img]');
const lbCaption = dialog.querySelector('[data-lightbox-caption]');
const lbCount = dialog.querySelector('[data-lightbox-count]');
let items = [];
let index = 0;
let opener = null;
let closing = false;

function setImage(i) {
  index = (i + items.length) % items.length;
  const thumb = items[index].querySelector('img');
  lbImg.src = thumb.currentSrc || thumb.src;
  lbImg.width = thumb.naturalWidth || thumb.width;
  lbImg.height = thumb.naturalHeight || thumb.height;
  lbImg.alt = thumb.alt;
  lbCaption.textContent = thumb.alt;
  lbCount.textContent = `${index + 1} / ${items.length}`;
  const full = thumb.dataset.full;
  if (full && full !== lbImg.src) {
    const pre = new Image();
    pre.onload = () => { if (items[index] && items[index].querySelector('img') === thumb) lbImg.src = full; };
    pre.src = full;
  }
}

// FLIP with a clip-path crop so a cover-cropped thumbnail grows into the uncropped photo
function flipFrom(thumbEl) {
  const t = thumbEl.getBoundingClientRect();
  const f = lbImg.getBoundingClientRect();
  if (!f.width || !t.width) return null;
  const s = Math.max(t.width / f.width, t.height / f.height);
  const tx = t.left + t.width / 2 - f.left - (f.width * s) / 2;
  const ty = t.top + t.height / 2 - f.top - (f.height * s) / 2;
  const ix = Math.max(0, (f.width - t.width / s) / 2);
  const iy = Math.max(0, (f.height - t.height / s) / 2);
  return [
    { transform: `translate(${tx}px, ${ty}px) scale(${s})`, clipPath: `inset(${iy}px ${ix}px round ${4 / s}px)` },
    { transform: 'none', clipPath: 'inset(0px 0px round 4px)' },
  ];
}

function openLightbox(button) {
  const group = button.closest('[data-lightbox-group]');
  items = [...group.querySelectorAll('[data-lightbox]')];
  opener = button;
  setImage(items.indexOf(button));
  dialog.showModal();
  root.classList.add('locked');
  const run = () => {
    dialog.dataset.shown = 'true';
    const frames = !reduceMotion.matches && flipFrom(button);
    if (frames) lbImg.animate(frames, { duration: 420, easing: EASE_DRAWER });
    else lbImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
  };
  if (lbImg.complete) run(); else lbImg.decode().then(run, run);
}

function closeLightbox() {
  if (closing || !dialog.open) return;
  closing = true;
  dialog.dataset.shown = 'false';
  const target = items[index];
  const r = target?.getBoundingClientRect();
  const onScreen = r && r.bottom > 0 && r.top < innerHeight;
  const current = getComputedStyle(lbImg).transform;
  let anim;
  if (!reduceMotion.matches && onScreen) {
    lbImg.style.transform = '';
    const frames = flipFrom(target);
    if (frames) {
      frames.reverse();
      if (current && current !== 'none') frames[0].transform = current;
      anim = lbImg.animate(frames, { duration: 260, easing: EASE_OUT, fill: 'forwards' });
    }
  }
  if (!anim) anim = lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease', fill: 'forwards' });
  anim.finished.then(() => {
    dialog.close();
    anim.cancel();
    lbImg.style.transform = '';
    lbImg.style.opacity = '';
    root.classList.remove('locked');
    target?.focus({ preventScroll: true });
    closing = false;
  });
}

document.addEventListener('click', e => {
  const button = e.target.closest('[data-lightbox]');
  if (button) openLightbox(button);
});
dialog.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => setImage(index - 1));
dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => setImage(index + 1));
dialog.addEventListener('cancel', e => { e.preventDefault(); closeLightbox(); });
dialog.addEventListener('click', e => { if (e.target === dialog || e.target === frame || e.target.matches('.lightbox-bg')) closeLightbox(); });
// Keyboard navigation swaps instantly: no animation on keyboard-driven actions
dialog.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') setImage(index + 1);
  if (e.key === 'ArrowLeft') setImage(index - 1);
});

// Swipe: sideways to browse, down to dismiss (distance or a quick flick)
let swipe = null;
frame.addEventListener('pointerdown', e => {
  if (swipe || e.pointerType === 'mouse') return;
  swipe = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, dx: 0, dy: 0, axis: null };
  frame.setPointerCapture(e.pointerId);
});
frame.addEventListener('pointermove', e => {
  if (!swipe || e.pointerId !== swipe.id) return;
  swipe.dx = e.clientX - swipe.x;
  swipe.dy = e.clientY - swipe.y;
  if (!swipe.axis && Math.hypot(swipe.dx, swipe.dy) > 8) swipe.axis = Math.abs(swipe.dx) > Math.abs(swipe.dy) ? 'x' : 'y';
  if (swipe.axis === 'y') {
    const dy = swipe.dy < 0 ? -Math.sqrt(-swipe.dy) * 2 : swipe.dy;
    lbImg.style.transform = `translateY(${dy}px) scale(${1 - clamp(dy / 1600, 0, 0.15)})`;
  } else if (swipe.axis === 'x') {
    lbImg.style.transform = `translateX(${swipe.dx * 0.6}px)`;
  }
});
function endSwipe(e) {
  if (!swipe || e.pointerId !== swipe.id) return;
  const elapsed = performance.now() - swipe.t;
  const { axis, dx, dy } = swipe;
  swipe = null;
  if (axis === 'y' && (dy > 120 || (dy > 0 && dy / elapsed > 0.11))) { closeLightbox(); return; }
  if (axis === 'x' && (Math.abs(dx) > 70 || Math.abs(dx) / elapsed > 0.11)) {
    lbImg.style.transform = '';
    setImage(index + (dx < 0 ? 1 : -1));
    lbImg.animate([{ opacity: 0, transform: `translateX(${dx < 0 ? 24 : -24}px)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE_OUT });
    return;
  }
  const from = lbImg.style.transform;
  lbImg.style.transform = '';
  if (from) lbImg.animate([{ transform: from }, { transform: 'none' }], { duration: 240, easing: EASE_OUT });
}
frame.addEventListener('pointerup', endSwipe);
frame.addEventListener('pointercancel', endSwipe);

/* ---------- Instagram reel: loads only on request ---------- */
const reel = document.querySelector('[data-reel]');
if (reel) {
  const media = reel.querySelector('[data-reel-media]');
  const play = reel.querySelector('[data-reel-play]');
  const note = reel.querySelector('[data-reel-status]');
  const permalink = 'https://www.instagram.com/reel/DdHaHYjI-zm/';
  let pending = false;
  play.hidden = false;
  play.addEventListener('click', () => {
    if (pending) return;
    pending = true;
    play.disabled = true;
    note.textContent = 'Loading from Instagram...';
    const host = document.createElement('div');
    // Off-canvas while Instagram builds the iframe, so it can measure itself
    host.style.cssText = 'position:absolute;inset:0;opacity:0;pointer-events:none;overflow:hidden';
    const embed = document.createElement('blockquote');
    embed.className = 'instagram-media';
    embed.setAttribute('data-instgrm-permalink', permalink);
    embed.setAttribute('data-instgrm-version', '14');
    const link = document.createElement('a');
    link.href = permalink;
    link.textContent = 'Watch the announcement on Instagram';
    embed.append(link);
    host.append(embed);
    media.append(host);
    let script, timer;
    const observer = new MutationObserver(() => {
      const iframe = host.querySelector('iframe');
      if (!iframe) return;
      iframe.title = 'TRICON Garage announces Bayley Currey in the No. 5';
      clearTimeout(timer);
      observer.disconnect();
      media.querySelector(':scope > img').hidden = true;
      play.hidden = true;
      host.style.cssText = '';
      note.textContent = 'Video provided by Instagram. If it does not appear, use the link below.';
    });
    const fail = () => {
      clearTimeout(timer);
      observer.disconnect();
      script?.remove();
      host.remove();
      pending = false;
      play.disabled = false;
      note.textContent = 'Instagram could not load. Try again or open the reel below.';
    };
    observer.observe(host, { childList: true, subtree: true });
    timer = setTimeout(fail, 15000);
    if (window.instgrm?.Embeds) window.instgrm.Embeds.process();
    else {
      script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => window.instgrm?.Embeds.process();
      script.onerror = fail;
      document.head.append(script);
    }
  });
}
