(() => {
  'use strict';
  const progress = document.querySelector('.page-flight-progress');
  if (!progress) return;
  const header = document.querySelector('header.nav');
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
