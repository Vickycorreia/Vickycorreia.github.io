(() => {
  'use strict';
  const carrier = 16;
  const signal = (t, frequency, phase = 0) => Math.sin(2 * Math.PI * frequency * t + phase);
  const modulated = (t, frequency, depth, phase = 0) => Math.sin(2 * Math.PI * carrier * t + depth * signal(t, frequency, phase));
  const instantaneous = (t, frequency, depth, phase = 0) => carrier + depth * frequency * Math.cos(2 * Math.PI * frequency * t + phase);
  if (typeof module !== 'undefined' && module.exports) module.exports = { signal, modulated, instantaneous, carrier };
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-fm-lab]');
  if (!root) return;
  const fr = document.documentElement.lang === 'fr';
  const frequency = root.querySelector('[data-fm-frequency]');
  const depth = root.querySelector('[data-fm-depth]');
  const button = root.querySelector('[data-fm-animate]');
  const status = root.querySelector('[data-fm-status]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let start = 0;
  let phase = 0;
  let soundTimers = [];
  const format = value => Number(value).toLocaleString(fr ? 'fr' : 'en', { maximumFractionDigits: 2 });
  const path = fn => Array.from({ length: 801 }, (_, index) => {
    const t = index / 800;
    return `${index ? 'L' : 'M'}${index},${(60 - 42 * fn(t)).toFixed(2)}`;
  }).join(' ');
  const draw = () => {
    const f = Number(frequency.value), beta = Number(depth.value);
    root.querySelector('[data-fm-frequency-output]').textContent = format(f);
    root.querySelector('[data-fm-depth-output]').textContent = format(beta);
    root.querySelector('[data-fm-signal]').setAttribute('d', path(t => signal(t, f, phase)));
    root.querySelector('[data-fm-carrier]').setAttribute('d', path(t => modulated(t, f, beta, phase)));
    root.querySelector('[data-fm-instantaneous]').textContent = format(instantaneous(0, f, beta, phase));
    root.querySelector('[data-fm-deviation]').textContent = format(beta * f);
  };
  const clearSound = () => {
    soundTimers.forEach(clearTimeout); soundTimers = [];
  };
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0; clearSound();
    button.textContent = fr ? 'Animer le signal' : 'Animate the signal';
    button.setAttribute('aria-pressed', 'false');
    status.textContent = fr ? 'Modifiez les réglages pour comparer les courbes.' : 'Adjust the controls to compare the curves.';
  };
  const advance = now => {
    const elapsed = now - start;
    phase = elapsed * 2 * Math.PI / 3000; draw();
    if (elapsed >= 6000) { stop(); return; }
    frame = requestAnimationFrame(advance);
  };
  button.addEventListener('click', event => {
    if (frame) { stop(); return; }
    window.PortfolioAudio?.unlock(event);
    window.PortfolioAudio?.play('tick', { gain: .06 });
    if (reduced.matches) {
      phase += Math.PI / 4; draw();
      status.textContent = fr ? 'Un pas de phase affiché : les mouvements réduits sont respectés.' : 'One phase step displayed: reduced motion is respected.';
      return;
    }
    button.textContent = fr ? 'Mettre en pause' : 'Pause';
    button.setAttribute('aria-pressed', 'true');
    status.textContent = fr ? 'Animation de six secondes — amplitude constante, fréquence variable.' : 'Six-second animation — constant amplitude, varying frequency.';
    start = performance.now(); frame = requestAnimationFrame(advance);
  });
  root.querySelector('[data-fm-listen]').addEventListener('click', async event => {
    clearSound();
    const audio = window.PortfolioAudio;
    if (!audio || !await audio.unlock(event)) {
      status.textContent = fr ? 'Activez le son en haut de la page pour écouter.' : 'Enable sound at the top of the page to listen.';
      return;
    }
    // Discrete audible samples illustrate frequency changes, not an IR carrier.
    for (let index = 0; index < 8; index += 1) {
      soundTimers.push(setTimeout(() => {
        if (document.hidden || !audio.ready) return;
        const value = 420 + 35 * Number(depth.value) * Math.cos(2 * Math.PI * Number(frequency.value) * index / 8 + phase);
        audio.play('pulse', { frequency: value, duration: .22, gain: .06 });
      }, index * 250));
    }
    status.textContent = fr ? 'Huit notes illustrent la variation de fréquence ; ce ne sont pas des mesures du montage.' : 'Eight notes illustrate frequency changes; these are not measurements from the circuit.';
  });
  root.querySelector('[data-fm-reset]').addEventListener('click', () => {
    stop(); frequency.value = '1'; depth.value = '2'; phase = 0; draw();
  });
  [frequency, depth].forEach(input => input.addEventListener('input', draw));
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }, { threshold: 0 }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('blur', stop);
  window.addEventListener('pagehide', stop);
  window.addEventListener('portfolio-audio-change', event => { if (!event.detail.enabled || !event.detail.ready) clearSound(); });
  reduced.addEventListener('change', () => { stop(); draw(); });
  root.dataset.ready = 'true';
  stop();
  draw();
})();
