(() => {
  const card = document.querySelector('[data-announcement-reel]');
  if (!card) return;
  const button = card.querySelector('button');
  const host = card.querySelector('[data-reel-embed]');
  const cover = card.querySelector('[data-reel-cover]');
  const note = card.querySelector('[data-reel-status]');
  const permalink = 'https://www.instagram.com/reel/DdHaHYjI-zm/';
  let pending = false;
  button.hidden = false;
  button.addEventListener('click', () => {
    if (pending) return;
    pending = true;
    button.disabled = true;
    note.textContent = 'Loading from Instagram...';
    const embed = document.createElement('blockquote');
    embed.className = 'instagram-media';
    embed.setAttribute('data-instgrm-permalink', permalink);
    embed.setAttribute('data-instgrm-version', '14');
    const link = document.createElement('a');
    link.href = permalink;
    link.textContent = 'Watch the announcement on Instagram';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    embed.append(link);
    host.replaceChildren(embed);
    host.hidden = false;
    let script, timer;
    const observer = new MutationObserver(() => {
      const frame = host.querySelector('iframe');
      if (!frame) return;
      frame.title = 'TRICON Garage announces Bayley Currey in the No. 5';
      clearTimeout(timer);
      observer.disconnect();
      cover.hidden = true;
      note.textContent = 'Video provided by Instagram. If it does not appear, use the link below.';
    });
    const fail = () => {
      clearTimeout(timer);
      observer.disconnect();
      script?.remove();
      host.replaceChildren();
      host.hidden = true;
      pending = false;
      button.disabled = false;
      note.textContent = 'Instagram could not load. Try again or open the reel below.';
    };
    observer.observe(host, { childList:true, subtree:true });
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
})();
