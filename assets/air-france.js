(() => {
  const stories = [...document.querySelectorAll('.photo-story')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  let enabled = false;

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const ease = (value) => value * value * (3 - 2 * value);

  function update() {
    scheduled = false;
    if (!enabled) return;
    for (const story of stories) {
      const rect = story.getBoundingClientRect();
      const stage = story.querySelector('.story-stage');
      const copy = story.querySelector('.chapter-copy');
      const travel = Math.max(1, rect.height - stage.offsetHeight);
      const progress = clamp(-rect.top / travel);
      const soften = ease(clamp((progress - 0.03) / 0.52));
      const reveal = ease(clamp((progress - 0.24) / 0.32));
      const white = soften * 0.84 + ease(clamp((progress - 0.55) / 0.45)) * 0.12;
      story.style.setProperty('--photo-blur', `${(soften * 7).toFixed(2)}px`);
      story.style.setProperty('--white-opacity', white.toFixed(3));
      story.style.setProperty('--copy-opacity', reveal.toFixed(3));
      story.style.setProperty('--copy-shift', `${((1 - reveal) * 24).toFixed(2)}px`);
      story.style.setProperty('--chapter-progress', progress.toFixed(3));
      copy.classList.toggle('is-readable', reveal > 0.95);
    }
  }

  function schedule() {
    if (scheduled || !enabled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  function configure() {
    const fits = stories.every(story => {
      const stage = story.querySelector('.story-stage');
      const style = getComputedStyle(stage);
      const room = Math.min(stage.clientHeight, window.innerHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      return story.querySelector('.chapter-copy').scrollHeight <= room;
    });
    enabled = !motion.matches && fits;
    document.documentElement.classList.toggle('scroll-story', enabled);
    if (enabled) update();
  }

  configure();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', configure, { passive: true });
  motion.addEventListener('change', configure);
})();
