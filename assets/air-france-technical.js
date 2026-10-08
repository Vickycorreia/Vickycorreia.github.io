(() => {
  'use strict';

  const play = document.getElementById('af-frame-play');
  const chip = document.getElementById('af-frame-chip');
  const status = document.getElementById('af-frame-status');
  const stages = [...document.querySelectorAll('[data-af-stage]')];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isFrench = document.documentElement.lang === 'fr';
  const copy = isFrench ? {
    explanations: [
      'Exemple de requête : identifiant étendu 0x06000021, DLC 0. Cette illustration montre une trame sortante, pas une émission en direct.',
      'Réception : CAN.read() sert à lire une éventuelle réponse. La réception des réponses attendues du PDU était un point central du diagnostic.',
      'Décodage : le regroupement étudié sépare les octets en champs. Leur signification diagnostique n’est pas confirmée dans cette illustration.',
      'Affichage : le menu LCD 20×4 organise les catégories de diagnostic. Cet aperçu ne montre ni mesures ni données réelles de l’équipement.'
    ],
    reducedFlow: 'Séquence conceptuelle : envoyer la requête d’exemple, lire une réponse si elle est reçue, décoder les champs étudiés et afficher les informations de diagnostic. La réception était un point central du diagnostic ; il ne s’agit pas de données réelles de l’équipement.',
    review: 'Revoir les étapes',
    replay: 'Relancer les étapes',
    lcdRows: ['Cat. diagnostic', 'Aperçu du menu', 'Sans mesure réelle'],
    paused: 'Présentation conceptuelle interrompue. La réception était un point central du diagnostic ; la séquence statique ci-dessus décrit le fonctionnement logiciel visé.',
    staticFlow: 'Séquence conceptuelle : requête, réception si une réponse arrive, décodage puis affichage. Il s’agit d’une illustration, pas de données réelles de l’équipement.'
  } : {
    explanations: [
      'Request example: Extended ID 0x06000021, DLC 0. This illustrates an outbound frame, not a live transmission.',
      'Receive: CAN.read() is intended to read a reply. Receiving the expected PDU replies was a key focus of investigation.',
      'Decode: the studied byte layout separates fields. Their diagnostic meanings are not confirmed in this illustration.',
      'Display: the 20×4 LCD menu organises diagnostic categories. This preview shows no measurements or live device data.'
    ],
    reducedFlow: 'Conceptual flow: send the example request, read a reply if received, decode the studied fields, and display diagnostic information. Reception was a key focus of investigation; this is not live device data.',
    review: 'Review the flow',
    replay: 'Replay the flow',
    lcdRows: ['Diagnostic category', 'Menu preview only', 'No live data'],
    paused: 'Conceptual walkthrough paused. Reception was a key focus of investigation; the static flow above describes the intended software sequence.',
    staticFlow: 'Conceptual flow: request, receive if a reply arrives, decode, then display. This is an illustration, not live device data.'
  };
  let timer = null;
  let active = false;
  const explanations = copy.explanations;
  const frameDemo = play?.closest('.af-can-demo');
  const inViewport = () => {
    const bounds = frameDemo?.getBoundingClientRect();
    return !bounds || (bounds.bottom > 0 && bounds.top < window.innerHeight);
  };

  const reset = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    active = false;
    if (chip) chip.classList.remove('af-frame-moving');
    stages.forEach(stage => stage.classList.remove('af-stage-active'));
    if (play) play.disabled = false;
  };

  if (play && chip && status && stages.length === explanations.length) {
    play.hidden = false;
    play.addEventListener('click', event => {
      if (active) return;
      window.PortfolioAudio?.unlock(event);
      reset();
      if (motionPreference.matches) {
        status.textContent = copy.reducedFlow;
        play.textContent = copy.review;
        return;
      }
      active = true;
      play.disabled = true;
      chip.classList.add('af-frame-moving');
      let step = 0;
      const advance = () => {
        if (document.hidden || !inViewport()) {
          reset();
          status.textContent = copy.paused;
          return;
        }
        stages.forEach((stage, index) => stage.classList.toggle('af-stage-active', index === step));
        status.textContent = explanations[step];
        // A short data cue marks each conceptual stage; it does not imply
        // that the expected PDU reply was successfully received.
        window.PortfolioAudio?.play('frame', { gain: 0.055 });
        step += 1;
        if (step < explanations.length) {
          timer = window.setTimeout(advance, 1550);
        } else {
          timer = window.setTimeout(() => {
            reset();
            play.textContent = copy.replay;
          }, 1550);
        }
      };
      advance();
    });
  }

  const lcd = document.getElementById('af-lcd-screen');
  const categories = [...document.querySelectorAll('[data-af-diagnostic]')];
  if (lcd && lcd.children.length === 4 && categories.length) {
    categories.forEach(category => {
      category.addEventListener('toggle', () => {
        if (!category.open) return;
        categories.forEach(other => {
          if (other !== category) other.open = false;
        });
        const label = category.dataset.afDiagnostic;
        if (!label) return;
        const rows = [`> ${label}`, ...copy.lcdRows];
        [...lcd.children].forEach((row, index) => { row.textContent = rows[index]; });
      });
    });
  }

  const stopForMotionChange = event => {
    if (!event.matches || !active) return;
    reset();
    if (status) status.textContent = copy.paused;
  };
  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', stopForMotionChange);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !active) return;
    reset();
    if (status) status.textContent = copy.staticFlow;
  });
  window.addEventListener('pagehide', reset);
  if (play && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting || !active) return;
      reset();
      if (status) status.textContent = copy.paused;
    }).observe(frameDemo || play);
  }
})();
