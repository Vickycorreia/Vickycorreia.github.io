(() => {
  'use strict';
  const progress = document.querySelector('.page-flight-progress');
  if (!progress) return;
  const header = document.querySelector('header.nav');
  const backToTop = document.querySelector('.back-to-top');
  const spotlightMedia = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.projects .project').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !spotlightMedia.matches) return;
      const box = card.getBoundingClientRect();
      card.style.setProperty('--spotlight-x', `${event.clientX - box.left}px`);
      card.style.setProperty('--spotlight-y', `${event.clientY - box.top}px`);
    }, { passive: true });
  });
  backToTop?.addEventListener('click', () => {
    if (reducedMotion.matches) scrollTo(0, 0);
    else scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector('header.nav .brand')?.focus({ preventScroll: true });
  });
  const homeLinks = [...document.querySelectorAll('header.nav .links a[href^="#"]')];
  const homeSections = homeLinks.map(link => document.getElementById(link.hash.slice(1)));
  let frame = 0;
  let maximum = 0;
  let geometryDirty = true;
  let previousValue = -1;
  let currentChapter = -1;
  let positions = [];
  const isFrench = document.documentElement.lang === 'fr';

  function render() {
    frame = 0;
    if (document.hidden) return;
    if (backToTop) backToTop.hidden = scrollY <= 500;
    if (geometryDirty) {
      maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      positions = homeSections.map(section => section ? section.getBoundingClientRect().top + scrollY - innerHeight * .3 : Infinity);
      geometryDirty = false;
    }
    const fraction = maximum ? Math.min(1, Math.max(0, scrollY / maximum)) : 1;
    progress.style.setProperty('--flight-progress', fraction.toFixed(5));
    // Home keeps its navigation fixed; project headers leave the viewport naturally.
    const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    progress.style.setProperty('--flight-progress-top', `${Math.round(headerBottom)}px`);
    const value = Math.round(fraction * 100);
    if (value !== previousValue) {
      progress.setAttribute('aria-valuenow', String(value));
      progress.setAttribute('aria-valuetext', isFrench ? `${value} % de la page` : `${value}% of the page`);
      previousValue = value;
    }
    let chapter = -1;
    positions.forEach((position, index) => { if (scrollY >= position) chapter = index; });
    if (chapter !== currentChapter) {
      homeLinks.forEach((link, index) => {
        if (index === chapter) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      currentChapter = chapter;
    }
    progress.hidden = false;
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resize() { geometryDirty = true; schedule(); }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize, { passive: true });
  addEventListener('load', resize, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else resize();
  });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(document.querySelector('main') || document.body);
    if (header) observer.observe(header);
  }
  schedule();
})();
