(() => {
  'use strict';

  // Decorative project worlds, not astronomical maps or simulation parameters.
  // Orthographic sphere rendering preserves every body's physical SVG radius.
  const root = document.querySelector('#orbit');
  if (!root) return;
  const groups = [...root.querySelectorAll('.orbit-planet[data-planet]')];
  if (!groups.length) return;
  const kinds = { 'air-france': 'ocean', sand: 'desert', stm32: 'moon', infrared: 'gas', rafale: 'mercury' };
  const size = matchMedia('(max-width: 600px)').matches ? 256 : 320;
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (value, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));
  const smooth = value => value * value * (3 - 2 * value);
  const mix = (a, b, t) => a + (b - a) * t;
  const hash = (x, y, z) => {
    let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x, y, z) => {
    const a = Math.floor(x), b = Math.floor(y), c = Math.floor(z);
    const u = smooth(x - a), v = smooth(y - b), w = smooth(z - c);
    return mix(mix(mix(hash(a,b,c), hash(a+1,b,c), u), mix(hash(a,b+1,c), hash(a+1,b+1,c), u), v),
      mix(mix(hash(a,b,c+1), hash(a+1,b,c+1), u), mix(hash(a,b+1,c+1), hash(a+1,b+1,c+1), u), v), w);
  };
  const fbm = (x, y, z, scale, octaves = 4) => {
    let sum = 0, weight = .5, total = 0;
    for (let i = 0; i < octaves; i += 1) {
      sum += noise(x * scale + 21.7, y * scale + 9.3, z * scale + 37.1) * weight;
      total += weight; scale *= 2.03; weight *= .5;
    }
    return sum / total;
  };
  // Distributed on a sphere; the same stamp wraps smoothly across longitude.
  const craters = Array.from({ length: 58 }, (_, i) => {
    const latitude = hash(i, 4, 1) * 2 - 1;
    const longitude = hash(i, 9, 3) * Math.PI * 2;
    const radius = .018 + Math.pow(hash(i, 3, 8), 3) * .17;
    const horizontal = Math.sqrt(1 - latitude * latitude);
    return { x: horizontal * Math.cos(longitude), y: latitude, z: horizontal * Math.sin(longitude), radius };
  });
  const craterRelief = (x, y, z) => {
    let relief = 0;
    for (const crater of craters) {
      const distanceSquared = 2 * (1 - (x * crater.x + y * crater.y + z * crater.z));
      const limit = crater.radius * crater.radius;
      if (distanceSquared > limit * 1.4) continue;
      const distance = Math.sqrt(Math.max(0, distanceSquared)) / crater.radius;
      const bowl = Math.max(0, 1 - distance * distance);
      const rim = Math.exp(-Math.pow((distance - .93) * 12, 2));
      // Slight directional shading, with a raised bright rim and darker bowl.
      const direction = ((x - crater.x) * -.55 + (y - crater.y) * -.65) / crater.radius;
      relief += bowl * (-.15 + direction * .15) + rim * .18;
    }
    return relief;
  };

  const material = (kind, x, y, z) => {
    const terrain = fbm(x, y, z, kind === 'ocean' ? 2.7 : 3.9);
    const detail = noise(x * 76 + 3, y * 76 + 5, z * 76 + 1) - .5;
    if (kind === 'ocean') {
      const continent = clamp((terrain - .485) * 38);
      const altitude = clamp((terrain - .53) * 10);
      const dryness = clamp(fbm(x + 8, y - 2, z + 4, 3.2, 2) * 1.9 - .35);
      const latitude = Math.abs(y);
      const land = [mix(57, 153, dryness) + altitude * 45, mix(91, 139, dryness) + altitude * 30, mix(66, 93, dryness) + altitude * 35];
      const ocean = [16 + terrain * 10, 66 + terrain * 32, 111 + terrain * 47];
      let color = ocean.map((channel, i) => mix(channel, land[i], continent));
      const ice = clamp((latitude - .87 + (terrain - .5) * .1) * 24);
      color = color.map(channel => mix(channel, 220, ice));
      const clouds = fbm(x + 16, y + 3, z - 7, 7.2, 3);
      const cloud = clamp((clouds - .52 + Math.sin(y * 14 + x * 3) * .025) * 7) * .78;
      return color.map((channel, i) => mix(channel, [235, 241, 240][i], cloud));
    }
    if (kind === 'gas') {
      const turbulent = fbm(x, y, z, 8, 3);
      const latitude = y * 39 + (turbulent - .5) * 2.5;
      const bands = Math.sin(latitude) * .5 + Math.sin(latitude * 2.8 + turbulent * 4) * .2;
      const t = clamp((bands + .6) / 1.2);
      let color = [mix(164, 231, t), mix(122, 214, t), mix(89, 179, t)];
      const storm = ((x + .24) / .27) ** 2 + ((y - .28) / .12) ** 2;
      if (z > 0 && storm < 1) {
        const swirl = clamp((1 - storm) * 3) * (.65 + .18 * Math.sin(storm * 33));
        color = color.map((channel, i) => mix(channel, [166, 91, 58][i], swirl));
      }
      return color.map(channel => channel + detail * 8);
    }
    if (kind === 'desert') {
      const rough = terrain * .85 + detail * .025 + craterRelief(x, y, z) * .12;
      let color = [96 + rough * 155, 57 + rough * 104, 41 + rough * 76];
      const ice = clamp((Math.abs(y) - .94 + (terrain - .5) * .03) * 34);
      return color.map((channel, i) => mix(channel, [226, 218, 205][i], ice));
    }
    const relief = craterRelief(x, y, z);
    const darkBasins = clamp((.46 - fbm(x + 4, y, z - 3, 2.4, 3)) * 3);
    const value = 111 + terrain * 100 + relief * 175 - darkBasins * 45 + detail * 10;
    return kind === 'moon' ? [value * .98, value, value * 1.025] : [value * 1.04, value * 1.005, value * .955];
  };

  let inView = false, disposed = false, scheduled = null, current = null, index = 0;
  const cancel = () => {
    if (scheduled === null) return;
    if ('cancelIdleCallback' in window) cancelIdleCallback(scheduled);
    else clearTimeout(scheduled);
    scheduled = null;
  };
  const active = () => inView && !document.hidden && !disposed;
  const queue = () => {
    if (!active() || scheduled !== null || index >= groups.length) return;
    scheduled = 'requestIdleCallback' in window ? requestIdleCallback(renderChunk, { timeout: 250 }) : setTimeout(renderChunk, 16);
  };
  const begin = group => {
    const kind = kinds[group.dataset.planet];
    const body = group.querySelector('.orbit-planet-body');
    const radius = Number(body?.getAttribute('r'));
    if (!kind || !radius || group.querySelector('.orbit-planet-material')) return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return null;
    return { group, kind, radius, canvas, context, pixels: context.createImageData(size, size), row: 0 };
  };
  function renderChunk() {
    scheduled = null;
    if (!active()) return;
    try {
      if (!current) current = begin(groups[index]);
      if (!current) {
        index += 1;
        if (index === groups.length) observer?.disconnect();
        else queue();
        return;
      }
      const startRow = current.row;
      const data = current.pixels.data;
      // Yield frequently, including on mobile browsers without idle callbacks.
      const endRow = Math.min(size, startRow + 12);
      for (let row = startRow; row < endRow; row += 1) {
        const ny = (row + .5) / size * 2 - 1;
        for (let col = 0; col < size; col += 1) {
          const nx = (col + .5) / size * 2 - 1;
          const radiusSquared = nx * nx + ny * ny;
          if (radiusSquared >= 1) continue;
          const nz = Math.sqrt(1 - radiusSquared);
          const color = material(current.kind, nx, ny, nz);
          // The distant Sun is above-left in the orbital scene.
          const diffuse = Math.max(0, nx * -.55 + ny * -.6 + nz * .58);
          const light = .27 + diffuse * .81;
          const atmosphere = current.kind === 'ocean' ? Math.pow(1 - nz, 4) * .27 : 0;
          const pixel = (row * size + col) * 4;
          data[pixel] = clamp(color[0] * light + atmosphere * 30, 0, 255);
          data[pixel + 1] = clamp(color[1] * light + atmosphere * 94, 0, 255);
          data[pixel + 2] = clamp(color[2] * light + atmosphere * 150, 0, 255);
          data[pixel + 3] = Math.round(clamp((1 - Math.sqrt(radiusSquared)) * size) * 255);
        }
      }
      current.row = endRow;
      if (endRow === size) {
        current.context.putImageData(current.pixels, 0, 0);
        const image = document.createElementNS(NS, 'image');
        image.setAttribute('class', 'orbit-planet-material');
        image.setAttribute('x', -current.radius);
        image.setAttribute('y', -current.radius);
        image.setAttribute('width', current.radius * 2);
        image.setAttribute('height', current.radius * 2);
        image.setAttribute('href', current.canvas.toDataURL('image/png'));
        image.setAttribute('aria-hidden', 'true');
        image.setAttribute('pointer-events', 'none');
        current.group.insertBefore(image, current.group.querySelector('.orbit-planet-shade'));
        current.group.classList.add('orbit-textured');
        current.canvas.width = current.canvas.height = 0;
        current = null; index += 1;
        root.dataset.orbitMaterials = String(index);
      }
    } catch (_) {
      // Existing gradients and relief remain usable if Canvas allocation fails.
      if (current) current.canvas.width = current.canvas.height = 0;
      current = null; index += 1;
    }
    if (index === groups.length) observer?.disconnect();
    else queue();
  }
  let observer = null;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      if (inView) queue(); else cancel();
    }, { rootMargin: '180px 0px' });
    observer.observe(root);
  } else { inView = true; queue(); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel(); else queue();
  });
  window.addEventListener('pagehide', () => { disposed = true; cancel(); });
  window.addEventListener('pageshow', () => { disposed = false; queue(); });
})();
