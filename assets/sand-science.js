(() => {
  'use strict';

  const controls = document.getElementById('sand-hysteresis-controls');
  const angleInput = document.getElementById('ss-angle');
  const angleOutput = document.getElementById('ss-angle-output');
  const widget = document.getElementById('ss-hysteresis-widget');
  const stateLabel = document.getElementById('ss-state-label');
  const stateDescription = document.getElementById('ss-state-description');
  const incline = document.getElementById('ss-incline-bed');
  const arc = document.getElementById('ss-angle-arc');
  const avalancheButton = document.getElementById('ss-avalanche');
  const restButton = document.getElementById('ss-rest');
  const grainLayer = document.getElementById('ss-grains');

  if (!controls || !angleInput || !angleOutput || !widget || !stateLabel ||
      !stateDescription || !incline || !arc || !avalancheButton || !restButton) return;

  const onset = 36.7;
  const repose = 32.1;
  const isFrench = document.documentElement.lang === 'fr';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let flowing = false;

  // A constant stream recycled at the ends represents an infinite sand supply.
  // Coordinates follow the inclined bed: its right end is higher than its left.
  const start = 60;
  const length = 275;
  const speed = 62; // SVG units per second; an illustrative speed, not a measurement.
  const grains = [];
  let distance = 0;
  let frame = 0;
  let lastTime = null;
  let visible = !('IntersectionObserver' in window);

  if (grainLayer) {
    grainLayer.classList.add('ss-grains');
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 16; column += 1) {
        const grain = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const index = row * 16 + column;
        grain.setAttribute('class', `ss-grain ss-grain-tone-${index % 4}`);
        grain.setAttribute('cy', String(192 + row * 5.5 + ((column % 3) - 1) * 0.5));
        grain.setAttribute('r', String([2.4, 3, 2.7, 2.2][index % 4]));
        grainLayer.appendChild(grain);
        grains.push({ element: grain, offset: (column + row * 0.37) * length / 16 });
      }
    }
    grainLayer.parentElement.classList.add('ss-grains-ready');
  }

  function paintGrains() {
    for (const grain of grains) {
      const position = ((grain.offset - distance) % length + length) % length;
      grain.element.setAttribute('cx', (start + position).toFixed(2));
      // Fade at entry and exit, keeping the supply continuous without a visible jump.
      grain.element.setAttribute('opacity', Math.min(1, position / 9, (length - position) / 9).toFixed(2));
    }
  }

  function canAnimate() {
    return grains.length > 0 && flowing && visible && !document.hidden && !motion.matches;
  }

  function animate(time) {
    frame = 0;
    if (!canAnimate()) {
      lastTime = null;
      return;
    }
    const elapsed = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.064);
    lastTime = time;
    distance = (distance + elapsed * speed) % length;
    paintGrains();
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    if (canAnimate()) {
      if (!frame) frame = requestAnimationFrame(animate);
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    }
  }

  function showGrains() {
    if (!grainLayer || window.innerWidth > 600) return;
    const diagram = grainLayer.ownerSVGElement.getBoundingClientRect();
    const buttons = controls.getBoundingClientRect();
    if (diagram.top < 12 && buttons.bottom - diagram.top <= window.innerHeight - 24) {
      window.scrollBy({ top: diagram.top - 12, behavior: 'instant' });
    }
  }

  paintGrains();
  if (grainLayer && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncAnimation();
    });
    observer.observe(grainLayer.ownerSVGElement);
  }
  document.addEventListener('visibilitychange', syncAnimation);
  motion.addEventListener('change', syncAnimation);

  const update = () => {
    const angle = Number(angleInput.value);
    if (!Number.isFinite(angle)) return;
    if (!flowing && angle >= onset) flowing = true;
    else if (flowing && angle <= repose) flowing = false;

    let explanation;
    if (angle >= onset) {
      explanation = isFrench
        ? 'La pente a atteint le seuil d’avalanche. Dans cet exemple pédagogique, l’écoulement commence à 36,7°.'
        : 'The slope has reached the avalanche threshold. In this teaching example, flow begins at 36.7°.';
    } else if (angle <= repose) {
      explanation = isFrench
        ? 'La pente est au seuil de repos ou en dessous. L’écoulement s’est arrêté ou n’a pas commencé ; le sable est stable dans cet exemple.'
        : 'The slope is at or below the repose threshold. Flow has stopped, or has not started; the sand is stable in this example.';
    } else if (flowing) {
      explanation = isFrench
        ? 'Entre les deux seuils, l’écoulement se poursuit car le seuil d’avalanche a été franchi auparavant. Il ne s’arrête qu’à 32,1° ou en dessous.'
        : 'Inside the two-threshold band, flow continues because the avalanche threshold was crossed earlier. It stops only at 32.1° or below.';
    } else {
      explanation = isFrench
        ? 'Entre les deux seuils, le sable reste stable car le seuil d’avalanche n’a pas été franchi. Son état précédent détermine son comportement.'
        : 'Inside the two-threshold band, the sand remains stable because the avalanche threshold has not been crossed. The earlier state matters.';
    }

    const label = flowing ? (isFrench ? 'En écoulement' : 'Flowing') : 'Stable';
    const angleText = isFrench ? angle.toFixed(1).replace('.', ',') : angle.toFixed(1);
    const formattedAngle = `${angleText}°`;
    angleOutput.textContent = formattedAngle;
    angleInput.setAttribute('aria-valuetext', isFrench
      ? `${angleText} degrés, sable ${flowing ? 'en écoulement' : 'stable'} dans cet exemple pédagogique`
      : `${angleText} degrees, ${label.toLowerCase()} in the teaching example`);
    widget.dataset.state = flowing ? 'flowing' : 'stable';
    syncAnimation();
    widget.style.setProperty('--ss-angle-position', `${((angle - 28) / 12) * 100}%`);
    if (stateLabel.textContent !== label) stateLabel.textContent = label;
    if (stateDescription.textContent !== explanation) stateDescription.textContent = explanation;

    incline.setAttribute('transform', `rotate(${-angle} 45 210)`);
    const radians = angle * Math.PI / 180;
    const arcX = 45 + 55 * Math.cos(radians);
    const arcY = 210 - 55 * Math.sin(radians);
    arc.setAttribute('d', `M 100 210 A 55 55 0 0 0 ${arcX.toFixed(2)} ${arcY.toFixed(2)}`);
  };

  angleInput.addEventListener('input', update);
  avalancheButton.addEventListener('click', () => { angleInput.value = '38'; update(); showGrains(); });
  restButton.addEventListener('click', () => { angleInput.value = '30'; update(); showGrains(); });
  update();
  controls.hidden = false;
})();
