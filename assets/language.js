(() => {
  'use strict';
  const key = 'portfolio-language';
  const current = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  const routes = new Set([
    'index.html', 'projects/air-france-can.html', 'projects/stm32-morse.html',
    'projects/infrared-audio.html', 'projects/sand-flow.html', 'projects/cardboard-rafale.html'
  ]);
  const path = window.location.pathname;
  const route = path.replace(/^\/fr(?:\/|$)/, '/').replace(/^\//, '') || 'index.html';
  let saved;
  try { saved = localStorage.getItem(key); } catch (_) { /* Links also work without storage. */ }
  if (routes.has(route) && (saved === 'en' || saved === 'fr') && saved !== current) {
    const prefix = saved === 'fr' ? '/fr/' : '/';
    window.location.replace(prefix + route + window.location.search + window.location.hash);
    return;
  }
  const links = [...document.querySelectorAll('.language-switch a[data-language]')];
  function updateLinks() {
    links.forEach(link => {
      const target = new URL(link.href, window.location.href);
      target.search = window.location.search;
      target.hash = window.location.hash;
      link.href = target.href;
    });
  }
  updateLinks();
  window.addEventListener('hashchange', updateLinks);
  links.forEach(link => {
    link.addEventListener('click', () => {
      try { localStorage.setItem(key, link.dataset.language); } catch (_) { /* Keep native navigation. */ }
    });
  });
})();
