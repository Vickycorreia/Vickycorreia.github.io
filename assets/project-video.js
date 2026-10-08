(() => {
  'use strict';

  const videos = Array.from(document.querySelectorAll('.project-video video'));
  if (!videos.length) return;

  const isFrench = document.documentElement.lang === 'fr';
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggles = Array.from(document.querySelectorAll('.video-auto-toggle'));
  const hints = Array.from(document.querySelectorAll('.video-playback-hint'));
  const minimumVisibility = 0.55;
  let autoEnabled = !preference.matches;
  let explicitPreference = false;
  let activeAuto = null;
  let visibilityFrame = 0;
  let awaitingInteraction = false;

  const entries = videos.map(video => {
    const automatic = video.hasAttribute('data-scroll-play');
    video.controls = true;
    video.playsInline = true;
    video.loop = false;
    if (automatic) {
      video.autoplay = false;
      // Markup supplies muted playback; never overwrite a user's sound choice.
    }
    return {
      video,
      automatic,
      ratio: 0,
      owner: video.paused ? null : 'manual',
      manualPaused: false,
      completed: video.ended,
      autoplayBlocked: false,
      request: null,
      policyPaused: false,
      expectedPlayEvents: 0,
      expectedPauseEvents: 0,
      expectedMuteEvents: 0,
      lastMuted: video.muted,
      userMuted: null,
      soundFallback: false
    };
  });

  const audio = () => window.PortfolioAudio;
  const setMuted = (entry, muted) => {
    if (entry.video.muted === muted) return;
    entry.expectedMuteEvents += 1;
    entry.lastMuted = muted;
    entry.video.muted = muted;
  };
  const applySound = entry => {
    const engine = audio();
    // Preserve native controls when the optional shared audio script is absent.
    if (!engine) return;
    const muted = !engine.enabled || !engine.ready || entry.soundFallback || entry.userMuted === true;
    setMuted(entry, muted);
  };

  const isFullscreen = video => {
    const element = document.fullscreenElement;
    return Boolean(video.webkitDisplayingFullscreen || element === video || element?.contains(video));
  };
  const visibleRatio = video => {
    if (isFullscreen(video)) return 1;
    const bounds = video.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return 0;
    const width = Math.max(0, Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0));
    const height = Math.max(0, Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0));
    return width * height / (bounds.width * bounds.height);
  };
  const eligible = entry => autoEnabled && entry.automatic &&
    !document.hidden && !awaitingInteraction && entry.ratio >= minimumVisibility &&
    !entry.manualPaused && !entry.completed && !entry.video.ended &&
    !entry.autoplayBlocked && entry.owner !== 'manual';

  const pauseByScript = entry => {
    // pause() queues an event only when it changes paused from false to true.
    // Count that event so it cannot be mistaken for a pause in native controls.
    entry.request = null;
    entry.owner = null;
    if (activeAuto === entry) activeAuto = null;
    if (!entry.video.paused) {
      entry.policyPaused = true;
      entry.expectedPauseEvents += 1;
      entry.video.pause();
    }
  };

  const updateToggle = () => {
    const automaticAvailable = entries.some(entry => entry.automatic);
    for (const button of toggles) {
      button.type = 'button';
      button.textContent = isFrench
        ? (autoEnabled ? 'Désactiver le démarrage automatique' : 'Activer le démarrage automatique')
        : (autoEnabled ? 'Disable automatic video playback' : 'Enable automatic video playback');
      // The accessible toggle has a stable name: pressed means enabled.
      button.setAttribute('aria-label', isFrench
        ? 'Démarrage automatique des vidéos' : 'Automatic video playback');
      button.setAttribute('aria-pressed', String(autoEnabled));
      button.dataset.autoState = autoEnabled ? 'enabled' : 'disabled';
      button.hidden = !automaticAvailable;
    }
    const automaticActive = automaticAvailable && autoEnabled;
    for (const hint of hints) {
      hint.textContent = isFrench
        ? (automaticActive
          ? 'Les vidéos démarrent à leur arrivée à l’écran. Après une interaction, le bouton Son active leur audio d’origine ; les commandes restent disponibles.'
          : 'Lancez les vidéos avec leurs commandes. Le bouton Son règle l’audio d’origine ; vous pouvez aussi couper le son de chaque vidéo.')
        : (automaticActive
          ? 'Videos start when they come into view. After an interaction, the Sound button enables their original audio; playback controls remain available.'
          : 'Play videos using their controls. The Sound button controls their original audio; you can also mute each video individually.');
    }
  };

  const startAutomatic = entry => {
    if (!eligible(entry) || entry.request || !entry.video.paused) return;
    if (activeAuto && activeAuto !== entry) pauseByScript(activeAuto);
    const request = {};
    entry.request = request;
    entry.policyPaused = false;
    entry.owner = 'auto';
    activeAuto = entry;
    applySound(entry);
    let result;
    try {
      result = entry.video.play();
      // A policy rejection leaves paused=true and queues no play event.
      // When play() changes paused synchronously, its queued event is ours.
      if (!entry.video.paused) entry.expectedPlayEvents += 1;
    } catch {
      entry.request = null;
      entry.owner = null;
      entry.autoplayBlocked = true;
      if (activeAuto === entry) activeAuto = null;
      return;
    }
    Promise.resolve(result).then(() => {
      if (entry.request !== request) return;
      entry.request = null;
      if (!eligible(entry)) pauseByScript(entry);
    }, error => {
      // Autoplay policies and interrupted loads are ordinary outcomes.
      // Native controls remain available; do not retry on every scroll event.
      if (entry.request !== request) return;
      entry.request = null;
      entry.owner = null;
      // Some browsers still reject sound on scroll. Keep the same original
      // video available, silently; the next gesture can enable its real audio.
      if (!entry.video.muted && !entry.soundFallback && error?.name === 'NotAllowedError') {
        entry.soundFallback = true;
        setMuted(entry, true);
        if (activeAuto === entry) activeAuto = null;
        startAutomatic(entry);
        return;
      }
      entry.autoplayBlocked = true;
      if (activeAuto === entry) activeAuto = null;
    });
  };

  const reconcile = () => {
    for (const entry of entries) {
      entry.ratio = visibleRatio(entry.video);
      applySound(entry);
      if (document.hidden || entry.ratio === 0) {
        if (!entry.video.paused || entry.request) pauseByScript(entry);
      }
    }
    if (activeAuto && !eligible(activeAuto)) pauseByScript(activeAuto);
    if (document.hidden || !autoEnabled) return;

    // A manual playback takes priority over scroll-started playback.
    if (entries.some(entry => entry.owner === 'manual' && !entry.video.paused)) {
      if (activeAuto) pauseByScript(activeAuto);
      return;
    }
    if (activeAuto && eligible(activeAuto) &&
        (!activeAuto.video.paused || activeAuto.request)) return;

    const next = entries.filter(eligible).sort((a, b) => b.ratio - a.ratio)[0];
    if (next) startAutomatic(next);
  };

  for (const entry of entries) {
    const { video } = entry;
    video.addEventListener('play', () => {
      // Consume old scripted events even if a later pause already took effect.
      if (entry.expectedPlayEvents > 0) {
        entry.expectedPlayEvents -= 1;
        if (entry.owner === 'auto' && !eligible(entry)) pauseByScript(entry);
        return;
      }
      if (video.paused) return;
      entry.request = null;
      entry.manualPaused = false;
      entry.completed = false;
      entry.autoplayBlocked = false;
      entry.policyPaused = false;
      entry.owner = 'manual';
      if (activeAuto === entry) activeAuto = null;
      if (activeAuto) pauseByScript(activeAuto);
      for (const other of entries) {
        if (other !== entry && !other.video.paused) pauseByScript(other);
      }
      applySound(entry);
      entry.ratio = visibleRatio(video);
      if (document.hidden || entry.ratio === 0) pauseByScript(entry);
    });
    video.addEventListener('pause', () => {
      if (entry.expectedPauseEvents > 0) {
        entry.expectedPauseEvents -= 1;
        reconcile();
        return;
      }
      // A queued pause can be followed by an explicit play before it fires.
      if (!video.paused) return;
      // Native and scripted pause events can interleave during a fast exit.
      // A policy stop is still a policy stop, even after its counted event.
      if (entry.policyPaused) {
        reconcile();
        return;
      }
      entry.request = null;
      entry.owner = null;
      if (activeAuto === entry) activeAuto = null;
      if (!video.ended) entry.manualPaused = true;
      reconcile();
    });
    video.addEventListener('ended', () => {
      entry.request = null;
      entry.owner = null;
      entry.completed = true;
      if (activeAuto === entry) activeAuto = null;
      reconcile();
    });
    video.addEventListener('volumechange', () => {
      if (entry.expectedMuteEvents > 0) {
        entry.expectedMuteEvents -= 1;
        return;
      }
      // A native mute choice survives global mute/unmute and scroll changes.
      if (video.muted !== entry.lastMuted) entry.userMuted = video.muted;
      entry.lastMuted = video.muted;
      entry.soundFallback = false;
      if (audio() && !audio().enabled) {
        setMuted(entry, true);
        return;
      }
      if (!video.muted && !video.paused) {
        entry.request = null;
        entry.owner = 'manual';
        if (activeAuto === entry) activeAuto = null;
        for (const other of entries) {
          if (other !== entry && !other.video.paused) pauseByScript(other);
        }
      }
    });
  }

  window.addEventListener('portfolio-audio-change', () => {
    if (audio()?.ready) {
      awaitingInteraction = false;
      for (const entry of entries) entry.soundFallback = false;
    }
    for (const entry of entries) applySound(entry);
    reconcile();
  });
  const resumeAfterGesture = event => {
    if (!event.isTrusted) return;
    awaitingInteraction = false;
    for (const entry of entries) entry.soundFallback = false;
    reconcile();
  };
  document.addEventListener('pointerdown', resumeAfterGesture, { passive: true });
  document.addEventListener('keydown', resumeAfterGesture);

  for (const button of toggles) {
    button.addEventListener('click', () => {
      explicitPreference = true;
      autoEnabled = !autoEnabled;
      if (!autoEnabled) {
        for (const entry of entries) {
          if (entry.owner === 'auto' || entry.request) pauseByScript(entry);
        }
      } else {
        for (const entry of entries) entry.autoplayBlocked = false;
      }
      updateToggle();
      reconcile();
    });
  }

  const scheduleVisibility = () => {
    if (visibilityFrame) return;
    visibilityFrame = window.requestAnimationFrame(() => {
      visibilityFrame = 0;
      reconcile();
    });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(reconcile, {
      threshold: [0, 0.25, 0.5, minimumVisibility, 0.75, 1]
    });
    for (const entry of entries) observer.observe(entry.video);
  }
  window.addEventListener('scroll', scheduleVisibility, { passive: true });
  window.addEventListener('resize', scheduleVisibility);
  document.addEventListener('fullscreenchange', scheduleVisibility);
  for (const { video } of entries) {
    video.addEventListener('webkitbeginfullscreen', scheduleVisibility);
    video.addEventListener('webkitendfullscreen', scheduleVisibility);
  }
  const pauseForBackground = () => {
    awaitingInteraction = true;
    for (const entry of entries) pauseByScript(entry);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseForBackground();
    else reconcile();
  });
  window.addEventListener('blur', pauseForBackground);
  window.addEventListener('pagehide', () => {
    pauseForBackground();
  });
  window.addEventListener('pageshow', reconcile);
  const onPreferenceChange = event => {
    if (explicitPreference) return;
    autoEnabled = !event.matches;
    updateToggle();
    reconcile();
  };
  if (preference.addEventListener) preference.addEventListener('change', onPreferenceChange);
  else if (preference.addListener) preference.addListener(onPreferenceChange);

  updateToggle();
  reconcile();
})();
