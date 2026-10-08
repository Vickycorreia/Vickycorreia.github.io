(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-rafale-build]').forEach(root => {
    const controls = root.querySelector('.rafale-build-controls');
    const buttons = [...root.querySelectorAll('[data-rafale-step]')];
    const descriptions = [...root.querySelectorAll('[data-rafale-description]')];
    const playButton = root.querySelector('[data-rafale-play]');
    const playLabel = playButton?.querySelector('span');
    if (!controls || buttons.length !== 4 || descriptions.length !== 4 || !playButton || !playLabel) return;

    let stage = 0;
    let timer = null;
    let playing = false;

    function showStep(index) {
      stage = index;
      root.dataset.stage = String(index);
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      descriptions.forEach((description, i) => { description.hidden = i !== index; });
    }

    function stop() {
      window.clearTimeout(timer);
      timer = null;
      playing = false;
      playLabel.textContent = playButton.dataset.labelPlay;
      playButton.setAttribute('aria-pressed', 'false');
    }

    function advance() {
      if (!playing || document.hidden) { stop(); return; }
      showStep(stage + 1);
      if (stage === buttons.length - 1) { stop(); return; }
      timer = window.setTimeout(advance, 1900);
    }

    buttons.forEach((button, index) => button.addEventListener('click', () => {
      stop();
      showStep(index);
    }));

    playButton.addEventListener('click', () => {
      if (playing || reduced.matches) { stop(); return; }
      showStep(0);
      playing = true;
      playButton.setAttribute('aria-pressed', 'true');
      playLabel.textContent = playButton.dataset.labelPause;
      timer = window.setTimeout(advance, 1900);
    });

    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
    reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) stop();
      }).observe(root);
    }

    showStep(0);
    controls.hidden = false;
  });
})();
