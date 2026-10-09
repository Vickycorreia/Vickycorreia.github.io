(() => {
  const root = document.querySelector('.orbit-game');
  if (!root) return;
  const fr = document.documentElement.lang === 'fr';
  const data = {
    'air-france': ['Air France PDU', fr ? 'Industrie / CAN' : 'Industry / CAN', fr ? 'Prototype de test autonome. Émission CAN observée ; réception des réponses à valider.' : 'Standalone test prototype. CAN transmission observed; response reception to validate.', '/assets/air-france/workbench-public.webp'],
    stm32: [fr ? 'Projet Morse' : 'Morse project', fr ? 'Systèmes embarqués' : 'Embedded systems', fr ? 'Traitement logique avec Tristan. Piézos, radio OOK, CRC-8 ; validation partielle.' : 'Processing logic with Tristan. Piezos, OOK radio, CRC-8; partial validation.', '/assets/morse/assembled-boards.jpeg'],
    sand: [fr ? 'Écoulement du sable' : 'Sand flow', fr ? 'Étude expérimentale' : 'Experimental study', fr ? 'Angles d’avalanche, régime stationnaire et impacts : observer, mesurer, interpréter.' : 'Avalanche angles, steady flow and impacts: observe, measure, interpret.', '/assets/sand-study/rotating-drum.webp'],
    infrared: [fr ? 'Audio stéréo IR · En cours' : 'IR stereo audio · In progress', fr ? 'Électronique analogique' : 'Analog electronics', fr ? 'Essais optiques à 10 kHz ; chaîne stéréo FM et démodulation PLL à valider. Projet en cours.' : 'Optical-link tests at 10 kHz; stereo FM and PLL demodulation still to validate. Work in progress.', '/assets/infrared-audio/bench.webp'],
    rafale: [fr ? 'Rafale en carton' : 'Cardboard Rafale', fr ? 'Construction personnelle' : 'Personal build', fr ? 'Plans et assemblage réalisés seul. Finitions, trains et teinte grise à venir.' : 'Independently made plans and assembly. Finishing, landing gear and grey paint to come.', '/assets/rafale/current-three-quarter.png']
  };
  const preview = document.createElement('aside');
  preview.className = 'mission-preview'; preview.hidden = true;
  preview.id = 'orbit-mission-preview';
  preview.innerHTML = '<img alt="" width="300" height="120"><p class="mission-preview-label">MISSION CONTROL</p><h3></h3><p class="mission-preview-category"></p><p class="mission-preview-copy"></p>';
  document.body.append(preview);
  let selected = null;
  const place = () => {
    if (!selected || preview.hidden) return;
    const r = selected.getBoundingClientRect();
    preview.style.left = `${Math.max(12, Math.min(innerWidth-preview.offsetWidth-12, r.left))}px`;
    preview.style.top = `${Math.max(12, Math.min(innerHeight-preview.offsetHeight-12, r.bottom+12))}px`;
  };
  const show = link => {
    const id = link.dataset.project || link.dataset.planet;
    const item = data[id]; if (!item) return;
    selected = link;
    preview.querySelector('h3').textContent = item[0];
    preview.querySelector('.mission-preview-category').textContent = item[1];
    preview.querySelector('.mission-preview-copy').textContent = item[2];
    const img = preview.querySelector('img'); img.hidden = !item[3];
    img.alt = id === 'infrared' ? (fr ? 'Banc de mesure de la liaison infrarouge : signaux émis et reçus à l’oscilloscope.' : 'Infrared-link test bench: transmitted and received signals on the oscilloscope.') : '';
    if (item[3]) img.src = item[3]; else img.removeAttribute('src');
    preview.hidden = false; place();
  };
  const hide = () => { selected = null; preview.hidden = true; };
  root.querySelectorAll('.orbit-project-link, [data-planet]').forEach(link => {
    link.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') show(link); });
    link.addEventListener('pointerleave', () => { if (document.activeElement !== link) hide(); });
    link.addEventListener('focus', () => show(link));
    link.addEventListener('blur', hide);
    link.addEventListener('click', hide);
    const id = link.dataset.project || link.dataset.planet;
    if (data[id]) link.setAttribute('aria-description', `${data[id][1]}. ${data[id][2]}`);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('scroll', () => {
    if (!selected) return;
    const bounds = selected.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight ||
        !(selected.matches(':hover') || document.activeElement === selected)) hide();
    else place();
  }, { passive:true });
  window.addEventListener('resize', hide);
})();
