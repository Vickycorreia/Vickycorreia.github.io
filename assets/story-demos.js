(() => {
  'use strict';

  const demos = document.querySelectorAll('.story-demo[data-demo]');
  if (!demos.length) return;

  const isFrench = document.documentElement.lang === 'fr';
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const copy = isFrench ? {
    tac: {
      play: 'Lancer l’illustration',
      replay: 'Rejouer l’illustration',
      playing: 'Illustration en cours…',
      ready: 'Prêt à illustrer les chocs successifs.',
      running: 'La bille avance sous l’effet de la gravité. Chaque contact illustre une perte d’énergie.',
      complete: 'Illustration terminée : la gravité apporte de l’énergie ; chaque choc en dissipe une partie. Cette analogie ne représente pas une mesure.',
      reduced: 'Résultat statique : la gravité apporte de l’énergie ; chaque choc en dissipe une partie. Cette analogie ne représente pas une mesure.'
    },
    receive: {
      play: 'Comparer les chemins de réception',
      replay: 'Rejouer la comparaison',
      playing: 'Comparaison en cours…',
      ready: 'Comparer les observations des essais rapportés pour cibler le diagnostic.',
      running: 'Les deux chemins de réception sont mis en évidence. Le schéma illustre les observations, sans simuler le protocole CAN.',
      reference: 'La communication a été observée avec la référence PCAN lors des essais rapportés.',
      complete: 'Lors de ces essais, la communication a été observée avec la référence PCAN. Les réponses attendues n’étaient pas correctement lues sur le prototype Arduino UNO. Cette comparaison a permis de cibler le diagnostic.',
      reduced: 'Comparaison statique des essais rapportés : la communication a été observée avec la référence PCAN, mais les réponses attendues n’étaient pas correctement lues sur le prototype Arduino UNO. Cette comparaison a permis de cibler le diagnostic.'
    },
    stopped: 'Illustration arrêtée. Vous pouvez la relancer.'
  } : {
    tac: {
      play: 'Play the illustration',
      replay: 'Replay the illustration',
      playing: 'Illustration playing…',
      ready: 'Ready to illustrate successive impacts.',
      running: 'The ball moves under gravity. Each contact illustrates a loss of energy.',
      complete: 'Illustration complete: gravity supplies energy; each impact dissipates some. This analogy is not a measurement.',
      reduced: 'Static result: gravity supplies energy; each impact dissipates some. This analogy is not a measurement.'
    },
    receive: {
      play: 'Compare the receive paths',
      replay: 'Replay the comparison',
      playing: 'Comparison playing…',
      ready: 'Compare observations from the reported tests to focus the diagnosis.',
      running: 'Both receive paths are highlighted. The diagram illustrates observations rather than simulating the CAN protocol.',
      reference: 'Communication was observed with the PCAN reference in the reported tests.',
      complete: 'In those tests, communication was observed with the PCAN reference. The expected responses were not read correctly on the Arduino UNO prototype. This comparison helped focus the diagnosis.',
      reduced: 'Static comparison of the reported tests: communication was observed with the PCAN reference, but the expected responses were not read correctly on the Arduino UNO prototype. This comparison helped focus the diagnosis.'
    },
    stopped: 'Illustration stopped. You can restart it.'
  };

  const controllers = [];
  const clamp = value => Math.max(0, Math.min(1, value));
  const inViewport = element => {
    const bounds = element.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < window.innerHeight &&
      bounds.right > 0 && bounds.left < window.innerWidth;
  };

  for (const demo of demos) {
    const controls = demo.querySelector('.story-demo__controls');
    const button = demo.querySelector('[data-demo-play]');
    const status = demo.querySelector('[data-demo-status]');
    const kind = demo.dataset.demo;
    if (!controls || !button || !status ||
        (kind !== 'tac-tac' && kind !== 'receive-paths')) continue;

    const ball = demo.querySelector('[data-tt-ball]');
    const impacts = Array.from(demo.querySelectorAll('[data-tt-impact]'));
    const routes = kind === 'receive-paths' ? ['reference', 'prototype'].map(name => ({
      name,
      path: demo.querySelector(`[data-rx-route="${name}"]`),
      pulse: demo.querySelector(`[data-rx-pulse="${name}"]`),
      stage: demo.querySelector(`[data-rx-stage="${name}"]`),
      delay: name === 'reference' ? 300 : 800,
      travel: name === 'reference' ? 2300 : 2900
    })) : [];
    if (kind === 'tac-tac' && (!ball || impacts.length !== 5)) continue;
    if (routes.some(route => !route.path || !route.pulse || !route.stage)) continue;

    const text = kind === 'tac-tac' ? copy.tac : copy.receive;
    const duration = kind === 'tac-tac' ? 6000 : 5500;
    const points = [
      { time: 0, x: 110, y: 75 },
      { time: 600, x: 145, y: 92 },
      { time: 1650, x: 220, y: 108 },
      { time: 2700, x: 295, y: 124 },
      { time: 3750, x: 370, y: 140 },
      { time: 4800, x: 445, y: 156 },
      { time: 6000, x: 505, y: 204 }
    ];
    const hopHeights = [0, 38, 33, 27, 22, 14];
    let frame = 0;
    let playing = false;
    let startTime = 0;
    let referenceAnnounced = false;
    const soundedImpacts = new Set();

    const setStatus = message => {
      if (status.textContent !== message) status.textContent = message;
    };
    const setBall = (x, y) => {
      ball.setAttribute('cx', x.toFixed(2));
      ball.setAttribute('cy', y.toFixed(2));
    };
    const resetDrawing = () => {
      demo.classList.remove('is-playing', 'is-complete');
      if (ball) setBall(points[0].x, points[0].y);
      for (const impact of impacts) impact.classList.remove('is-active');
      for (const route of routes) {
        route.started = false;
        route.arrived = false;
        const origin = route.path.getPointAtLength(0);
        route.pulse.setAttribute('cx', origin.x);
        route.pulse.setAttribute('cy', origin.y);
        route.pulse.style.opacity = '0';
        route.path.classList.remove('is-active');
        route.stage.classList.remove('is-active');
      }
    };
    const cancelFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const stop = () => {
      if (!playing) return;
      playing = false;
      cancelFrame();
      resetDrawing();
      demo.dataset.demoState = 'ready';
      button.disabled = false;
      button.textContent = text.replay;
      setStatus(copy.stopped);
    };
    const finish = reduced => {
      playing = false;
      cancelFrame();
      demo.classList.remove('is-playing');
      demo.classList.add('is-complete');
      demo.dataset.demoState = 'complete';
      if (ball) setBall(points[points.length - 1].x, points[points.length - 1].y);
      for (const impact of impacts) impact.classList.toggle('is-active', reduced);
      for (const route of routes) {
        route.pulse.style.opacity = '0';
        route.path.classList.add('is-active');
        route.stage.classList.add('is-active');
      }
      button.disabled = false;
      button.textContent = text.replay;
      setStatus(reduced ? text.reduced : text.complete);
    };

    const drawTacTac = elapsed => {
      let segment = points.length - 2;
      for (let index = 0; index < points.length - 1; index++) {
        if (elapsed <= points[index + 1].time) {
          segment = index;
          break;
        }
      }
      const from = points[segment];
      const to = points[segment + 1];
      const progress = clamp((elapsed - from.time) / (to.time - from.time));
      setBall(from.x + (to.x - from.x) * progress,
        from.y + (to.y - from.y) * progress -
        hopHeights[segment] * 4 * progress * (1 - progress));
      for (const impact of impacts) {
        const time = points[Number(impact.dataset.ttImpact) + 1]?.time;
        impact.classList.toggle('is-active', elapsed >= time && elapsed < time + 450);
        if (elapsed >= time && !soundedImpacts.has(time)) {
          soundedImpacts.add(time);
          window.PortfolioAudio?.play('impact', { gain: 0.045 });
        }
      }
    };
    const drawReceivePaths = elapsed => {
      for (const route of routes) {
        const progress = clamp((elapsed - route.delay) / route.travel);
        const point = route.path.getPointAtLength(route.path.getTotalLength() * progress);
        route.pulse.setAttribute('cx', point.x.toFixed(2));
        route.pulse.setAttribute('cy', point.y.toFixed(2));
        route.pulse.style.opacity = elapsed >= route.delay && progress < 1 ? '1' : '0';
        route.path.classList.toggle('is-active', elapsed >= route.delay);
        route.stage.classList.toggle('is-active', progress === 1);
        if (elapsed >= route.delay && !route.started) {
          route.started = true;
          window.PortfolioAudio?.play('frame', { gain: 0.045 });
        }
        if (progress === 1 && !route.arrived) {
          route.arrived = true;
          // Both paths are explanatory markers, including the unvalidated
          // Arduino receive path, so neither receives a success fanfare.
          window.PortfolioAudio?.play('tick', { gain: 0.045 });
        }
      }
      if (elapsed >= 2600 && !referenceAnnounced) {
        referenceAnnounced = true;
        setStatus(text.reference);
      }
    };
    const tick = timestamp => {
      frame = 0;
      if (!playing) return;
      if (document.hidden || !inViewport(demo)) {
        stop();
        return;
      }
      const elapsed = Math.min(duration, timestamp - startTime);
      if (kind === 'tac-tac') drawTacTac(elapsed);
      else drawReceivePaths(elapsed);
      if (elapsed >= duration) finish(false);
      else frame = window.requestAnimationFrame(tick);
    };
    const play = event => {
      window.PortfolioAudio?.unlock(event);
      cancelFrame();
      resetDrawing();
      referenceAnnounced = false;
      soundedImpacts.clear();
      if (document.hidden || !inViewport(demo)) {
        demo.dataset.demoState = 'ready';
        button.disabled = false;
        button.textContent = text.replay;
        setStatus(copy.stopped);
        return;
      }
      if (motionPreference.matches) {
        finish(true);
        return;
      }
      playing = true;
      startTime = window.performance.now();
      demo.classList.add('is-playing');
      demo.dataset.demoState = 'playing';
      button.disabled = true;
      button.textContent = text.playing;
      setStatus(text.running);
      frame = window.requestAnimationFrame(tick);
    };

    resetDrawing();
    demo.dataset.demoState = 'ready';
    button.textContent = text.play;
    setStatus(text.ready);
    button.addEventListener('click', play);
    controls.hidden = false;
    controllers.push({ demo, stop, finish: () => finish(true), isPlaying: () => playing });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) continue;
        controllers.find(controller => controller.demo === entry.target)?.stop();
      }
    });
    for (const controller of controllers) observer.observe(controller.demo);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const controller of controllers) controller.stop();
  });
  window.addEventListener('pagehide', () => {
    for (const controller of controllers) controller.stop();
  });
  const stopInvisible = () => {
    for (const controller of controllers) {
      if (controller.isPlaying() && !inViewport(controller.demo)) controller.stop();
    }
  };
  window.addEventListener('scroll', stopInvisible, { passive: true });
  window.addEventListener('resize', stopInvisible);
  const onMotionChange = event => {
    if (!event.matches) return;
    for (const controller of controllers) {
      if (controller.isPlaying()) controller.finish();
    }
  };
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionChange);
  else if (motionPreference.addListener) motionPreference.addListener(onMotionChange);
})();
