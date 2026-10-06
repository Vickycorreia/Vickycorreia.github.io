(() => {
  'use strict';

  const play = document.getElementById('af-frame-play');
  const chip = document.getElementById('af-frame-chip');
  const status = document.getElementById('af-frame-status');
  const stages = [...document.querySelectorAll('[data-af-stage]')];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let active = false;
  const explanations = [
    'Request example: Extended ID 0x06000021, DLC 0. This illustrates an outbound frame, not a live transmission.',
    'Receive: CAN.read() is intended to read a reply. Receiving the expected PDU replies was a key focus of investigation.',
    'Decode: the studied byte layout separates fields. Their diagnostic meanings are not confirmed in this illustration.',
    'Display: the 20×4 LCD menu organises diagnostic categories. This preview shows no measurements or live device data.'
  ];

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
    play.addEventListener('click', () => {
      if (active) return;
      reset();
      if (motionPreference.matches) {
        status.textContent = 'Conceptual flow: send the example request, read a reply if received, decode the studied fields, and display diagnostic information. Reception was a key focus of investigation; this is not live device data.';
        play.textContent = 'Review the flow';
        return;
      }
      active = true;
      play.disabled = true;
      chip.classList.add('af-frame-moving');
      let step = 0;
      const advance = () => {
        stages.forEach((stage, index) => stage.classList.toggle('af-stage-active', index === step));
        status.textContent = explanations[step];
        step += 1;
        if (step < explanations.length) {
          timer = window.setTimeout(advance, 1550);
        } else {
          timer = window.setTimeout(() => {
            reset();
            play.textContent = 'Replay the flow';
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
        const rows = [`> ${label}`, 'Diagnostic category', 'Menu preview only', 'No live data'];
        [...lcd.children].forEach((row, index) => { row.textContent = rows[index]; });
      });
    });
  }

  const stopForMotionChange = event => {
    if (!event.matches || !active) return;
    reset();
    if (status) status.textContent = 'Conceptual walkthrough paused. Reception was a key focus of investigation; the static flow above describes the intended software sequence.';
  };
  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', stopForMotionChange);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !active) return;
    reset();
    if (status) status.textContent = 'Conceptual flow: request, receive if a reply arrives, decode, then display. This is an illustration, not live device data.';
  });
})();
