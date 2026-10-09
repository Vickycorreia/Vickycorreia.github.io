(() => {
  'use strict';
  const menu = document.querySelector('[data-project-reading-nav]');
  if (!menu) return;
  const links = [...menu.querySelectorAll('a[href^="#"]')];
  const items = links.map(link => ({ link, target: document.getElementById(link.hash.slice(1)) })).filter(item => item.target);
  if (!items.length) return;
  const header = document.querySelector('header.nav');
  const gauge = document.querySelector('.page-flight-progress');
  const position = menu.querySelector('[data-reading-nav-position]');
  const summary = menu.querySelector('summary');
  let frame = 0;
  let geometryDirty = true;
  let positions = [];
  let targetMargin = 0;
  let active = -1;
  let headerOffscreen = false;

  menu.open = false;
  menu.classList.add('reading-nav-enhanced');
  document.documentElement.classList.add('project-reading-ready');
  if (gauge && position && position.id) {
    const descriptions = new Set((gauge.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    descriptions.add(position.id);
    gauge.setAttribute('aria-describedby', [...descriptions].join(' '));
  }

  function render() {
    frame = 0;
    if (document.hidden) return;
    const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const nextHeaderOffscreen = headerBottom <= 0;
    if (nextHeaderOffscreen !== headerOffscreen) {
      headerOffscreen = nextHeaderOffscreen;
      menu.classList.toggle('reading-nav-header-offscreen', headerOffscreen);
      document.documentElement.classList.toggle('reading-header-offscreen', headerOffscreen);
    }
    menu.style.setProperty('--reading-nav-top', `${Math.round(headerBottom + 14)}px`);
    if (geometryDirty) {
      positions = items.map(item => item.target.getBoundingClientRect().top + scrollY);
      targetMargin = Math.max(0, ...items.map(item => parseFloat(getComputedStyle(item.target).scrollMarginBlockStart) || 0));
      geometryDirty = false;
    }
    const readingLine = scrollY + Math.min(180, Math.max(targetMargin + 12, innerHeight * .26));
    let next = 0;
    positions.forEach((top, index) => { if (top <= readingLine) next = index; });
    if (next === active) return;
    active = next;
    items.forEach(({ link }, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const link = items[active].link;
    const label = link.querySelector('[data-reading-nav-label]')?.textContent.trim() || link.textContent.trim();
    if (position) position.textContent = `${String(active + 1).padStart(2, '0')} · ${label}`;
    // The rocket gauge continues to own page percentage. This names its current chapter.
    if (gauge) gauge.dataset.readingSection = label;
    menu.dataset.readingSection = label;
  }
  function schedule() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resize() { geometryDirty = true; schedule(); }

  function updateAvailability() {
    const informationOpen = Boolean(document.querySelector('.chapter-more[open]'));
    menu.hidden = informationOpen;
    if (informationOpen) menu.open = false;
    resize();
  }
  menu.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    menu.open = false;
    // Keep native anchor scrolling and its URL. Focus follows the selected destination.
    requestAnimationFrame(() => {
      const temporaryTabindex = !target.hasAttribute('tabindex');
      if (temporaryTabindex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (temporaryTabindex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      resize();
    });
  });
  document.addEventListener('click', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    summary.focus({ preventScroll: true });
    event.preventDefault();
  });
  document.addEventListener('toggle', event => {
    if (event.target.matches('.chapter-more')) updateAvailability();
    else if (event.target !== menu) resize();
  }, true);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', resize, { passive: true });
  addEventListener('load', resize, { once: true });
  addEventListener('hashchange', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else resize();
  });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(resize);
    observer.observe(document.querySelector('main') || document.body);
    if (header) observer.observe(header);
  }
  updateAvailability();
})();
