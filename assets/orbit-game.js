(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const STEP = 1 / 120;
  const TIME_SCALE = .8;
  const ROCKET_RADIUS = 5;
  const AIM_LENGTH = 70;
  const MAX_POWER = 210;
  const PREVIEW_TIME = 4 * TIME_SCALE;
  const REFERENCE_TIME_LIMIT = 24;
  // Model units, not astronomical masses: mu = G * mass for every attractor.
  const GRAVITATIONAL_CONSTANT = 200000;
  const SCENE_BOUNDS = { minX: -130, maxX: 770, minY: -135, maxY: 695 };
  // Relative technical difficulty is an editorial weight, not a measured quantity.
  // The same weight determines mass and volume (constant model density).
  const PROJECT_DEFS = [
    { id: 'air-france', weight: 5, x: 440, y: 105, surface: 'earth', color: '#447d96',
      names: { en: 'Air France', fr: 'Air France' },
      hrefs: { en: '/projects/air-france-can.html', fr: '/fr/projects/air-france-can.html' } },
    { id: 'sand', weight: 4, x: 350, y: 450, surface: 'sand', color: '#af7954',
      names: { en: 'Sand', fr: 'Sable' },
      hrefs: { en: '/projects/sand-flow.html', fr: '/fr/projects/sand-flow.html' } },
    { id: 'stm32', weight: 3, x: 205, y: 112, surface: 'rock', color: '#7c8b9d',
      names: { en: 'STM32', fr: 'STM32' },
      hrefs: { en: '/projects/stm32-morse.html', fr: '/fr/projects/stm32-morse.html' } },
    { id: 'infrared', weight: 4, x: 149, y: 343, surface: 'bands', color: '#508c85',
      names: { en: 'Infrared audio', fr: 'Audio infrarouge' },
      hrefs: { en: '/projects/infrared-audio.html', fr: '/fr/projects/infrared-audio.html' } },
    { id: 'rafale', weight: 2, x: 557, y: 326, surface: 'rock', color: '#8e88a8',
      names: { en: 'Cardboard Rafale', fr: 'Rafale en carton' },
      status: { en: 'In progress', fr: 'En cours' },
      hrefs: { en: '/projects/cardboard-rafale.html', fr: '/fr/projects/cardboard-rafale.html' } }
  ].map(project => ({ ...project, bodyId: project.id }));
  const BODIES = [
    { id: 'sun', x: -100, y: -90, radius: 90, mass: 1.8, localRadius: 160 },
    ...PROJECT_DEFS.map(project => {
      const mass = project.weight / 5;
      const radius = 32 * Math.cbrt(mass);
      return { id: project.id, x: project.x, y: project.y, radius, mass,
        weight: project.weight, localRadius: radius * 2.8 };
    })
  ].map(body => ({ ...body, mu: GRAVITATIONAL_CONSTANT * body.mass }));
  // Prepared launches are calibrated in the combined field, not ideal circles.
  const PRESETS = {
    "air-france": {
      "startRadius": 51.2,
      "startAngle": 5.061454830783556,
      "angle": 6.370451769779303,
      "power": 100
    },
    "sand": {
      "startRadius": 47.52986965619486,
      "startAngle": 4.537856055185257,
      "angle": 6.370451769779303,
      "power": 120
    },
    "stm32": {
      "startRadius": 43.183752463449565,
      "startAngle": 3.3161255787892263,
      "angle": 4.625122517784973,
      "power": 105
    },
    "infrared": {
      "startRadius": 47.52986965619486,
      "startAngle": 5.934119456780721,
      "angle": 7.766715171374766,
      "power": 120
    },
    "rafale": {
      "startRadius": 37.72448254607756,
      "startAngle": 4.014257279586958,
      "angle": 5.846852994181004,
      "power": 115
    }
  };
  const SETTINGS = Object.fromEntries(Object.entries(PRESETS).map(([name, preset]) =>
    [name, { radius: preset.startRadius, angle: preset.startAngle }]));
  const projectForBody = bodyId => PROJECT_DEFS.find(project => project.bodyId === bodyId) || null;
  const landingURL = (bodyId, language = 'en') => projectForBody(bodyId)?.hrefs[language === 'fr' ? 'fr' : 'en'] || null;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // One fixed-step velocity-Verlet integrator drives both preview and flight.
  // Fixed bodies and schematic units: every visible body contributes gravity.
  const configuration = name => {
    const setting = SETTINGS[name] || SETTINGS['air-france'];
    const body = BODIES.find(item => item.id === name) || BODIES.find(item => item.id === 'air-france');
    return { name: body.id, body, startRadius: setting.radius, startAngle: setting.angle,
      mu: body.mu, preset: PRESETS[body.id], bodies: BODIES, bounds: SCENE_BOUNDS };
  };
  const initialFlight = (config, angle = config.startAngle + Math.PI / 2, power = 100) => {
    const speed = Math.sqrt(config.mu / config.startRadius) * clamp(power, 0, MAX_POWER) / 100;
    return { x: config.body.x + config.startRadius * Math.cos(config.startAngle),
      y: config.body.y + config.startRadius * Math.sin(config.startAngle),
      vx: speed * Math.cos(angle), vy: speed * Math.sin(angle),
      winding: 0, time: 0, outcome: null, hitBody: null, orbitBody: null, projectId: null,
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
      const project = projectForBody(collision.body.id);
      next.outcome = project ? 'landed' : 'collision'; next.hitBody = collision.body.id;
      next.projectId = project?.id || null;
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
      arcLength += distance; flight = next;
      points.push({ x: flight.x, y: flight.y });
      if (flight.outcome && flight.outcome !== 'orbit') break;
    }
    return { points, time: flight.time, arcLength };
  };
  // A reference is the preset's actual first revolution, never a fitted ellipse.
  // This pure calculation cannot open a project or affect the active flight.
  const referenceOrbit = (config, angle = config.preset.angle, power = config.preset.power) => {
    let flight = initialFlight(config, angle, power);
    const points = [{ x: flight.x, y: flight.y }];
    for (let count = 0; count < Math.floor(REFERENCE_TIME_LIMIT / STEP); count += 1) {
      flight = stepFlight(config, flight);
      points.push({ x: flight.x, y: flight.y });
      if (flight.outcome) break;
    }
    return { points, time: flight.time, outcome: flight.outcome, orbitBody: flight.orbitBody };
  };

  // Telemetry uses the same scene units and combined field as the flight.
  // Delta-v is the initial velocity impulse; coasting adds no propulsive delta-v.
  const flightTelemetry = (config, flight, launchDeltaV) => {
    const targetId = flight.hitBody || flight.orbitBody || config.name;
    const target = config.bodies.find(body => body.id === targetId) || config.body;
    const gravity = acceleration(config, flight.x, flight.y);
    return { velocity: Math.hypot(flight.vx, flight.vy),
      altitude: Math.max(0, Math.hypot(flight.x-target.x, flight.y-target.y)-target.radius),
      deltaV: launchDeltaV, gravity: Math.hypot(gravity.x, gravity.y),
      x: flight.x, y: flight.y, target: target.id };
  };

  // The physics is importable by local Node checks, with no browser debug API.
  if (typeof module === 'object' && module.exports) {
    module.exports = { configuration, initialFlight, stepFlight, acceleration, potentialAt, totalEnergy,
      segmentCollision, preview, predict: preview, referenceOrbit, projectForBody, landingURL, flightTelemetry,
      STEP, TIME_SCALE, BODIES, SETTINGS, PRESETS, PROJECT_DEFS, GRAVITATIONAL_CONSTANT,
      G: GRAVITATIONAL_CONSTANT, SCENE_BOUNDS, PREVIEW_TIME, REFERENCE_TIME_LIMIT, ROCKET_RADIUS };
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
  if (!svg || !launch || !reset || !pause || !message || !powerOutput || !stateLabel || destinations.length !== PROJECT_DEFS.length) return;
  const french = document.documentElement.lang === 'fr';
  const telemetryFields = new Map([...root.querySelectorAll('[data-telemetry]')].map(element => [element.dataset.telemetry, element]));
  const arrival = root.querySelector('.orbit-arrival');
  const arrivalTitle = root.querySelector('.arrival-title');
  const arrivalOpen = root.querySelector('.arrival-open');
  const arrivalStay = root.querySelector('.arrival-stay');
  const missionNames = { sun: 'SUN', 'air-france': 'AIR FRANCE PDU',
    sand: french ? 'SABLE / AVALANCHES' : 'SAND / AVALANCHES', stm32: 'STM32 / MORSE',
    infrared: 'IR / AUDIO', rafale: french ? 'RAFALE / EN COURS' : 'RAFALE / IN PROGRESS' };
  const copy = french ? {
    names: { sun: 'le Soleil', ...Object.fromEntries(PROJECT_DEFS.map(project => [project.id, project.names.fr + (project.status ? ` (${project.status.fr})` : '')])) },
    states: { aiming: 'Prêt', flying: 'En vol', orbit: 'Tour observé', collision: 'Collision', escape: 'Hors zone', landed: 'Projet atteint' },
    ready: name => `Départ depuis ${name}.`,
    aimingDetail: 'Quatre secondes de vol en pointillés. À toi de découvrir la suite.',
    flying: 'Trajectoire en cours.', flyingDetail: 'Les astres infléchissent le trajet.',
    orbit: name => `Un tour autour de ${name}.`, orbitDetail: 'Une révolution a été observée. Reprends le vol ou explore un autre lancement.',
    arrivalAuto: 'Ouverture du projet dans un instant. Tu peux aussi rester ici.',
    arrivalManual: 'Le vol est en pause. Ouvre le projet quand tu le souhaites.',
    landed: 'Destination atteinte.', landedDetail: 'Ouverture du projet…',
    collision: 'Contact avec un astre.', collisionDetail: 'Recommence pour ajuster la direction ou la poussée.',
    escape: 'La fusée quitte la scène.', escapeDetail: 'La trajectoire sort de la zone représentée. Recommence pour ajuster le lancement.',
    paused: 'Vol en pause.', pausedDetail: 'Reprends le vol quand tu le souhaites.', pause: 'Pause', resume: 'Reprendre',
    svgLabel: 'Scène orbitale. Règle la direction et la force du lancement.',
    controlsLabel: (name, power, angle) => `Lancement autour de ${name}. Force ${power} pour cent, direction ${angle} degrés.`
  } : {
    names: { sun: 'the Sun', ...Object.fromEntries(PROJECT_DEFS.map(project => [project.id, project.names.en + (project.status ? ` (${project.status.en})` : '')])) },
    states: { aiming: 'Ready', flying: 'Flying', orbit: 'Turn observed', collision: 'Collision', escape: 'Out of area', landed: 'Project reached' },
    ready: name => `Departure from ${name}.`,
    aimingDetail: 'Four seconds of flight in dots. Discover what comes next.',
    flying: 'Trajectory in progress.', flyingDetail: 'The celestial bodies bend the path.',
    orbit: name => `One revolution around ${name}.`, orbitDetail: 'A full turn has been observed. Resume the flight or explore another launch.',
    arrivalAuto: 'Opening the project in a moment. You can also stay here.',
    arrivalManual: 'Flight paused. Open the project whenever you’re ready.',
    landed: 'Destination reached.', landedDetail: 'Opening the project…',
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
  const palettes = {
    'air-france': ['#bbd5dc', '#538b9d', '#142f46'],
    sand: ['#e2c4a0', '#b67f58', '#553f33'],
    stm32: ['#d7e0df', '#8e9fa8', '#3f5060'],
    infrared: ['#bcdbd0', '#5c938a', '#24484d'],
    rafale: ['#d7d9e5', '#9291ae', '#41425c']
  };
  for (const project of PROJECT_DEFS) gradient(`orbit-${project.id}-gradient`,
    [['0%', palettes[project.id][0]], ['45%', palettes[project.id][1]], ['100%', palettes[project.id][2]]]);
  gradient('orbit-sun-glow-gradient', [['0%','#e5c8a0',.35],['35%','#d7b28c',.15],['70%','#cfaa82',.04],['100%','#cfaa82',0]], { cx: '50%', cy: '50%', r: '50%' });
  gradient('orbit-sun-disc-gradient', [['0%','#f0ddc0',.75],['60%','#dfbd91',.45],['100%','#c79d72',.08]], { cx: '44%', cy: '40%', r: '64%' });
  gradient('orbit-atmosphere', [['0%','#b2d7e0',0],['77%','#b2d7e0',0],['86%','#b2d7e0',.2],['100%','#b2d7e0',0]], { cx: '50%', cy: '50%', r: '50%' });
  gradient('orbit-terminator', [['0%','#0c223a',0],['48%','#0c223a',0],['100%','#0c223a',.65]], { cx: '25%', cy: '22%', r: '88%' });
  const texture = append(defs, 'filter', { id: 'orbit-terrain', x: '0%', y: '0%', width: '100%', height: '100%' });
  append(texture, 'feTurbulence', { type: 'fractalNoise', baseFrequency: '.095', numOctaves: 3, seed: 8 });
  append(texture, 'feColorMatrix', { type: 'saturate', values: 0 });
  const space = append(svg, 'g', { class: 'orbit-space', 'aria-hidden': 'true' });
  const groups = new Map();
  for (const body of BODIES) {
    const group = append(space, 'g', { class: body.id === 'sun' ? 'orbit-sun' : 'orbit-planet', 'data-planet': body.id, transform: `translate(${body.x} ${body.y})` });
    groups.set(body.id, group);
    if (body.id === 'sun') {
      append(group, 'circle', { class: 'orbit-sun-glow', r: 240, fill: 'url(#orbit-sun-glow-gradient)' });
      append(group, 'circle', { class: 'orbit-sun-body', r: body.radius, fill: 'url(#orbit-sun-disc-gradient)', opacity: .68 });
      continue;
    }
    const project = projectForBody(body.id);
    const clip = append(defs, 'clipPath', { id: `orbit-${body.id}-surface` });
    append(clip, 'circle', { r: body.radius });
    append(group, 'circle', { r: body.radius * 1.18, fill: 'url(#orbit-atmosphere)', opacity: .5 });
    append(group, 'circle', { class: 'orbit-planet-body', r: body.radius, fill: `url(#orbit-${body.id}-gradient)` });
    const surface = append(group, 'g', { 'clip-path': `url(#orbit-${body.id}-surface)` });
    const relief = append(surface, 'g', { transform: `scale(${body.radius/40})` });
    if (project.surface === 'earth') {
      append(relief, 'path', { d: 'M-38-16Q-27-36-12-31L-4-23 0-10-11-2-18 11-27 2ZM7 5Q17-6 30-3L39 7 27 13 23 28 9 32 3 20Z', fill: '#849e7d', opacity: .7 });
      append(relief, 'path', { d: 'M-29-25Q-5-35 19-24M-36 12Q-3 22 33 13', fill: 'none', stroke: '#eaf4ef', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: .55 });
    } else if (project.surface === 'sand') {
      for (let i = 0; i < 6; i += 1) append(relief, 'path', { d: `M-45 ${-30+i*12}Q-12 ${-41+i*12} 7 ${-29+i*12}T46 ${-29+i*12}`, fill: 'none', stroke: i%2 ? '#714f39' : '#f0d6b0', 'stroke-width': 3, opacity: .16 });
      append(relief, 'ellipse', { cx: -8, cy: -31, rx: 11, ry: 4, fill: '#eae0cb', opacity: .48 });
    } else if (project.surface === 'bands') {
      for (let i = 0; i < 7; i += 1) append(relief, 'path', { d: `M-42 ${-32+i*11}Q0 ${-20+i*11} 42 ${-32+i*11}`, fill: 'none', stroke: i%2 ? '#dde9dc' : '#244d57', 'stroke-width': 4, opacity: .16 });
    } else {
      for (const [x,y,r] of [[-13,-18,6],[13,-5,8],[-11,14,6],[9,25,3.5],[-27,-3,3]])
        append(relief, 'circle', { cx: x, cy: y, r, fill: '#3c4958', stroke: '#e5e8e1', 'stroke-width': .9, opacity: .17 });
    }
    append(surface, 'rect', { x: -body.radius, y: -body.radius, width: body.radius*2, height: body.radius*2, filter: 'url(#orbit-terrain)', opacity: .12 });
    append(group, 'circle', { class: 'orbit-planet-shade', r: body.radius, fill: 'url(#orbit-terminator)' });
  }
  // Let the distant Sun blend into the hero while keeping the flight inside its viewing area.
  const flightLayer = append(svg, 'g', { class: 'orbit-flight-layer', 'clip-path': 'url(#orbit-flight-view)' });
  const references = new Map();
  for (const project of PROJECT_DEFS) {
    const reference = referenceOrbit(configuration(project.id));
    if (reference.outcome === 'orbit') references.set(project.id, append(flightLayer, 'path', {
      class: 'orbit-reference-path', 'data-preset': project.id, 'aria-hidden': 'true',
      stroke: project.color, d: reference.points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
    }));
  }
  const targetHalo = append(flightLayer, 'circle', { class: 'orbit-target-halo', fill: 'none', stroke: '#a5825d', 'stroke-width': 1, opacity: .45, 'aria-hidden': 'true' });
  const previewPath = append(flightLayer, 'path', { class: 'orbit-preview-path', fill: 'none', stroke: '#22638b', 'stroke-width': 2, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round', opacity: .68, 'aria-hidden': 'true' });
  const trailPath = append(flightLayer, 'path', { class: 'orbit-flight-trail', fill: 'none', stroke: '#398b92', 'stroke-width': 2.1, opacity: .55, 'aria-hidden': 'true' });
  const aimArrow = append(flightLayer, 'line', { class: 'orbit-aim-arrow', stroke: '#9a6846', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'marker-end': 'url(#orbit-game-arrow)', 'aria-hidden': 'true' });
  const aimHandle = append(flightLayer, 'circle', { class: 'orbit-aim-handle', r: 5, fill: '#fffdf6', stroke: '#9a6846', 'stroke-width': 2, 'aria-hidden': 'true' });
  const rocket = append(flightLayer, 'g', { class: 'orbit-rocket', 'aria-hidden': 'true' });
  const hitArea = append(rocket, 'circle', { class: 'orbit-rocket-hit-area', r: 40, fill: 'transparent', 'pointer-events': 'all' });
  const flame = append(rocket, 'path', { class: 'orbit-rocket-flame', d: 'M-2.4 16Q0 31 2.4 16Z', fill: '#cba572' });
  append(rocket, 'path', { d: 'M-3.8 8L-7.5 17-3.8 15M3.8 8L7.5 17 3.8 15', fill: '#557282' });
  append(rocket, 'path', { d: 'M0-23C-2-20-4-15-4-9L-4 14 4 14 4-9C4-15 2-20 0-23Z', fill: '#f3f6f4', stroke: '#355569', 'stroke-width': .8 });
  append(rocket, 'path', { d: 'M0-23C2-20 4-15 4-9L4 14 1.3 14 1.3-17Z', fill: '#93a9b4', opacity: .55 });
  append(rocket, 'path', { d: 'M-3.7-12H3.7M-4 7H4', stroke: '#4c6b80', 'stroke-width': 1.5 });
  append(rocket, 'path', { d: 'M-2.8 14H2.8L2.2 17H-2.2Z', fill: '#25465d' });
  append(rocket, 'rect', { x: -1.1, y: -7, width: 2.2, height: 4.5, rx: .6, fill: '#55798d' });
  const impact = append(flightLayer, 'g', { class: 'orbit-impact-mark', visibility: 'hidden', 'aria-hidden': 'true' });
  append(impact, 'circle', { r: 13, fill: '#f8e5d9', stroke: '#b76b50', 'stroke-width': 1.5 });
  append(impact, 'path', { d: 'M-5-5 L5 5 M5-5 L-5 5', fill: 'none', stroke: '#b76b50', 'stroke-width': 2 });
  const offscreen = append(flightLayer, 'g', { class: 'orbit-escape-mark', visibility: 'hidden', 'aria-hidden': 'true' });
  append(offscreen, 'path', { d: 'M-9 6 L0-7 9 6', fill: 'none', stroke: '#9a6846', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

  const projectLayer = append(svg, 'g', { class: 'orbit-project-layer' });
  for (const project of PROJECT_DEFS) {
    const body = BODIES.find(item => item.id === project.id);
    const link = append(projectLayer, 'a', { class: 'orbit-project-link', 'data-project': project.id,
      href: landingURL(body.id, french ? 'fr' : 'en'), 'aria-label': `${french ? 'Découvrir' : 'Explore'} ${project.names[french ? 'fr' : 'en']}${project.status ? ` · ${project.status[french ? 'fr' : 'en']}` : ''}` });
    append(link, 'title', {}, `${project.names[french ? 'fr' : 'en']}${project.status ? ` · ${project.status[french ? 'fr' : 'en']}` : ''} · ${french ? 'difficulté relative' : 'relative difficulty'} ${project.weight}/5`);
    append(link, 'circle', { class: 'orbit-project-hit-area', cx: body.x, cy: body.y, r: body.radius });
    append(link, 'text', { class: 'orbit-project-label', x: body.x, y: body.y+body.radius+24, 'text-anchor': 'middle', 'font-family': 'inherit', 'font-size': 15 }, project.id === 'rafale' ? 'Rafale' : project.names[french ? 'fr' : 'en']);
    if (project.status) append(link, 'text', { class: 'orbit-project-label orbit-project-status', x: body.x, y: body.y+body.radius+44, 'text-anchor': 'middle', 'font-family': 'inherit', 'font-size': 12 }, project.status[french ? 'fr' : 'en']);
  }

  let config = configuration('air-france');
  let angle = config.startAngle + Math.PI / 2;
  let power = 100;
  let activePreset = config.name;
  let state = 'aiming';
  let flight = null;
  let drag = null;
  let suppressProjectClick = false;
  let userPaused = false;
  let raf = null;
  let lastTime = null;
  let accumulator = 0;
  let trail = [];
  let trailSteps = 0;
  let launchDeltaV = 0;
  let lastTelemetryAt = 0;
  let arrivalTimer = null;
  let automaticOpening = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = root.querySelector('.orbit-stage') || svg;
  const firstRect = stage.getBoundingClientRect();
  let visible = firstRect.bottom > 0 && firstRect.top < window.innerHeight;
  const pathData = points => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const position = () => flight || initialFlight(config, angle, power);
  const running = () => visible && !document.hidden && !userPaused && (state === 'flying' || state === 'orbit');

  const renderTelemetry = () => {
    const reading = flightTelemetry(config, position(), launchDeltaV);
    const fields = { velocity: reading.velocity, altitude: reading.altitude,
      'delta-v': reading.deltaV, gravity: reading.gravity, x: reading.x, y: reading.y };
    for (const [name, value] of Object.entries(fields)) {
      const element = telemetryFields.get(name);
      if (element) element.textContent = value.toFixed(1);
    }
    const target = telemetryFields.get('target');
    if (target) target.textContent = missionNames[reading.target] || reading.target.toUpperCase();
  };
  const cancelArrival = (hide = true) => {
    if (arrivalTimer !== null) window.clearTimeout(arrivalTimer);
    arrivalTimer = null;
    arrival?.classList.remove('is-opening');
    if (hide && arrival) { arrival.hidden = true; delete root.dataset.arrival; }
    if (!hide && arrival && !arrival.hidden) {
      automaticOpening = false;
      if (detail) detail.textContent = copy.arrivalManual;
    }
  };
  const beginArrival = (bodyId, outcome) => {
    const href = landingURL(bodyId, french ? 'fr' : 'en');
    if (!href || !arrival || !arrivalTitle || !arrivalOpen) return;
    cancelArrival();
    root.dataset.arrival = outcome;
    arrivalTitle.textContent = `${outcome === 'orbit' ? 'ORBIT ACQUIRED' : 'LANDING CONFIRMED'} — ${missionNames[bodyId]}`;
    arrivalOpen.href = href; arrival.hidden = false;
    // Only an observed result from an explicit launch can start this transition.
    if (automaticOpening && visible && !document.hidden) {
      arrival.classList.add('is-opening');
      if (detail) detail.textContent = copy.arrivalAuto;
      arrivalTimer = window.setTimeout(() => {
        arrivalTimer = null;
        if (visible && !document.hidden) window.location.assign(href);
        else cancelArrival(false);
      }, 1800);
    } else if (detail) detail.textContent = copy.arrivalManual;
  };

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
    launchDeltaV = Math.hypot(start.vx, start.vy);
    renderTelemetry(); renderRocket();
  };
  const syncUI = () => {
    root.dataset.state = state;
    root.dataset.preset = activePreset || 'custom';
    references.forEach((path, name) => path.classList.toggle('is-selected', name === activePreset));
    root.dataset.paused = String(userPaused);
    root.classList.toggle('orbit-paused', userPaused);
    stateLabel.textContent = userPaused && state !== 'orbit' && state !== 'landed' ? copy.paused : copy.states[state];
    launch.disabled = state !== 'aiming'; reset.disabled = false;
    const canPause = state === 'flying' || state === 'orbit';
    pause.hidden = !canPause; pause.disabled = !canPause;
    pause.textContent = userPaused ? copy.resume : copy.pause;
    pause.setAttribute('aria-pressed', String(userPaused));
    destinations.forEach(button => { button.disabled = false; button.setAttribute('aria-pressed', String(button.dataset.planet === activePreset)); });
    previewPath.setAttribute('visibility', state === 'aiming' ? 'visible' : 'hidden');
    aimArrow.setAttribute('visibility', state === 'aiming' ? 'visible' : 'hidden');
    aimHandle.setAttribute('visibility', state === 'aiming' ? 'visible' : 'hidden');
    let headline, explanation;
    if (userPaused && state !== 'orbit' && state !== 'landed') { headline = copy.paused; explanation = copy.pausedDetail; }
    else if (state === 'aiming') { headline = copy.ready(copy.names[config.name]); explanation = copy.aimingDetail; }
    else if (state === 'orbit') { headline = copy.orbit(copy.names[flight.orbitBody]); explanation = copy.orbitDetail; }
    else { headline = copy[state]; explanation = copy[`${state}Detail`]; }
    message.textContent = headline;
    if (detail) detail.textContent = explanation;
    renderTelemetry();
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
        if (state === 'orbit' || state === 'landed') userPaused = true;
        if (state === 'collision') {
          impact.setAttribute('transform', `translate(${flight.x} ${flight.y})`);
          impact.setAttribute('visibility', 'visible');
        }
        syncUI();
        if (state === 'orbit' || state === 'landed')
          beginArrival(state === 'orbit' ? flight.orbitBody : flight.hitBody, state);
      }
    }
    trailPath.setAttribute('d', pathData(trail));
    if (timestamp-lastTelemetryAt >= 100 || flight.outcome) { renderTelemetry(); lastTelemetryAt = timestamp; }
    renderRocket();
    schedule();
  };
  const cancelDrag = restore => {
    if (!drag) return;
    const previous = drag; drag = null;
    if (svg.hasPointerCapture?.(previous.id)) svg.releasePointerCapture(previous.id);
    if (restore) { angle = previous.angle; power = previous.power; activePreset = previous.preset; syncUI(); renderAim(); }
  };
  const startAgain = name => {
    cancelArrival(); automaticOpening = false; cancelDrag(false); stopRAF(); suppressProjectClick = false;
    config = configuration(name || config.name);
    angle = config.preset.angle; power = config.preset.power; activePreset = config.name;
    state = 'aiming'; flight = null; userPaused = false; trail = []; trailSteps = 0;
    trailPath.setAttribute('d', ''); impact.setAttribute('visibility', 'hidden'); offscreen.setAttribute('visibility', 'hidden');
    targetHalo.setAttribute('cx', config.body.x); targetHalo.setAttribute('cy', config.body.y); targetHalo.setAttribute('r', config.body.radius+10);
    groups.forEach((group, name) => group.classList.toggle('is-target', name === config.name));
    syncUI(); renderAim(); schedule();
  };
  const launchFlight = () => {
    if (state !== 'aiming') return;
    cancelArrival(); automaticOpening = true; cancelDrag(false); flight = initialFlight(config, angle, power);
    launchDeltaV = Math.hypot(flight.vx, flight.vy);
    const stageRect = stage.getBoundingClientRect();
    const navBottom = document.querySelector('header.nav')?.getBoundingClientRect().bottom || 0;
    if (stageRect.top < navBottom+12 || stageRect.bottom > window.innerHeight-70) {
      const top = Math.max(navBottom+18, (window.innerHeight-stageRect.height)/2);
      window.scrollTo({ top: window.scrollY+stageRect.top-top, behavior: motion.matches ? 'auto' : 'smooth' });
    }
    state = 'flying'; userPaused = false;
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
    drag.moved = true; activePreset = null; syncUI();
    const start = initialFlight(config, angle, power);
    const dx = point.x-start.x, dy = point.y-start.y;
    const length = Math.hypot(dx,dy);
    if (length > .1) angle = Math.atan2(dy,dx);
    power = clamp(length/AIM_LENGTH*100, 0, MAX_POWER);
    renderAim();
  };
  const beginDrag = event => {
    if (drag) return;
    suppressProjectClick = false;
    if (state !== 'aiming' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = localPoint(event); if (!point) return;
    const projectLink = event.target.closest?.('.orbit-project-link');
    if (projectLink) {
      const body = BODIES.find(item => item.id === projectLink.dataset.project);
      if (body && Math.hypot(point.x-body.x,point.y-body.y) <= body.radius) return;
    }
    const start = initialFlight(config, angle, power);
    const matrix = svg.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.a,matrix.b) : 1;
    const hitRadius = Math.max(24,22/Math.max(.1,scale));
    const tipX = start.x+Math.cos(angle)*AIM_LENGTH*power/100;
    const tipY = start.y+Math.sin(angle)*AIM_LENGTH*power/100;
    if (Math.min(Math.hypot(point.x-start.x,point.y-start.y),Math.hypot(point.x-tipX,point.y-tipY)) > hitRadius) return;
    // Touch browsers may retarget a near-rocket touch to the planet link.
    // Give the rocket's geometric target priority, and retain native links elsewhere.
    suppressProjectClick = true;
    event.preventDefault(); svg.focus({ preventScroll: true });
    drag = { id: event.pointerId, pointerX: point.x, pointerY: point.y, angle, power, preset: activePreset, moved: false };
    svg.setPointerCapture(event.pointerId);
  };
  rocket.addEventListener('pointerdown', beginDrag);
  aimHandle.addEventListener('pointerdown', beginDrag);
  svg.addEventListener('pointerdown', beginDrag);
  svg.addEventListener('click', event => {
    if (suppressProjectClick && event.detail !== 0) {
      event.preventDefault(); event.stopPropagation(); suppressProjectClick = false;
    }
  }, true);
  svg.addEventListener('pointermove', event => { if (drag) { event.preventDefault(); updateDrag(event); } });
  svg.addEventListener('pointerup', event => { if (drag && event.pointerId === drag.id) { updateDrag(event); cancelDrag(false); } });
  svg.addEventListener('pointercancel', () => cancelDrag(true));
  svg.addEventListener('lostpointercapture', () => cancelDrag(true));
  svg.addEventListener('keydown', event => {
    if (event.target !== svg) return;
    if (event.key === 'Escape' && drag) { event.preventDefault(); cancelDrag(true); return; }
    if (state !== 'aiming') return;
    if (event.key === 'Enter') { event.preventDefault(); launchFlight(); return; }
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); cancelDrag(true); activePreset = null; syncUI();
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
    automaticOpening = false; cancelArrival(); userPaused = !userPaused; syncUI(); schedule();
  });
  arrivalStay?.addEventListener('click', () => { automaticOpening = false; cancelArrival(); syncUI(); });
  arrivalOpen?.addEventListener('click', () => cancelArrival(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelDrag(true); cancelArrival(false); } schedule(); });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio > .04;
      if (!visible) { cancelDrag(true); cancelArrival(false); }
      schedule();
    }, { threshold: [0,.04] });
    observer.observe(stage);
  } else {
    const updateVisibility = () => {
      const rect = stage.getBoundingClientRect(); visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!visible) { cancelDrag(true); cancelArrival(false); } schedule();
    };
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility, { passive: true });
  }
  motion.addEventListener?.('change', () => { if (motion.matches && state === 'orbit') userPaused = true; syncUI(); schedule(); });
  const sizeHitArea = () => {
    const matrix = svg.getScreenCTM();
    const scale = matrix ? Math.hypot(matrix.a,matrix.b) : 1;
    hitArea.setAttribute('r', Math.max(24,22/Math.max(.1,scale)));
    root.querySelectorAll('.orbit-project-link').forEach(link => {
      const body = BODIES.find(item => item.id === link.dataset.project);
      link.querySelector('.orbit-project-hit-area')?.setAttribute('r', Math.max(body.radius,22/Math.max(.1,scale)));
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(sizeHitArea).observe(svg);
  else window.addEventListener('resize', sizeHitArea, { passive: true });
  const home = root.closest('#orbit') || root.closest('#home');
  if (home) {
    const syncHome = () => {
      const rect = home.getBoundingClientRect();
      root.classList.toggle('orbit-home-visible', rect.bottom > 0 && rect.top < window.innerHeight);
    };
    syncHome();
    if ('IntersectionObserver' in window) new IntersectionObserver(syncHome, { threshold: [0, .001] }).observe(home);
    else window.addEventListener('scroll', syncHome, { passive: true });
  }
  document.body.classList.add('has-orbit-game');
  startAgain('air-france'); sizeHitArea();
})();
