(() => {
  'use strict';

  const storageKey = 'portfolio-sound-enabled';
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let enabled = true;
  try { enabled = localStorage.getItem(storageKey) !== 'false'; } catch { /* Optional preference. */ }
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let blurred = false;
  let suspendedAt = -Infinity;
  let gestureUnlocked = false;
  let unlocking = null;
  let generation = 0;
  const loops = new Map();
  const pendingLoops = new Map();
  const voices = new Set();
  const buttons = [];
  const isFrench = document.documentElement.lang === 'fr';
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const ready = () => Boolean(enabled && !document.hidden && !blurred &&
    (context?.state === 'running' || (!AudioContextClass && gestureUnlocked)));

  const announce = () => {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(enabled));
      button.dataset.sound = enabled ? 'on' : 'off';
      button.querySelector('.site-audio-state').textContent = isFrench
        ? (enabled ? 'Son' : 'Muet') : (enabled ? 'Sound' : 'Muted');
      button.title = isFrench
        ? (enabled ? 'Couper les sons et les vidéos' : 'Activer les sons et les vidéos')
        : (enabled ? 'Mute sound effects and videos' : 'Enable sound effects and videos');
    }
    document.documentElement.dataset.siteSound = enabled ? 'on' : 'off';
    window.dispatchEvent(new CustomEvent('portfolio-audio-change', {
      detail: { enabled, ready: ready(), supported: Boolean(AudioContextClass) }
    }));
  };

  const createContext = () => {
    if (context || !AudioContextClass) return;
    try {
      context = new AudioContextClass({ latencyHint: 'interactive' });
      master = context.createGain();
      master.gain.value = enabled ? 0.12 : 0;
      master.connect(context.destination);
      // A short reusable noise texture; buffers loop only during a visible action.
      noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      let filtered = 0;
      for (let index = 0; index < samples.length; index += 1) {
        filtered = filtered * 0.72 + (Math.random() * 2 - 1) * 0.28;
        samples[index] = filtered;
      }
      context.addEventListener('statechange', announce);
    } catch { context = null; master = null; }
  };

  const unlock = event => {
    const trusted = event?.isTrusted || window.navigator.userActivation?.isActive;
    if (!enabled || !trusted || document.hidden) return Promise.resolve(false);
    const eventTime = event?.timeStamp > 1e12
      ? event.timeStamp - performance.timeOrigin : event?.timeStamp;
    // Transient activation can outlive a blur. A subscriber reacting to our
    // suspended state must not treat that old activation as a new action.
    if (blurred && !(event?.isTrusted && eventTime >= suspendedAt)) return Promise.resolve(false);
    blurred = false;
    gestureUnlocked = true;
    // Native videos can use the sound preference even without Web Audio support.
    if (!AudioContextClass) { announce(); return Promise.resolve(false); }
    createContext();
    if (!context) return Promise.resolve(false);
    if (context.state === 'running') { announce(); return Promise.resolve(true); }
    if (!unlocking) {
      unlocking = Promise.resolve(context.resume()).then(() => {
        unlocking = null;
        announce();
        return ready();
      }, () => { unlocking = null; announce(); return false; });
    }
    return unlocking;
  };

  const release = voice => {
    if (!voices.has(voice)) return;
    voices.delete(voice);
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch { /* Already released. */ }
    }
  };
  const stopVoice = (voice, fade = 0.025) => {
    if (!context || !voices.has(voice) || voice.stopping) return;
    voice.stopping = true;
    const now = context.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      voice.source.stop(now + fade + 0.005);
    } catch { release(voice); }
  };
  const stopLoop = key => {
    pendingLoops.delete(key);
    const voice = loops.get(key);
    loops.delete(key);
    if (voice) stopVoice(voice);
  };
  const stopAll = () => {
    generation += 1;
    pendingLoops.clear();
    loops.clear();
    for (const voice of voices) stopVoice(voice);
  };

  const makeVoice = (kind, options = {}, looping = false) => {
    if (!ready() || !context || !master || voices.size >= 16) return null;
    const now = context.currentTime;
    const duration = clamp(Number(options.duration) || (kind === 'launch' ? 0.8 : 0.13), 0.025, 2);
    const gain = context.createGain();
    const nodes = [gain];
    let source;
    let amplitude = 0.22;
    const textured = ['launch', 'rocket', 'grain', 'impact', 'escape', 'build'].includes(kind);
    if (textured) {
      source = context.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = looping;
      const filter = context.createBiquadFilter();
      filter.type = kind === 'grain' ? 'bandpass' : 'lowpass';
      filter.frequency.value = kind === 'grain' ? 1700 : (kind === 'impact' ? 450 : 850);
      filter.Q.value = kind === 'grain' ? 0.8 : 0.35;
      source.connect(filter);
      filter.connect(gain);
      nodes.push(filter);
      amplitude = kind === 'grain' ? 0.28 : 0.38;
      if (kind === 'rocket') source.playbackRate.value = 0.7;
    } else {
      source = context.createOscillator();
      source.type = 'sine';
      const frequency = clamp(Number(options.frequency) ||
        (kind === 'frame' ? 920 : kind === 'success' ? 620 : kind === 'tick' ? 430 : 640), 90, 1800);
      source.frequency.setValueAtTime(frequency, now);
      if (kind === 'success') source.frequency.exponentialRampToValueAtTime(930, now + duration * 0.75);
      if (kind === 'frame') source.frequency.exponentialRampToValueAtTime(700, now + duration);
      source.connect(gain);
      amplitude = ['morse', 'pulse'].includes(kind) ? 0.25 : 0.17;
    }
    nodes.push(source);
    // Public gain values are modest perceptual levels. Filtered noise needs
    // more drive than a pure tone to remain audible at the same small value.
    if (Number.isFinite(Number(options.gain))) {
      amplitude = clamp(Number(options.gain) * (textured ? 8 : 4), 0.001, 0.6);
    }
    amplitude *= Number.isFinite(Number(options.volume)) ? clamp(Number(options.volume), 0, 1) : 1;
    gain.connect(master);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, amplitude), now + 0.008);
    if (!looping) {
      gain.gain.setValueAtTime(Math.max(0.0001, amplitude), now + Math.max(0.008, duration - 0.025));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }
    const voice = { source, gain, nodes, stopping: false };
    voices.add(voice);
    source.onended = () => release(voice);
    source.start(now);
    if (!looping) source.stop(now + duration + 0.005);
    return voice;
  };

  const play = (kind = 'tick', options = {}) => {
    if (ready()) return Boolean(makeVoice(kind, options));
    if (!enabled || blurred || !window.navigator.userActivation?.isActive) return false;
    const token = generation;
    unlock().then(ok => { if (ok && token === generation) makeVoice(kind, options); });
    return true;
  };
  const startLoop = (key, kind = 'morse', options = {}) => {
    const signature = JSON.stringify([kind, options.frequency ?? null, options.gain ?? null,
      options.duration ?? null, options.volume ?? null]);
    const current = loops.get(key);
    if (current && voices.has(current) && !current.stopping && current.signature === signature && ready()) return true;
    if (pendingLoops.get(key)?.signature === signature) return true;
    stopLoop(key);
    if (!ready()) {
      if (!enabled || blurred || !window.navigator.userActivation?.isActive) return false;
      const token = { signature };
      pendingLoops.set(key, token);
      unlock().then(ok => {
        if (pendingLoops.get(key) !== token) return;
        pendingLoops.delete(key);
        if (!ok) return;
        const voice = makeVoice(kind, options, true);
        if (voice) { voice.signature = signature; loops.set(key, voice); }
      });
      return true;
    }
    const voice = makeVoice(kind, options, true);
    if (voice) { voice.signature = signature; loops.set(key, voice); }
    return Boolean(voice);
  };
  const setEnabled = value => {
    enabled = Boolean(value);
    try { localStorage.setItem(storageKey, String(enabled)); } catch { /* Optional preference. */ }
    if (!enabled) stopAll();
    if (context && master) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(enabled ? 0.12 : 0, context.currentTime, 0.012);
    }
    announce();
    if (enabled && window.navigator.userActivation?.isActive) unlock();
  };

  window.PortfolioAudio = {
    unlock, play, startLoop, stopLoop, stopAll, setEnabled,
    get enabled() { return enabled; },
    get ready() { return ready(); },
    get supported() { return Boolean(AudioContextClass); }
  };

  const language = document.querySelector('header.nav .language-switch');
  if (language) {
    const controls = document.createElement('div');
    controls.className = 'site-preferences';
    language.before(controls);
    controls.append(language);
    const button = document.createElement('button');
    button.className = 'site-audio-toggle';
    button.type = 'button';
    button.setAttribute('aria-label', isFrench ? 'Son du site et des vidéos' : 'Site and video sound');
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4V5Z"/><path class="sound-wave" d="M14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="sound-muted" d="m15 9 6 6m0-6-6 6"/></svg><span class="site-audio-state"></span>';
    button.addEventListener('click', event => {
      setEnabled(!enabled);
      if (enabled) unlock(event);
    });
    controls.append(button);
    buttons.push(button);
  }
  const onGesture = event => {
    if (event.target?.closest?.('.site-audio-toggle')) return;
    if (event.isTrusted) unlock(event);
  };
  document.addEventListener('pointerdown', onGesture, { capture: true, passive: true });
  document.addEventListener('keydown', onGesture, { capture: true });
  const suspend = () => {
    blurred = true;
    suspendedAt = performance.now();
    stopAll();
    // Disconnect immediately before suspension: a suspended audio clock cannot
    // finish the short fade and emit ended until the next user gesture.
    for (const voice of Array.from(voices)) {
      try { voice.source.stop(context.currentTime); } catch { /* Already stopped. */ }
      release(voice);
    }
    if (context?.state === 'running') context.suspend().catch(() => {});
    announce();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('blur', suspend);
  window.addEventListener('pagehide', suspend);
  // Focus alone never restarts audio; the next deliberate interaction unlocks it.
  announce();
})();
