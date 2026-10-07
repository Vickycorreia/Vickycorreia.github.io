(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const STEP = 1 / 120;
  const TIME_SCALE = 1.6;
  const ROCKET_RADIUS = 5;
  const AIM_LENGTH = 70;
  const MAX_POWER = 210;
  const BODIES = [
    { id: 'sun', x: 290, y: 260, radius: 38, color: '#edbc6e' },
    { id: 'mercury', x: 215, y: 258, radius: 10, color: '#ae9684' },
    { id: 'venus', x: 339, y: 139, radius: 16, color: '#d7a568' },
    { id: 'earth', x: 480, y: 180, radius: 23, color: '#80b8c5' },
    { id: 'mars', x: 195, y: 410, radius: 20, color: '#cd8865' },
    { id: 'jupiter', x: 108, y: 168, radius: 29, color: '#d2ad86' },
    { id: 'saturn', x: 470, y: 415, radius: 29, color: '#d9bf82' },
    { id: 'uranus', x: 573, y: 305, radius: 16, color: '#91c2c2' },
    { id: 'neptune', x: 79, y: 390, radius: 15, color: '#829ebb' }
  ];
  const SETTINGS = {
    earth: { radius: 70, angle: -Math.PI / 2, mu: 150000 },
    mars: { radius: 64, angle: 0, mu: 120000 },
    saturn: { radius: 78, angle: 0, mu: 190000 }
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // One fixed-step velocity-Verlet integrator drives both preview and flight.
  // These are game units and imaginary distances, rather than astronomical data.
  const configuration = name => {
    const setting = SETTINGS[name] || SETTINGS.earth;
    const body = BODIES.find(item => item.id === name) || BODIES.find(item => item.id === 'earth');
    return { name: body.id, body, startRadius: setting.radius, startAngle: setting.angle,
      mu: setting.mu, escapeRadius: setting.radius * 4, bodies: BODIES };
  };
  const initialFlight = (config, angle = config.startAngle + Math.PI / 2, power = 100) => {
    const speed = Math.sqrt(config.mu / config.startRadius) * clamp(power, 0, MAX_POWER) / 100;
    return { x: config.body.x + config.startRadius * Math.cos(config.startAngle),
      y: config.body.y + config.startRadius * Math.sin(config.startAngle),
      vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
      winding: 0, time: 0, outcome: null, hitBody: null, longOrbit: false };
  };
  const acceleration = (config, x, y) => {
    const dx = x - config.body.x, dy = y - config.body.y;
    const radius = Math.max(1, Math.hypot(dx, dy));
    const factor = -config.mu / (radius * radius * radius);
    return { x: factor * dx, y: factor * dy };
  };
  const segmentCollision = (config, before, after) => {
    const dx = after.x - before.x, dy = after.y - before.y;
    const a = dx * dx + dy * dy;
    let earliest = null;
    for (const body of config.bodies) {
      const ox = before.x - body.x, oy = before.y - body.y;
      const radius = body.radius + ROCKET_RADIUS;
      const c = ox * ox + oy * oy - radius * radius;
      let fraction = null;
      if (c <= 0) fraction = 0;
      else if (a > 0) {
        const b = 2 * (ox * dx + oy * dy);
        const discriminant = b * b - 4 * a * c;
        if (discriminant >= 0) {
          const entry = (-b - Math.sqrt(discriminant)) / (2 * a);
          if (entry >= 0 && entry <= 1) fraction = entry;
        }
      }
      if (fraction !== null && (!earliest || fraction < earliest.fraction)) earliest = { body, fraction };
    }
    return earliest;
  };
  const stepFlight = (config, current) => {
    if (current.outcome && current.outcome !== 'orbit') return current;
    const first = acceleration(config, current.x, current.y);
    const next = { ...current,
      x: current.x + current.vx * STEP + first.x * STEP * STEP / 2,
      y: current.y + current.vy * STEP + first.y * STEP * STEP / 2,
      time: current.time + STEP };
    const second = acceleration(config, next.x, next.y);
    next.vx = current.vx + (first.x + second.x) * STEP / 2;
    next.vy = current.vy + (first.y + second.y) * STEP / 2;
    const collision = segmentCollision(config, current, next);
    if (collision) {
      next.x = current.x + (next.x - current.x) * collision.fraction;
      next.y = current.y + (next.y - current.y) * collision.fraction;
      next.outcome = 'collision'; next.hitBody = collision.body.id;
      return next;
    }
    const oldX = current.x - config.body.x, oldY = current.y - config.body.y;
    const dx = next.x - config.body.x, dy = next.y - config.body.y;
    next.winding += Math.atan2(oldX * dy - oldY * dx, oldX * dx + oldY * dy);
    const radius = Math.hypot(dx, dy);
    const energy = (next.vx * next.vx + next.vy * next.vy) / 2 - config.mu / radius;
    if (energy >= 0 && radius >= config.escapeRadius && dx * next.vx + dy * next.vy > 0) next.outcome = 'escape';
    else if (!next.outcome && energy < 0) {
      if (Math.abs(next.winding) >= TAU) next.outcome = 'orbit';
      else if (radius >= config.escapeRadius) {
        const momentum = dx * next.vy - dy * next.vx;
        const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * energy * momentum * momentum / (config.mu * config.mu)));
        const periapsis = momentum * momentum / (config.mu * (1 + eccentricity));
        if (periapsis > config.body.radius + ROCKET_RADIUS) {
          next.outcome = 'orbit'; next.longOrbit = true;
        }
      }
    }
    return next;
  };
  const predict = (config, angle, power) => {
    let flight = initialFlight(config, angle, power);
    const points = [{ x: flight.x, y: flight.y }];
    for (let count = 0; count < 24000; count += 1) {
      flight = stepFlight(config, flight);
      if (count % 6 === 0 || flight.outcome) points.push({ x: flight.x, y: flight.y });
      if (flight.outcome) break;
    }
    return { points, flight };
  };

  // The physics is importable by local Node checks, with no browser debug API.
  if (typeof module === 'object' && module.exports) {
    module.exports = { configuration, initialFlight, stepFlight, predict, STEP, TIME_SCALE, BODIES };
  }
  if (typeof document === 'undefined') return;
  const root = document.querySelector('.orbit-game');
  if (!root) return;
  const svg = root.querySelector('svg.orbit-system');
  const launch = root.querySelector('.orbit-launch');
  const reset = root.querySelector('.orbit-reset');
  const pause = root.querySelector('.orbit-pause');
  const message = root.querySelector('.orbit-message');
  const detail = root.querySelector('.orbit-detail');
  const powerOutput = root.querySelector('.orbit-power output');
  const stateLabel = root.querySelector('.orbit-state-label');
  const destinations = [...root.querySelectorAll('.orbit-destinations button[data-planet]')];
  if (!svg || !launch || !reset || !pause || !message || !powerOutput || !stateLabel || destinations.length !== 3) return;
  const french = document.documentElement.lang === 'fr';
  const copy = french ? {
    names: { sun: 'le Soleil', earth: 'la Terre', mars: 'Mars', saturn: 'Saturne', mercury: 'Mercure', venus: 'Vénus', jupiter: 'Jupiter', uranus: 'Uranus', neptune: 'Neptune' },
    shortNames: { earth: 'Terre', mars: 'Mars', saturn: 'Saturne' },
    states: { aiming: 'Prêt', flying: 'En vol', orbit: 'En orbite', collision: 'Collision', escape: 'Échappée' },
    ready: name => `À toi de jouer autour de ${name}.`,
    aimingDetail: 'Suis les pointillés, puis lance la fusée.',
    flying: 'La fusée est en route !', flyingDetail: 'Voyons où cette impulsion la mène.',
    orbit: name => `Un tour complet autour de ${name} !`, orbitDetail: 'Orbite réussie. Tu peux recommencer ou essayer une autre planète.',
    longOrbit: name => `Une grande orbite autour de ${name} !`, longOrbitDetail: 'La fusée reste liée à la planète, même quand elle passe hors cadre. Recommence quand tu veux.',
    collision: 'La fusée a heurté un astre.', collisionDetail: 'Essaie une impulsion un peu plus sur le côté.',
    escape: 'La fusée s’est échappée !', escapeDetail: 'Essaie une impulsion plus douce pour rester en orbite.',
    paused: 'Vol en pause.', pausedDetail: 'Reprends le vol quand tu veux.', pause: 'Pause', resume: 'Reprendre',
    wide: 'Une grande orbite, très lointaine.', wideDetail: 'Le tour peut être long. Recommence pour essayer une trajectoire plus proche.',
    svgLabel: 'Petit jeu orbital. Règle la direction et la force du lancement.',
    controlsLabel: (name, power, angle) => `Lancement autour de ${name}. Force ${power} pour cent, direction ${angle} degrés.`
  } : {
    names: { sun: 'the Sun', earth: 'Earth', mars: 'Mars', saturn: 'Saturn', mercury: 'Mercury', venus: 'Venus', jupiter: 'Jupiter', uranus: 'Uranus', neptune: 'Neptune' },
    shortNames: { earth: 'Earth', mars: 'Mars', saturn: 'Saturn' },
    states: { aiming: 'Ready', flying: 'Flying', orbit: 'In orbit', collision: 'Collision', escape: 'Escaped' },
    ready: name => `Your turn to fly around ${name}.`,
    aimingDetail: 'Follow the dotted path, then launch the rocket.',
    flying: 'The rocket is on its way!', flyingDetail: 'Let’s see where this push takes it.',
    orbit: name => `One complete orbit around ${name}!`, orbitDetail: 'Orbit achieved. Start again or try another planet.',
    longOrbit: name => `A wide orbit around ${name}!`, longOrbitDetail: 'The rocket stays bound to the planet, even when it travels out of frame. Restart whenever you like.',
    collision: 'The rocket hit a celestial body.', collisionDetail: 'Try a push a little more to the side.',
    escape: 'The rocket escaped!', escapeDetail: 'Try a gentler push to stay in orbit.',
    paused: 'Flight paused.', pausedDetail: 'Resume whenever you’re ready.', pause: 'Pause', resume: 'Resume',
    wide: 'This orbit goes a long way out.', wideDetail: 'A full loop can take a while. Reset to try a closer path.',
    svgLabel: 'Small orbital game. Adjust the direction and strength of your launch.',
    controlsLabel: (name, power, angle) => `Launch around ${name}. Force ${power} percent, direction ${angle} degrees.`
  };

  const NS = 'http://www.w3.org/2000/svg';
  const node = (tag, attrs = {}, text) => {
    const element = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const append = (parent, tag, attrs, text) => { const element = node(tag, attrs, text); parent.append(element); return element; };
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 0 640 560');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-describedby', 'orbit-instructions orbit-keyboard');
  svg.setAttribute('aria-label', copy.svgLabel);
  append(svg, 'title', {}, copy.svgLabel);
  const defs = append(svg, 'defs');
  const marker = append(defs, 'marker', { id: 'orbit-game-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  append(marker, 'path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: '#9a6846' });
  const space = append(svg, 'g', { class: 'orbit-space', 'aria-hidden': 'true' });
  append(space, 'rect', { x: 0, y: 0, width: 640, height: 560, rx: 32, fill: '#f8f5ee' });
  const stars = [[54,65],[163,52],[276,78],[434,49],[557,78],[607,173],[62,270],[362,355],[316,487],[543,520],[116,516],[39,453],[403,112],[603,466],[237,177],[45,139]];
  stars.forEach(([x,y], index) => {
    append(space, 'path', { class: 'orbit-star', d: `M ${x-3} ${y} H ${x+3} M ${x} ${y-3} V ${y+3}`, stroke: index % 2 ? '#b59670' : '#6f9ea9', 'stroke-width': 1.4, opacity: .5 });
  });
  for (const radius of [62,102,145,192,244,295]) {
    append(space, 'ellipse', { class: 'orbit-solar-ring', cx: 290, cy: 260, rx: radius, ry: radius * .67, transform: 'rotate(-16 290 260)', fill: 'none', stroke: '#cbd8d6', 'stroke-width': 1, opacity: .65 });
  }
  const groups = new Map();
  for (const body of BODIES) {
    const group = append(space, 'g', { class: body.id === 'sun' ? 'orbit-sun' : 'orbit-planet', 'data-planet': body.id, transform: `translate(${body.x} ${body.y})` });
    groups.set(body.id, group);
    if (body.id === 'sun') {
      const rays = append(group, 'g', { class: 'orbit-sun-rays' });
      for (let ray = 0; ray < 12; ray += 1) {
        const angle = ray * TAU / 12;
        append(rays, 'line', { class: 'orbit-sun-ray', x1: Math.cos(angle)*44, y1: Math.sin(angle)*44, x2: Math.cos(angle)*51, y2: Math.sin(angle)*51, stroke: '#dbad60', 'stroke-width': 3, 'stroke-linecap': 'round' });
      }
    }
    if (body.id === 'saturn') append(group, 'ellipse', { class: 'orbit-planet-ring', rx: 45, ry: 12, transform: 'rotate(-20)', fill: 'none', stroke: '#b29264', 'stroke-width': 7, opacity: .72 });
    append(group, 'circle', { class: 'orbit-planet-body', r: body.radius, fill: body.color, stroke: '#17364e', 'stroke-width': 1.4 });
    append(group, 'path', { class: 'orbit-planet-shade', d: `M 0 ${-body.radius} A ${body.radius} ${body.radius} 0 0 1 0 ${body.radius} Q ${body.radius*.7} 0 0 ${-body.radius}`, fill: '#17364e', opacity: .09 });
    if (body.id === 'earth') {
      append(group, 'path', { class: 'orbit-planet-detail', d: 'M-18-12 L-7-17 1-8 -3 1 -14 3 Z M8 4 L20 1 17 12 8 16 3 10 Z', fill: '#648f77', opacity: .8 });
    } else if (body.id === 'jupiter') {
      append(group, 'path', { class: 'orbit-planet-detail', d: 'M-23-12 Q0-5 23-12 M-27 0 Q0 8 27 0 M-23 14 Q0 21 23 14', fill: 'none', stroke: '#ac805e', 'stroke-width': 4, opacity: .65 });
    } else if (body.id === 'mars') {
      append(group, 'circle', { class: 'orbit-planet-detail', cx: -10, cy: -9, r: 5, fill: '#aa634e', opacity: .4 });
    }
    if (body.id === 'sun' || SETTINGS[body.id]) {
      const offset = body.id === 'sun' ? 9 : 6;
      append(group, 'circle', { class: 'orbit-planet-face', cx: -offset, cy: 0, r: 1.9, fill: '#17364e' });
      append(group, 'circle', { class: 'orbit-planet-face', cx: offset, cy: 0, r: 1.9, fill: '#17364e' });
      append(group, 'path', { class: 'orbit-planet-face', d: `M ${-offset/2} 7 Q 0 11 ${offset/2} 7`, fill: 'none', stroke: '#17364e', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
    }
    if (SETTINGS[body.id]) append(group, 'text', { class: 'orbit-planet-label', x: 0, y: body.radius + 23, 'text-anchor': 'middle', fill: '#405c6d', 'font-size': 12, 'font-family': 'inherit', 'font-weight': 650 }, copy.shortNames[body.id]);
  }
  const targetHalo = append(svg, 'circle', { class: 'orbit-target-halo', fill: 'none', stroke: '#9a6846', 'stroke-width': 1.8, 'stroke-dasharray': '3 6', 'aria-hidden': 'true' });
  const previewPath = append(svg, 'path', { class: 'orbit-preview-path', fill: 'none', stroke: '#22638b', 'stroke-width': 2, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round', opacity: .68, 'aria-hidden': 'true' });
  const trailPath = append(svg, 'path', { class: 'orbit-flight-trail', fill: 'none', stroke: '#398b92', 'stroke-width': 2.1, opacity: .55, 'aria-hidden': 'true' });
  const aimArrow = append(svg, 'line', { class: 'orbit-aim-arrow', stroke: '#9a6846', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'marker-end': 'url(#orbit-game-arrow)', 'aria-hidden': 'true' });
  const aimHandle = append(svg, 'circle', { class: 'orbit-aim-handle', r: 5, fill: '#fffdf6', stroke: '#9a6846', 'stroke-width': 2, 'aria-hidden': 'true' });
  const rocket = append(svg, 'g', { class: 'orbit-rocket', 'aria-hidden': 'true' });
  const hitArea = append(rocket, 'circle', { class: 'orbit-rocket-hit-area', r: 40, fill: 'transparent', 'pointer-events': 'all' });
  const flame = append(rocket, 'path', { class: 'orbit-rocket-flame', d: 'M-4 11 Q0 25 4 11 Z', fill: '#d5a15e' });
  append(rocket, 'path', { d: 'M-5 5 L-12 13 -5 12 M5 5 L12 13 5 12', fill: '#b47a51', stroke: '#17364e', 'stroke-width': 1.2 });
  append(rocket, 'path', { d: 'M0-16 Q-9-6-6 12 L6 12 Q9-6 0-16 Z', fill: '#fffdf6', stroke: '#17364e', 'stroke-width': 1.6 });
  append(rocket, 'circle', { cx: 0, cy: -2, r: 3.6, fill: '#82b8c8', stroke: '#17364e', 'stroke-width': 1 });
  const impact = append(svg, 'g', { class: 'orbit-impact-mark', visibility: 'hidden', 'aria-hidden': 'true' });
  append(impact, 'circle', { r: 13, fill: '#f8e5d9', stroke: '#b76b50', 'stroke-width': 1.5 });
  append(impact, 'path', { d: 'M-5-5 L5 5 M5-5 L-5 5', fill: 'none', stroke: '#b76b50', 'stroke-width': 2 });
  const offscreen = append(svg, 'g', { class: 'orbit-escape-mark', visibility: 'hidden', 'aria-hidden': 'true' });
  append(offscreen, 'path', { d: 'M-9 6 L0-7 9 6', fill: 'none', stroke: '#9a6846', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  let config = configuration('earth');
  let angle = config.startAngle + Math.PI / 2;
  let power = 100;
  let state = 'aiming';
  let flight = null;
  let drag = null;
  let userPaused = false;
  let wideFlight = false;
  let raf = null;
  let lastTime = null;
  let accumulator = 0;
  let trail = [];
  let trailSteps = 0;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = root.querySelector('.orbit-stage') || svg;
  const firstRect = stage.getBoundingClientRect();
  let visible = firstRect.bottom > 0 && firstRect.top < window.innerHeight;
  const pathData = points => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const position = () => flight || initialFlight(config, angle, power);
  const running = () => visible && !document.hidden && !userPaused && (state === 'flying' || (state === 'orbit' && !motion.matches));

  const renderRocket = () => {
    const point = position();
    const heading = flight ? Math.atan2(flight.vy, flight.vx) : angle;
    rocket.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${heading * 180 / Math.PI + 90})`);
    flame.setAttribute('visibility', state === 'flying' || state === 'orbit' ? 'visible' : 'hidden');
    const outside = point.x < 16 || point.x > 624 || point.y < 16 || point.y > 544;
    offscreen.setAttribute('visibility', outside && (state === 'flying' || state === 'escape' || state === 'orbit') ? 'visible' : 'hidden');
    if (outside) {
      const dx = point.x - config.body.x, dy = point.y - config.body.y;
      const factor = Math.min(dx > 0 ? (620-config.body.x)/dx : dx < 0 ? (20-config.body.x)/dx : Infinity,
        dy > 0 ? (540-config.body.y)/dy : dy < 0 ? (20-config.body.y)/dy : Infinity);
      offscreen.setAttribute('transform', `translate(${config.body.x+dx*factor} ${config.body.y+dy*factor}) rotate(${Math.atan2(dy,dx)*180/Math.PI+90})`);
    }
  };
  const renderAim = () => {
    const prediction = predict(config, angle, power);
    previewPath.setAttribute('d', pathData(prediction.points));
    const start = initialFlight(config, angle, power);
    const length = AIM_LENGTH * power / 100;
    aimArrow.setAttribute('x1', start.x); aimArrow.setAttribute('y1', start.y);
    aimArrow.setAttribute('x2', start.x + Math.cos(angle)*length);
    aimArrow.setAttribute('y2', start.y + Math.sin(angle)*length);
    aimHandle.setAttribute('cx', start.x + Math.cos(angle)*length);
    aimHandle.setAttribute('cy', start.y + Math.sin(angle)*length);
    powerOutput.textContent = `${Math.round(power)}%`;
    svg.setAttribute('aria-label', copy.controlsLabel(copy.names[config.name], Math.round(power), Math.round(angle*180/Math.PI)));
    renderRocket();
  };
  const syncUI = () => {
    root.dataset.state = state;
    root.dataset.paused = String(userPaused);
    root.classList.toggle('orbit-paused', userPaused);
    stateLabel.textContent = userPaused ? copy.paused : copy.states[state];
    launch.disabled = state !== 'aiming'; reset.disabled = false;
    const canPause = state === 'flying' || (state === 'orbit' && !motion.matches);
    pause.hidden = !canPause; pause.disabled = !canPause;
    pause.textContent = userPaused ? copy.resume : copy.pause;
    pause.setAttribute('aria-pressed', String(userPaused));
    destinations.forEach(button => { button.disabled = false; button.setAttribute('aria-pressed', String(button.dataset.planet === config.name)); });
    previewPath.setAttribute('visibility', state === 'aiming' ? 'visible' : 'hidden');
    aimArrow.setAttribute('visibility', state === 'aiming' ? 'visible' : 'hidden');
    aimHandle.setAttribute('visibility', state === 'aiming' ? 'visible' : 'hidden');
    let headline, explanation;
    if (userPaused) { headline = copy.paused; explanation = copy.pausedDetail; }
    else if (state === 'aiming') { headline = copy.ready(copy.names[config.name]); explanation = copy.aimingDetail; }
    else if (state === 'orbit' && flight.longOrbit) { headline = copy.longOrbit(copy.names[config.name]); explanation = copy.longOrbitDetail; }
    else if (state === 'orbit') { headline = copy.orbit(copy.names[config.name]); explanation = copy.orbitDetail; }
    else if (state === 'flying' && wideFlight) { headline = copy.wide; explanation = copy.wideDetail; }
    else { headline = copy[state]; explanation = copy[`${state}Detail`]; }
    message.textContent = headline;
    if (detail) detail.textContent = explanation;
  };
  const stopRAF = () => {
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null; lastTime = null; accumulator = 0;
  };
  const schedule = () => {
    root.classList.toggle('orbit-inactive', !visible || document.hidden || userPaused);
    if (!running()) { stopRAF(); return; }
    if (raf === null) raf = window.requestAnimationFrame(tick);
  };
  const tick = timestamp => {
    raf = null;
    if (!running()) { lastTime = null; accumulator = 0; return; }
    if (lastTime !== null) accumulator += Math.min((timestamp-lastTime)/1000, .05)*TIME_SCALE;
    lastTime = timestamp;
    while (accumulator >= STEP && running()) {
      const previousOutcome = flight.outcome;
      flight = stepFlight(config, flight);
      accumulator -= STEP;
      trailSteps += 1;
      if (trailSteps % 4 === 0 || flight.outcome !== previousOutcome) {
        trail.push({ x: flight.x, y: flight.y });
        if (trail.length > 450) trail.shift();
      }
      if (flight.outcome && flight.outcome !== previousOutcome) {
        state = flight.outcome;
        if (state === 'collision') {
          impact.setAttribute('transform', `translate(${flight.x} ${flight.y})`);
          impact.setAttribute('visibility', 'visible');
        }
        syncUI();
      }
      if (state === 'flying' && !wideFlight) {
        const dx = flight.x-config.body.x, dy = flight.y-config.body.y;
        const radius = Math.hypot(dx,dy);
        const energy = (flight.vx*flight.vx+flight.vy*flight.vy)/2-config.mu/radius;
        const momentum = dx*flight.vy-dy*flight.vx;
        const eccentricity = Math.sqrt(Math.max(0,1+2*energy*momentum*momentum/(config.mu*config.mu)));
        const periapsis = momentum*momentum/(config.mu*(1+eccentricity));
        if (energy < 0 && radius > config.startRadius*2.6 && periapsis > config.body.radius+ROCKET_RADIUS+1) {
          wideFlight = true; syncUI();
        }
      }
    }
    trailPath.setAttribute('d', pathData(trail));
    renderRocket();
    schedule();
  };
  const cancelDrag = restore => {
    if (!drag) return;
    const previous = drag; drag = null;
    if (svg.hasPointerCapture?.(previous.id)) svg.releasePointerCapture(previous.id);
    if (restore) { angle = previous.angle; power = previous.power; renderAim(); }
  };
  const startAgain = name => {
    cancelDrag(false); stopRAF();
    config = configuration(name || config.name);
    angle = config.startAngle + Math.PI / 2; power = 100;
    state = 'aiming'; flight = null; userPaused = false; wideFlight = false; trail = []; trailSteps = 0;
    trailPath.setAttribute('d', ''); impact.setAttribute('visibility', 'hidden'); offscreen.setAttribute('visibility', 'hidden');
    targetHalo.setAttribute('cx', config.body.x); targetHalo.setAttribute('cy', config.body.y); targetHalo.setAttribute('r', config.body.radius+10);
    groups.forEach((group, name) => group.classList.toggle('is-target', name === config.name));
    syncUI(); renderAim(); schedule();
  };
  const launchFlight = () => {
    if (state !== 'aiming') return;
    cancelDrag(false); flight = initialFlight(config, angle, power); state = 'flying'; userPaused = false; wideFlight = false;
    trail = [{ x: flight.x, y: flight.y }]; trailSteps = 0; accumulator = 0; lastTime = null;
    syncUI(); renderRocket(); schedule();
  };
  const localPoint = event => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  };
  const updateDrag = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const point = localPoint(event); if (!point) return;
    if (!drag.moved && Math.hypot(point.x-drag.pointerX,point.y-drag.pointerY) < 4) return;
    drag.moved = true;
    const start = initialFlight(config, angle, power);
    const dx = point.x-start.x, dy = point.y-start.y;
    const length = Math.hypot(dx,dy);
    if (length > .1) angle = Math.atan2(dy,dx);
    power = clamp(length/AIM_LENGTH*100, 0, MAX_POWER);
    renderAim();
  };
  svg.addEventListener('pointerdown', event => {
    if (state !== 'aiming' || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = localPoint(event); if (!point) return;
    const start = initialFlight(config, angle, power);
    const matrix = svg.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.a,matrix.b) : 1;
    const hitRadius = Math.max(24,22/Math.max(.1,scale));
    const tipX = start.x+Math.cos(angle)*AIM_LENGTH*power/100;
    const tipY = start.y+Math.sin(angle)*AIM_LENGTH*power/100;
    if (Math.min(Math.hypot(point.x-start.x,point.y-start.y),Math.hypot(point.x-tipX,point.y-tipY)) > hitRadius) return;
    event.preventDefault(); svg.focus({ preventScroll: true });
    drag = { id: event.pointerId, pointerX: point.x, pointerY: point.y, angle, power, moved: false };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', event => { if (drag) { event.preventDefault(); updateDrag(event); } });
  svg.addEventListener('pointerup', event => { if (drag && event.pointerId === drag.id) { updateDrag(event); cancelDrag(false); } });
  svg.addEventListener('pointercancel', () => cancelDrag(true));
  svg.addEventListener('lostpointercapture', () => cancelDrag(true));
  svg.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); cancelDrag(true); return; }
    if (state !== 'aiming') return;
    if (event.key === 'Enter') { event.preventDefault(); launchFlight(); return; }
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); cancelDrag(true);
    if (event.key === 'ArrowLeft') angle -= Math.PI/36;
    if (event.key === 'ArrowRight') angle += Math.PI/36;
    if (event.key === 'ArrowUp') power = clamp(power+5,0,MAX_POWER);
    if (event.key === 'ArrowDown') power = clamp(power-5,0,MAX_POWER);
    renderAim();
  });
  launch.addEventListener('click', launchFlight);
  reset.addEventListener('click', () => startAgain());
  destinations.forEach(button => button.addEventListener('click', () => startAgain(button.dataset.planet)));
  pause.addEventListener('click', () => {
    if (state !== 'flying' && state !== 'orbit') return;
    userPaused = !userPaused; syncUI(); schedule();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(true); schedule(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio > .04;
      if (!visible) cancelDrag(true);
      schedule();
    }, { threshold: [0,.04] });
    observer.observe(stage);
  } else {
    const updateVisibility = () => {
      const rect = stage.getBoundingClientRect(); visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!visible) cancelDrag(true); schedule();
    };
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });
  }
  motion.addEventListener?.('change', () => { syncUI(); schedule(); });
  const sizeHitArea = () => {
    const matrix = svg.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.a,matrix.b) : 1;
    hitArea.setAttribute('r', Math.max(24,22/Math.max(.1,scale)));
  };
  if ('ResizeObserver' in window) new ResizeObserver(sizeHitArea).observe(svg);
  else window.addEventListener('resize', sizeHitArea, { passive: true });
  document.body.classList.add('has-orbit-game');
  startAgain('earth'); sizeHitArea();
})();
