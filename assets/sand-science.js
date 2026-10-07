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

  if (!controls || !angleInput || !angleOutput || !widget || !stateLabel ||
      !stateDescription || !incline || !arc || !avalancheButton || !restButton) return;

  const onset = 36.7;
  const repose = 32.1;
  const isFrench = document.documentElement.lang === 'fr';
  let flowing = false;

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
        : 'The slope is below the repose threshold. Flow has stopped, or has not started; the sand is stable in this example.';
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
  avalancheButton.addEventListener('click', () => { angleInput.value = '38'; update(); });
  restButton.addEventListener('click', () => { angleInput.value = '30'; update(); });
  update();
  controls.hidden = false;
})();
