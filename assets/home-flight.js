(() => {
  'use strict';
  const home = document.querySelector('.portrait-home');
  const layer = home?.querySelector('.home-flight-layer');
  if (!layer) return;
  const satellite = layer.querySelector('[data-flight-satellite]');
  const xLabel = layer.querySelector('[data-flight-x]');
  const yLabel = layer.querySelector('[data-flight-y]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const tilt = -Math.PI / 6;
  const duration = 4800;
  let visible = false;
  let active = false;
  let elapsed = 0;
  let lastTime = 0;
  let frame = 0;
  let driftFrame = 0;

  const paint = fraction => {
    const angle = .8 + fraction * .72;
    const x = 1030 + 480 * Math.cos(angle) * Math.cos(tilt) - 310 * Math.sin(angle) * Math.sin(tilt);
    const y = 510 + 480 * Math.cos(angle) * Math.sin(tilt) + 310 * Math.sin(angle) * Math.cos(tilt);
    const direction = Math.atan2(-480 * Math.sin(angle) * Math.sin(tilt) + 310 * Math.cos(angle) * Math.cos(tilt), -480 * Math.sin(angle) * Math.cos(tilt) - 310 * Math.cos(angle) * Math.sin(tilt)) * 180 / Math.PI;
    satellite.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${direction.toFixed(2)})`);
    xLabel.textContent = String(Math.round(x)).padStart(4, '0');
    yLabel.textContent = String(Math.round(y)).padStart(4, '0');
  };
  const resetDrift = () => {
    cancelAnimationFrame(driftFrame); driftFrame = 0;
    layer.style.removeProperty('--flight-drift-x');
    layer.style.removeProperty('--flight-drift-y');
  };
  const stop = () => {
    active = false; cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    home.classList.remove('flight-entering'); resetDrift();
  };
  const tick = time => {
    if (!active) return;
    if (lastTime) elapsed += Math.max(time - lastTime, 0);
    lastTime = time;
    paint(Math.min(elapsed / duration, 1));
    if (elapsed >= duration) { stop(); return; }
    frame = requestAnimationFrame(tick);
  };
  const configure = () => {
    if (!visible || document.hidden || motion.matches || elapsed >= duration) { stop(); return; }
    if (active) return;
    active = true; home.classList.add('flight-entering');
    frame = requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; configure(); }, { threshold: 0 }).observe(home);
  } else { visible = true; configure(); }
  document.addEventListener('visibilitychange', configure);
  window.addEventListener('pagehide', stop);
  motion.addEventListener('change', () => { if (motion.matches) { elapsed = duration; paint(1); } configure(); });
  home.addEventListener('pointermove', event => {
    if (!visible || document.hidden || motion.matches || !pointer.matches || event.pointerType !== 'mouse') return;
    cancelAnimationFrame(driftFrame);
    const rect = home.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / rect.width * 6;
    const y = (event.clientY - rect.top - rect.height / 2) / rect.height * 4;
    driftFrame = requestAnimationFrame(() => {
      driftFrame = 0;
      if (!visible || document.hidden || motion.matches) return;
      layer.style.setProperty('--flight-drift-x', `${x.toFixed(2)}px`);
      layer.style.setProperty('--flight-drift-y', `${y.toFixed(2)}px`);
    });
  }, { passive: true });
  home.addEventListener('pointerleave', resetDrift, { passive: true });
  if (motion.matches) elapsed = duration;
  paint(elapsed / duration);
})();
