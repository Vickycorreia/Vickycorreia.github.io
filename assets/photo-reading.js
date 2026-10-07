(() => {
  const stories = [...document.querySelectorAll('.photo-story')]
    .filter(story => story.querySelector('.story-frame') && story.querySelector('.chapter-content'));
  if (!stories.length) return;

  const information = stories.flatMap(story => [...story.querySelectorAll('.chapter-more')]);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = false;
  let scheduled = false;

  const clamp = value => Math.min(1, Math.max(0, value));
  const ease = value => value * value * (3 - 2 * value);

  function update() {
    scheduled = false;
    if (!enabled) return;
    const viewport = Math.max(1, window.innerHeight);
    for (const story of stories) {
      const rect = story.getBoundingClientRect();
      const stage = story.querySelector('.story-stage');
      const soften = ease(clamp(-rect.top / (viewport * .7)));
      const progress = clamp(-rect.top / Math.max(1, rect.height - stage.offsetHeight));
      story.style.setProperty('--reading-blur', `${(soften * 7).toFixed(2)}px`);
      story.style.setProperty('--reading-scale', (1.025 + soften * .025).toFixed(3));
      story.style.setProperty('--reading-white', (soften * .92).toFixed(3));
      story.style.setProperty('--reading-progress', progress.toFixed(3));
    }
  }

  function schedule() {
    if (scheduled || !enabled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  function configure() {
    enabled = !motion.matches;
    document.documentElement.classList.toggle('photo-reading-active', enabled);
    if (enabled) update();
  }

  function closeInformation(detail, restoreFocus = true) {
    detail.open = false;
    if (restoreFocus) detail.querySelector('summary').focus({ preventScroll: true });
  }

  for (const detail of information) {
    const close = detail.querySelector('.more-close');
    if (close) {
      close.hidden = false;
      close.addEventListener('click', () => closeInformation(detail));
    }
    detail.addEventListener('toggle', () => {
      if (detail.open) information.forEach(other => {
        if (other !== detail && other.open) closeInformation(other, false);
      });
    });
  }

  document.addEventListener('click', event => {
    information.forEach(detail => {
      if (detail.open && !detail.contains(event.target)) closeInformation(detail, false);
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const detail = information.find(candidate => candidate.open);
    if (detail) {
      closeInformation(detail);
      event.preventDefault();
    }
  });

  configure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  motion.addEventListener('change', configure);
})();
