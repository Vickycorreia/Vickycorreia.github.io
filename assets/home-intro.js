(() => {
  const home = document.querySelector('.space-home');
  if (!home) return;

  const scene = home.querySelector('.orbital-scene');
  const toggle = home.querySelector('.motion-toggle');
  const label = toggle.querySelector('.motion-label');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let paused = false;
  let frame = 0;
  let drift = [0, 0];

  function resetDrift() {
    drift = [0, 0];
    scene.style.setProperty('--orbit-drift-x', '0px');
    scene.style.setProperty('--orbit-drift-y', '0px');
  }

  function configure() {
    toggle.hidden = motion.matches;
    home.classList.toggle('space-paused', paused || motion.matches);
    if (paused || motion.matches) resetDrift();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Resume motion' : 'Pause motion';
    configure();
  });

  home.addEventListener('pointermove', (event) => {
    if (motion.matches || paused || !pointer.matches) return;
    const rect = home.getBoundingClientRect();
    drift = [(event.clientX - rect.left - rect.width / 2) / rect.width * 14, (event.clientY - rect.top - rect.height / 2) / rect.height * 10];
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (motion.matches || paused) return;
      scene.style.setProperty('--orbit-drift-x', `${drift[0].toFixed(2)}px`);
      scene.style.setProperty('--orbit-drift-y', `${drift[1].toFixed(2)}px`);
    });
  }, { passive: true });
  home.addEventListener('pointerleave', resetDrift, { passive: true });
  motion.addEventListener('change', configure);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      home.classList.toggle('space-out-of-view', !entry.isIntersecting);
    });
    observer.observe(home);
  }
  configure();
})();
