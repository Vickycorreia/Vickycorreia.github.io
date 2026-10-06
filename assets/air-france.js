(() => {
  const stories = [...document.querySelectorAll('.photo-story')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const ease = (value) => value * value * (3 - 2 * value);

  function update() {
    scheduled = false;
    if (motion.matches) return;
    for (const story of stories) {
      const rect = story.getBoundingClientRect();
      const stage = story.querySelector('.story-stage');
      const copy = story.querySelector('.chapter-copy');
      const travel = Math.max(1, rect.height - stage.offsetHeight);
      const progress = clamp(-rect.top / travel);
      const reveal = ease(clamp((progress - 0.15) / 0.38));
      story.style.setProperty('--photo-blur', `${(reveal * 3.5).toFixed(2)}px`);
      story.style.setProperty('--photo-shift', `${((1 - reveal) * 22).toFixed(2)}%`);
      story.style.setProperty('--copy-opacity', reveal.toFixed(3));
      story.style.setProperty('--copy-shift', `${((1 - reveal) * 24).toFixed(2)}px`);
      story.style.setProperty('--chapter-progress', progress.toFixed(3));
      copy.classList.toggle('is-readable', reveal > 0.02);
    }
  }

  function schedule() {
    if (scheduled || motion.matches) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  function configure() {
    document.documentElement.classList.toggle('scroll-story', !motion.matches);
    if (!motion.matches) update();
  }

  configure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  motion.addEventListener('change', configure);
})();
