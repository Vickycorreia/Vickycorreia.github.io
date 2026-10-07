(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const STEP = 1 / 120;
  const TIME_SCALE = .8;
  const ROCKET_RADIUS = 5;
  const AIM_LENGTH = 70;
  const MAX_POWER = 210;
  const PREVIEW_TIME = .75;
  const PREVIEW_ARC = 65;
  const SCENE_BOUNDS = { minX: -130, maxX: 770, minY: -135, maxY: 695 };
  const BODIES = [
    { id: 'sun', x: -55, y: -40, radius: 90, mu: 900000, localRadius: 160 },
    { id: 'earth', x: 445, y: 185, radius: 39, mu: 500000, localRadius: 110 },
    { id: 'moon', x: 218, y: 136, radius: 19, mu: 100000, localRadius: 75 },
    { id: 'mars', x: 225, y: 425, radius: 29, mu: 300000, localRadius: 105 }
  ];
  const SETTINGS = {
    earth: { radius: 58, angle: -Math.PI / 2 },
    moon: { radius: 32, angle: Math.PI },
    mars: { radius: 44, angle: Math.PI / 4 }
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // One fixed-step velocity-Verlet integrator drives both preview and flight.
  // Fixed bodies and schematic units: every visible body contributes gravity.
  const configuration = name => {
    const setting = SETTINGS[name] || SETTINGS.earth;
    const body = BODIES.find(item => item.id === name) || BODIES.find(item => item.id === 'earth');
    return { name: body.id, body, startRadius: setting.radius, startAngle: setting.angle,
      mu: body.mu, bodies: BODIES, bounds: SCENE_BOUNDS };
  };
  const initialFlight = (config, angle = config.startAngle + Math.PI / 2, power = 100) => {
    const speed = Math.sqrt(config.mu / config.startRadius) * clamp(power, 0, MAX_POWER) / 100;
    return { x: config.body.x + config.startRadius * Math.cos(config.startAngle),
      y: config.body.y + config.startRadius * Math.sin(config.startAngle),
      vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
      winding: 0, time: 0, outcome: null, hitBody: null, orbitBody: null,
      orbitHistory: Object.fromEntries(config.bodies.map(body => [body.id, { winding: 0, minDistance: Infinity }])) };
  };
  const acceleration = (config, x, y) => {
    let ax = 0, ay = 0;
    for (const body of config.bodies) {
      const dx = body.x - x, dy = body.y - y;
      const radius = Math.max(1, Math.hypot(dx, dy));
      const factor = body.mu / (radius * radius * radius);
      ax += factor * dx; ay += factor * dy;
    }
    return { x: ax, y: ay };
  };
  const potentialAt = (config, x, y) => config.bodies.reduce((sum, body) =>
    sum - body.mu / Math.max(1, Math.hypot(x-body.x, y-body.y)), 0);
  const totalEnergy = (config, flight) => (flight.vx*flight.vx+flight.vy*flight.vy)/2 + potentialAt(config, flight.x, flight.y);
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
    next.orbitHistory = {};
    for (const body of config.bodies) {
      const oldX = current.x-body.x, oldY = current.y-body.y;
      const dx = next.x-body.x, dy = next.y-body.y;
      const oldRadius = Math.hypot(oldX,oldY), radius = Math.hypot(dx,dy);
      const clear = Math.min(oldRadius,radius) > body.radius+ROCKET_RADIUS;
      const local = Math.max(oldRadius,radius) <= body.localRadius;
      const previous = current.orbitHistory[body.id];
      next.orbitHistory[body.id] = clear && local ? {
        winding: previous.winding + Math.atan2(oldX*dy-oldY*dx,oldX*dx+oldY*dy),
        minDistance: Math.min(previous.minDistance,oldRadius,radius)
      } : { winding: 0, minDistance: Infinity };
    }
    next.winding = next.orbitHistory[config.name].winding;
    if (!next.outcome) {
      const completed = config.bodies.filter(body => Math.abs(next.orbitHistory[body.id].winding) >= TAU &&
        next.orbitHistory[body.id].minDistance > body.radius+ROCKET_RADIUS);
      const observed = completed.find(body => body.id === config.name) || completed[0];
      if (observed) { next.outcome = 'orbit'; next.orbitBody = observed.id; }
    }
    const bounds = config.bounds || SCENE_BOUNDS;
    if (next.x < bounds.minX || next.x > bounds.maxX || next.y < bounds.minY || next.y > bounds.maxY) next.outcome = 'escape';
    return next;
  };
  const preview = (config, angle, power) => {
    let flight = initialFlight(config, angle, power);
    const points = [{ x: flight.x, y: flight.y }];
    let arcLength = 0;
    for (let count = 0; count < Math.floor(PREVIEW_TIME/STEP); count += 1) {
      const next = stepFlight(config, flight);
      const distance = Math.hypot(next.x-flight.x,next.y-flight.y);
      if (arcLength+distance > PREVIEW_ARC) break;
      arcLength += distance; flight = next;
      points.push({ x: flight.x, y: flight.y });
      if (flight.outcome) break;
    }
    return { points, time: flight.time, arcLength };
  };

  // The physics is importable by local Node checks, with no browser debug API.
  if (typeof module === 'object' && module.exports) {
    module.exports = { configuration, initialFlight, stepFlight, acceleration, potentialAt, totalEnergy,
      segmentCollision, preview, predict: preview, STEP, TIME_SCALE, BODIES, SETTINGS, SCENE_BOUNDS, PREVIEW_TIME, PREVIEW_ARC, ROCKET_RADIUS };
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
    names: { sun: 'le Soleil', earth: 'la Terre', moon: 'la Lune', mars: 'Mars' },
    shortNames: { earth: 'Terre', moon: 'Lune', mars: 'Mars' },
    states: { aiming: 'Prêt', flying: 'En vol', orbit: 'Tour observé', collision: 'Collision', escape: 'Hors zone' },
    ready: name => `Départ depuis ${name}.`,
    aimingDetail: 'Les pointillés montrent le début du trajet.',
    flying: 'Trajectoire en cours.', flyingDetail: 'Les astres infléchissent le trajet.',
    orbit: name => `Un tour autour de ${name}.`, orbitDetail: 'Une révolution a été observée. Recommence pour explorer un autre lancement.',
    collision: 'Contact avec un astre.', collisionDetail: 'Recommence pour ajuster la direction ou la poussée.',
    escape: 'La fusée quitte la scène.', escapeDetail: 'La trajectoire sort de la zone représentée. Recommence pour ajuster le lancement.',
    paused: 'Vol en pause.', pausedDetail: 'Reprends le vol quand tu le souhaites.', pause: 'Pause', resume: 'Reprendre',
    svgLabel: 'Scène orbitale. Règle la direction et la force du lancement.',
    controlsLabel: (name, power, angle) => `Lancement autour de ${name}. Force ${power} pour cent, direction ${angle} degrés.`
  } : {
    names: { sun: 'the Sun', earth: 'Earth', moon: 'the Moon', mars: 'Mars' },
    shortNames: { earth: 'Earth', moon: 'Moon', mars: 'Mars' },
    states: { aiming: 'Ready', flying: 'Flying', orbit: 'Turn observed', collision: 'Collision', escape: 'Out of area' },
    ready: name => `Departure from ${name}.`,
    aimingDetail: 'The dots show the beginning of the trajectory.',
    flying: 'Trajectory in progress.', flyingDetail: 'The celestial bodies bend the path.',
    orbit: name => `One revolution around ${name}.`, orbitDetail: 'A full turn has been observed. Reset to explore another launch.',
    collision: 'Contact with a celestial body.', collisionDetail: 'Reset to adjust the direction or thrust.',
    escape: 'The rocket has left the scene.', escapeDetail: 'The trajectory is outside the displayed area. Reset to adjust the launch.',
    paused: 'Flight paused.', pausedDetail: 'Resume whenever you’re ready.', pause: 'Pause', resume: 'Resume',
    svgLabel: 'Orbital scene. Adjust the direction and strength of your launch.',
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
  const flightClip = append(defs, 'clipPath', { id: 'orbit-flight-view', clipPathUnits: 'userSpaceOnUse' });
  append(flightClip, 'path', { d: 'M0 0H640V560H0Z' });
  const marker = append(defs, 'marker', { id: 'orbit-game-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  append(marker, 'path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: '#9a6846' });
  const gradient = (id, stops, attrs = {}) => {
    const element = append(defs, 'radialGradient', { id, cx: '32%', cy: '25%', r: '80%', ...attrs });
    stops.forEach(([offset,color,opacity = 1]) => append(element, 'stop', { offset, 'stop-color': color, 'stop-opacity': opacity }));
  };
  gradient('orbit-earth-gradient', [['0%','#b9d0d5'],['48%','#6c9dab'],['100%','#294d60']]);
  gradient('orbit-moon-gradient', [['0%','#e6e4dc'],['52%','#bcbfb9'],['100%','#727c83']]);
  gradient('orbit-mars-gradient', [['0%','#d0ad8d'],['50%','#ad775b'],['100%','#644638']]);
  gradient('orbit-sun-glow-gradient', [['0%','#e5c8a0',.35],['35%','#d7b28c',.15],['70%','#cfaa82',.04],['100%','#cfaa82',0]], { cx: '50%', cy: '50%', r: '50%' });
  gradient('orbit-sun-disc-gradient', [['0%','#f0ddc0',.75],['60%','#dfbd91',.45],['100%','#c79d72',.08]], { cx: '44%', cy: '40%', r: '64%' });
  const space = append(svg, 'g', { class: 'orbit-space', 'aria-hidden': 'true' });
  const groups = new Map();
  for (const body of BODIES) {
    const group = append(space, 'g', { class: body.id === 'sun' ? 'orbit-sun' : 'orbit-planet', 'data-planet': body.id, transform: `translate(${body.x} ${body.y})` });
    groups.set(body.id, group);
    if (body.id === 'sun') {
      append(group, 'circle', { class: 'orbit-sun-glow', r: 220, fill: 'url(#orbit-sun-glow-gradient)' });
      append(group, 'circle', { class: 'orbit-sun-body', r: body.radius, fill: 'url(#orbit-sun-disc-gradient)', opacity: .68 });
      continue;
    }
    const clip = append(defs, 'clipPath', { id: `orbit-${body.id}-surface` });
    append(clip, 'circle', { r: body.radius });
    append(group, 'circle', { class: 'orbit-planet-body', r: body.radius, fill: `url(#orbit-${body.id}-gradient)` });
    const surface = append(group, 'g', { 'clip-path': `url(#orbit-${body.id}-surface)` });
    if (body.id === 'earth') {
      append(surface, 'path', { class: 'orbit-planet-detail', d: 'M-34-19 Q-27-33-14-31 L-4-23 0-10 -11-2 -18 11 -27 2 Z M7 5 Q17-6 30-3 L37 7 27 13 23 28 9 32 3 20 Z', fill: '#6f8f7a', opacity: .63 });
      append(surface, 'path', { class: 'orbit-planet-detail', d: 'M-26-24 Q-5-34 15-24 M-32 12 Q-3 20 29 13', fill: 'none', stroke: '#e3eeeb', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .38 });
      append(group, 'circle', { r: body.radius+.8, fill: 'none', stroke: '#90b5c5', 'stroke-width': 1.3, opacity: .4 });
    } else if (body.id === 'moon') {
      for (const [x,y,radius] of [[-7,-10,4],[8,-3,5],[-8,7,4],[6,11,2.5],[-13,-2,2]]) {
        append(surface, 'circle', { class: 'orbit-planet-detail', cx: x, cy: y, r: radius, fill: '#7c8586', stroke: '#e8e8df', 'stroke-width': .65, opacity: .2 });
      }
    } else if (body.id === 'mars') {
      append(surface, 'path', { class: 'orbit-planet-detail', d: 'M-26-4 Q-8-13 7-9 L23-2 15 8 -1 4 -15 12 Z M2 17 Q17 11 27 21 L11 30 Z', fill: '#795747', opacity: .22 });
      append(surface, 'circle', { class: 'orbit-planet-detail', cx: -12, cy: -13, r: 4, fill: '#6f5143', opacity: .16 });
    }
    append(surface, 'path', { class: 'orbit-planet-shade', d: `M 0 ${-body.radius} A ${body.radius} ${body.radius} 0 0 1 0 ${body.radius} Q ${body.radius*.8} 0 0 ${-body.radius}`, fill: '#213d4d', opacity: .15 });
    append(group, 'text', { class: 'orbit-planet-label', x: 0, y: body.radius+23, 'text-anchor': 'middle', fill: '#607581', 'font-size': 11, 'font-family': 'inherit', 'font-weight': 500, 'letter-spacing': '.05em' }, copy.shortNames[body.id]);
  }
  // Let the distant Sun blend into the hero while keeping the flight inside its viewing area.
  const flightLayer = append(svg, 'g', { class: 'orbit-flight-layer', 'clip-path': 'url(#orbit-flight-view)' });
  const targetHalo = append(flightLayer, 'circle', { class: 'orbit-target-halo', fill: 'none', stroke: '#a5825d', 'stroke-width': 1, opacity: .45, 'aria-hidden': 'true' });
  const previewPath = append(flightLayer, 'path', { class: 'orbit-preview-path', fill: 'none', stroke: '#22638b', 'stroke-width': 2, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round', opacity: .68, 'aria-hidden': 'true' });
  const trailPath = append(flightLayer, 'path', { class: 'orbit-flight-trail', fill: 'none', stroke: '#398b92', 'stroke-width': 2.1, opacity: .55, 'aria-hidden': 'true' });
  const aimArrow = append(flightLayer, 'line', { class: 'orbit-aim-arrow', stroke: '#9a6846', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'marker-end': 'url(#orbit-game-arrow)', 'aria-hidden': 'true' });
  const aimHandle = append(flightLayer, 'circle', { class: 'orbit-aim-handle', r: 5, fill: '#fffdf6', stroke: '#9a6846', 'stroke-width': 2, 'aria-hidden': 'true' });
  const rocket = append(flightLayer, 'g', { class: 'orbit-rocket', 'aria-hidden': 'true' });
  const hitArea = append(rocket, 'circle', { class: 'orbit-rocket-hit-area', r: 40, fill: 'transparent', 'pointer-events': 'all' });
  const flame = append(rocket, 'path', { class: 'orbit-rocket-flame', d: 'M-4 11 Q0 25 4 11 Z', fill: '#d5a15e' });
  append(rocket, 'path', { d: 'M-5 5 L-12 13 -5 12 M5 5 L12 13 5 12', fill: '#b47a51', stroke: '#17364e', 'stroke-width': 1.2 });
  append(rocket, 'path', { d: 'M0-16 Q-9-6-6 12 L6 12 Q9-6 0-16 Z', fill: '#fffdf6', stroke: '#17364e', 'stroke-width': 1.6 });
  append(rocket, 'circle', { cx: 0, cy: -2, r: 3.6, fill: '#82b8c8', stroke: '#17364e', 'stroke-width': 1 });
  const impact = append(flightLayer, 'g', { class: 'orbit-impact-mark', visibility: 'hidden', 'aria-hidden': 'true' });
  append(impact, 'circle', { r: 13, fill: '#f8e5d9', stroke: '#b76b50', 'stroke-width': 1.5 });
  append(impact, 'path', { d: 'M-5-5 L5 5 M5-5 L-5 5', fill: 'none', stroke: '#b76b50', 'stroke-width': 2 });
  const offscreen = append(flightLayer, 'g', { class: 'orbit-escape-mark', visibility: 'hidden', 'aria-hidden': 'true' });
  append(offscreen, 'path', { d: 'M-9 6 L0-7 9 6', fill: 'none', stroke: '#9a6846', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  let config = configuration('earth');
  let angle = config.startAngle + Math.PI / 2;
  let power = 100;
  let state = 'aiming';
  let flight = null;
  let drag = null;
  let userPaused = false;
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
    const prediction = preview(config, angle, power);
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
    else if (state === 'orbit') { headline = copy.orbit(copy.names[flight.orbitBody]); explanation = copy.orbitDetail; }
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
    state = 'aiming'; flight = null; userPaused = false; trail = []; trailSteps = 0;
    trailPath.setAttribute('d', ''); impact.setAttribute('visibility', 'hidden'); offscreen.setAttribute('visibility', 'hidden');
    targetHalo.setAttribute('cx', config.body.x); targetHalo.setAttribute('cy', config.body.y); targetHalo.setAttribute('r', config.body.radius+10);
    groups.forEach((group, name) => group.classList.toggle('is-target', name === config.name));
    syncUI(); renderAim(); schedule();
  };
  const launchFlight = () => {
    if (state !== 'aiming') return;
    cancelDrag(false); flight = initialFlight(config, angle, power); state = 'flying'; userPaused = false;
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
