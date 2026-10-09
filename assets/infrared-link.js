(() => {
  'use strict';
  const root = document.querySelector('[data-infrared-link]');
  if (!root) return;
  const fr = document.documentElement.lang.startsWith('fr');
  const words = fr ? {
    run: 'Suivre les impulsions', replay: 'Rejouer la liaison', stop: 'Arrêter',
    block: 'Placer un obstacle', clear: 'Retirer l’obstacle',
    ready: 'Trajet dégagé. Lancez la séquence ou placez un obstacle.',
    running: 'La commande commute le transistor. Les impulsions parcourent le trajet optique.',
    blocked: 'Trajet interrompu : dans cette illustration, le capteur ne reçoit plus les impulsions directes.',
    finished: 'Séquence terminée : le signal est détecté puis traité par l’étage de réception.',
    static: 'Vue fixe : trajet optique dégagé, réception possible. Les mouvements réduits sont respectés.',
    notVisible: 'Affichez le schéma, puis relancez la séquence pour suivre les impulsions.',
    paused: 'Séquence arrêtée. Relancez-la pour suivre le trajet optique.'
  } : {
    run: 'Follow the pulses', replay: 'Replay the link', stop: 'Stop',
    block: 'Place an obstacle', clear: 'Remove the obstacle',
    ready: 'The path is clear. Start the sequence or place an obstacle.',
    running: 'The control signal switches the transistor. Pulses travel along the optical path.',
    blocked: 'The path is interrupted: in this illustration, direct pulses no longer reach the sensor.',
    finished: 'Sequence complete: the signal is detected and processed by the receiving stage.',
    static: 'Static view: the optical path is clear and reception is possible. Reduced motion is respected.',
    notVisible: 'Bring the diagram into view, then replay the sequence to follow the pulses.',
    paused: 'Sequence stopped. Replay it to follow the optical path.'
  };
  const runButton = root.querySelector('[data-link-run]');
  const blockButton = root.querySelector('[data-link-obstacle]');
  const resetButton = root.querySelector('[data-link-reset]');
  const status = root.querySelector('[data-link-status]');
  const packets = Array.from(root.querySelectorAll('[data-link-packet]'));
  const receivedPath = root.querySelector('[data-link-received]');
  const sourceLight = root.querySelector('.link-source-light');
  const detectorLight = root.querySelector('.link-detector-light');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 3600;
  const travel = 740;
  const pulseSpacing = 680;
  const pulseCount = 4;
  let frame = 0;
  let startedAt = 0;
  let blocked = false;
  let inView = true;
  let lastReceived = -1;
  let hasRun = false;
  const pulsePath = () => {
    if (blocked) return 'M0,62 L360,62';
    // Relative, illustrative pulses. No measured gain, delay or bandwidth is inferred.
    return Array.from({ length: 361 }, (_, x) => {
      let y = 62;
      for (let index = 0; index < pulseCount; index += 1) {
        y -= 43 * Math.exp(-Math.pow((x - (40 + index * 84)) / 7, 2));
      }
      return `${x ? 'L' : 'M'}${x},${y.toFixed(2)}`;
    }).join(' ');
  };
  const updatePath = () => {
    root.dataset.blocked = String(blocked);
    receivedPath.setAttribute('d', pulsePath());
    blockButton.setAttribute('aria-pressed', String(blocked));
    blockButton.textContent = blocked ? words.clear : words.block;
  };
  const clearLights = () => {
    packets.forEach(packet => { packet.style.opacity = '0'; });
    sourceLight.style.opacity = '0';
    detectorLight.style.opacity = '0';
  };
  const finish = message => {
    cancelAnimationFrame(frame); frame = 0;
    clearLights();
    root.dataset.running = 'false';
    runButton.setAttribute('aria-pressed', 'false');
    runButton.textContent = hasRun ? words.replay : words.run;
    if (message) status.textContent = message;
  };
  const advance = now => {
    if (document.hidden || !inView || reduced.matches) { finish(words.paused); return; }
    const elapsed = now - startedAt;
    let sourceOn = false;
    let detectorOn = false;
    packets.forEach((packet, index) => {
      const age = elapsed - 140 - index * pulseSpacing;
      const position = age / travel;
      const active = position >= 0 && position <= 1;
      const x = 267 + position * 416;
      sourceOn ||= age >= 0 && age < 160;
      detectorOn ||= !blocked && age >= travel && age < travel + 160;
      packet.setAttribute('cx', x.toFixed(2));
      packet.style.opacity = active && (!blocked || x < 478) ? '0.88' : '0';
      if (!blocked && index > lastReceived && age >= travel && age < travel + 100) {
        lastReceived = index;
        // Short, optional UI cue. Infrared radiation itself is silent.
        window.PortfolioAudio?.play('tick', { frequency: 560, duration: .07, gain: .025 });
      }
    });
    sourceLight.style.opacity = sourceOn ? '.35' : '0';
    detectorLight.style.opacity = detectorOn ? '.45' : '0';
    if (elapsed >= duration) { finish(blocked ? words.blocked : words.finished); return; }
    frame = requestAnimationFrame(advance);
  };
  runButton.addEventListener('click', event => {
    if (frame) { finish(words.paused); return; }
    hasRun = true;
    lastReceived = -1;
    if (reduced.matches || !inView || document.hidden) {
      finish(!inView || document.hidden ? words.notVisible : blocked ? words.blocked : words.static);
      return;
    }
    window.PortfolioAudio?.unlock(event);
    status.textContent = blocked ? words.blocked : words.running;
    runButton.textContent = words.stop;
    runButton.setAttribute('aria-pressed', 'true');
    root.dataset.running = 'true';
    startedAt = performance.now();
    frame = requestAnimationFrame(advance);
  });
  blockButton.addEventListener('click', () => {
    blocked = !blocked;
    updatePath();
    if (blocked) detectorLight.style.opacity = '0';
    status.textContent = blocked ? words.blocked : frame ? words.running : words.ready;
  });
  resetButton.addEventListener('click', () => {
    blocked = false;
    hasRun = false;
    finish(words.ready);
    updatePath();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView && frame) finish(words.paused);
    }, { threshold: 0 }).observe(root.querySelector('.infrared-link-diagram'));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && frame) finish(words.paused); });
  window.addEventListener('blur', () => { if (frame) finish(words.paused); });
  window.addEventListener('pagehide', () => { if (frame) finish(words.paused); });
  reduced.addEventListener('change', () => { if (frame) finish(words.paused); });
  root.querySelectorAll('button').forEach(button => { button.disabled = false; });
  root.dataset.ready = 'true';
  finish(words.ready);
  updatePath();
})();
