(() => {
  'use strict';
  const rail = document.querySelector('.scroll-trajectory');
  if (!rail) return;
  const edge = document.querySelector('.trajectory-edge');
  const links = [...rail.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  if (!links.length || sections.some(section => !section)) return;
  let positions = [];
  let active = -1;
  let frame = 0;
  let geometryDirty = true;

  function render() {
    frame = 0;
    if (document.hidden) return;
    if (geometryDirty) {
      const scroll = window.scrollY;
      // The marker approaches each chapter as its heading enters the reading area.
      const lastScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      positions = sections.map((section, index) => index ? Math.min(lastScroll, Math.max(0, section.getBoundingClientRect().top + scroll - innerHeight * .35)) : 0);
      rail.style.setProperty('--trajectory-travel', `${links.at(-1).offsetTop - links[0].offsetTop}px`);
      geometryDirty = false;
    }
    const scroll = window.scrollY;
    let index = 0;
    while (index < positions.length - 1 && scroll >= positions[index + 1]) index++;
    const distance = positions[index + 1] - positions[index];
    const fraction = index === positions.length - 1 ? 0 : Math.min(1, Math.max(0, (scroll - positions[index]) / Math.max(1, distance)));
    const progress = (index + fraction) / (positions.length - 1);
    rail.style.setProperty('--trajectory-progress', progress.toFixed(4));
    if (edge) edge.style.setProperty('--trajectory-progress', progress.toFixed(4));
    if (active !== index) {
      links.forEach((link, number) => {
        if (number === index) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      active = index;
    }
  }

  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resize() { geometryDirty = true; schedule(); }
  addEventListener('scroll', schedule, { passive:true });
  addEventListener('resize', resize, { passive:true });
  addEventListener('load', resize, { once:true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else resize();
  });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(document.querySelector('main') || document.body);
  }
  schedule();
})();
