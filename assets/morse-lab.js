/* Educational visualisations. No board, RF link or firmware is driven by this page. */
(function (global) {
  'use strict';

  const ALPHABET = Object.freeze({
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
    H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
    O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
    V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
    5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.'
  });

  function normalizeText(text, limit = 12) {
    return String(text).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/ +/g, ' ').trim().slice(0, limit).trim();
  }

  function encodeMorse(input) {
    const text = normalizeText(input);
    const segments = [];
    const letters = [...text];
    let totalUnits = 0;
    letters.forEach((letter, letterIndex) => {
      if (letter === ' ') return;
      const symbols = ALPHABET[letter];
      [...symbols].forEach((symbol, symbolIndex) => {
        const units = symbol === '.' ? 1 : 3;
        segments.push({ on: true, units, letter, letterIndex, symbol, kind: symbol === '.' ? 'dot' : 'dash', start: totalUnits });
        totalUnits += units;
        if (symbolIndex < symbols.length - 1) {
          segments.push({ on: false, units: 1, letter, letterIndex, symbol: '', kind: 'symbolGap', start: totalUnits });
          totalUnits += 1;
        }
      });
      if (letterIndex < letters.length - 1) {
        const wordGap = letters[letterIndex + 1] === ' ';
        const units = wordGap ? 7 : 3;
        segments.push({ on: false, units, letter, letterIndex, symbol: '', kind: wordGap ? 'wordGap' : 'letterGap', start: totalUnits });
        totalUnits += units;
      }
    });
    return { text, segments, totalUnits, morse: text.split(' ').map(word => [...word].map(letter => ALPHABET[letter]).join(' ')).join(' / ') };
  }

  // Same MSB-first algorithm as the project's standalone App/Src/crc8.c routine.
  function crc8(bytes) {
    let crc = 0;
    for (const byte of bytes) {
      crc ^= byte & 0xff;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = ((crc << 1) ^ ((crc & 0x80) ? 0x07 : 0)) & 0xff;
      }
    }
    return crc;
  }

  function asciiBytes(text) { return [...text].map(character => character.charCodeAt(0)); }
  function hex(byte) { return `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`; }

  const MORSE_LETTERS = Object.freeze(Object.fromEntries(Object.entries(ALPHABET).map(([letter, symbols]) => [symbols, letter])));
  function decodeMorse(symbols) { return MORSE_LETTERS[symbols] || '?'; }
  function classifyPress(milliseconds, unit = 180) { return milliseconds < 2 * unit ? '.' : '-'; }
  function challengeProgress(message, target) {
    const text = message.trimEnd();
    let correct = 0;
    while (correct < text.length && correct < target.length && text[correct] === target[correct]) correct += 1;
    return { correct, complete: text === target, mismatch: correct < text.length, typed: text.length };
  }
  function crcTrace(byte) {
    let register = byte & 0xff;
    const steps = [{ register, highBit: false, xor: true }];
    for (let bit = 0; bit < 8; bit += 1) {
      const highBit = Boolean(register & 0x80);
      register = ((register << 1) ^ (highBit ? 0x07 : 0)) & 0xff;
      steps.push({ register, highBit, xor: false });
    }
    return steps;
  }

  function unlockAudio(event) { global.PortfolioAudio?.unlock(event); }
  function pulseAudio(duration = .18) { global.PortfolioAudio?.play('pulse', { frequency: 620, duration, gain: .10 }); }

  const exported = { ALPHABET, normalizeText, encodeMorse, decodeMorse, classifyPress, challengeProgress, crc8, crcTrace, asciiBytes, hex };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (!global.document) return;

  const copy = {
    en: {
      play: 'Play the message', pause: 'Pause', replay: 'Play again', ready: 'Ready to transmit',
      complete: 'Sequence complete', paused: 'Paused', received: 'Illustrated result', waiting: 'Waiting',
      dot: 'Dot', dash: 'Dash', symbolGap: 'Between symbols', letterGap: 'Between letters', wordGap: 'Between words',
      fieldError: 'Use 1–12 letters A–Z, digits or spaces.',
      step: 'Manual step', playing: 'Playing the educational sequence.',
      pausedNotice: 'Sequence paused.', completeNotice: 'Educational sequence complete.',
      changed: 'Message updated. Ready to transmit.', bit: 'bit', byte: 'Byte', flip: 'Toggle',
      match: 'Checksums match', mismatch: 'Different checksums',
      matchNote: 'The reference and received data produce the same CRC. This is an explanatory check, not a hardware test.',
      mismatchNote: 'The modified data produce a different CRC: this error is detected. The CRC does not repair the message.',
      collisionNote: 'The checksums match despite changed data. A CRC cannot detect every possible corruption.',
      changedBit: 'bit changed', changedBits: 'bits changed', noBit: 'Original data', resetNotice: 'Original data restored.',
      changedPayload: 'Payload updated.', off: 'OFF', on: 'ON', original: 'Original byte', receivedByte: 'Received byte'
    },
    fr: {
      play: 'Lire le message', pause: 'Pause', replay: 'Relire', ready: 'Prêt à transmettre',
      complete: 'Séquence terminée', paused: 'En pause', received: 'Résultat illustré', waiting: 'En attente',
      dot: 'Point', dash: 'Trait', symbolGap: 'Entre les symboles', letterGap: 'Entre les lettres', wordGap: 'Entre les mots',
      fieldError: 'Utilisez 1 à 12 lettres A–Z, chiffres ou espaces.',
      step: 'Étape manuelle', playing: 'Lecture de la séquence pédagogique.',
      pausedNotice: 'Séquence en pause.', completeNotice: 'Séquence pédagogique terminée.',
      changed: 'Message mis à jour. Prêt à transmettre.', bit: 'bit', byte: 'Octet', flip: 'Inverser le',
      match: 'CRC identiques', mismatch: 'CRC différents',
      matchNote: 'Les données de référence et les données reçues donnent le même CRC. Ce contrôle est illustratif, pas un essai matériel.',
      mismatchNote: 'Les données modifiées donnent un autre CRC : cette erreur est détectée. Le CRC ne répare pas le message.',
      collisionNote: 'Les CRC sont identiques malgré des données modifiées. Un CRC ne détecte pas toutes les altérations possibles.',
      changedBit: 'bit modifié', changedBits: 'bits modifiés', noBit: 'Données originales', resetNotice: 'Données originales restaurées.',
      changedPayload: 'Message mis à jour.', off: 'OFF', on: 'ON', original: 'Octet original', receivedByte: 'Octet reçu'
    }
  };

  function labelsFor(root) { return copy[root.dataset.lang === 'fr' ? 'fr' : 'en']; }

  document.querySelectorAll('[data-morse-signal]').forEach(root => {
    const labels = labelsFor(root);
    const controls = root.querySelector('[data-morse-controls]');
    const form = root.querySelector('[data-morse-form]');
    const input = root.querySelector('[data-morse-input]');
    const play = root.querySelector('[data-morse-play]');
    const step = root.querySelector('[data-morse-step]');
    const reset = root.querySelector('[data-morse-reset]');
    const waveform = root.querySelector('[data-morse-wave]');
    const cursor = root.querySelector('[data-morse-cursor]');
    const progress = root.querySelector('[data-morse-progress]');
    const status = root.querySelector('[data-morse-status]');
    const announcement = root.querySelector('[data-morse-announcement]');
    if (!controls || !form || !input || !play || !step || !reset || !waveform || !cursor || !progress || !status || !announcement) return;

    const unitMilliseconds = 180; // Pedagogical playback scale, not a measured board setting.
    let sequence = encodeMorse(input.value || 'SOS');
    let elapsed = 0;
    let startedAt = 0;
    let playing = false;
    let animation = 0;
    let currentIndex = -1;
    const audioKey = `morse-playback-${root.id}`;
    const reduced = global.matchMedia('(prefers-reduced-motion: reduce)');

    function announce(text) { announcement.textContent = text; }
    function renderWave() {
      const width = 840;
      const x = units => 30 + (units / sequence.totalUnits) * width;
      let path = 'M30 110';
      sequence.segments.forEach(segment => {
        const start = x(segment.start);
        const end = x(segment.start + segment.units);
        const y = segment.on ? 42 : 110;
        path += ` L${start.toFixed(2)} ${y} L${end.toFixed(2)} ${y}`;
      });
      path += ' L870 110';
      waveform.setAttribute('d', path);
      root.querySelector('[data-morse-encoded]').textContent = sequence.morse;
      root.querySelector('[data-morse-message]').textContent = sequence.text;
      root.querySelector('[data-morse-total]').textContent = `${sequence.totalUnits}T`;
    }

    function paint(force = false) {
      const total = sequence.totalUnits * unitMilliseconds;
      const fraction = Math.min(1, elapsed / total);
      cursor.setAttribute('x1', String(30 + 840 * fraction));
      cursor.setAttribute('x2', String(30 + 840 * fraction));
      progress.value = Math.round(fraction * 100);
      progress.setAttribute('aria-valuetext', `${Math.round(fraction * 100)}%`);
      const index = elapsed >= total ? sequence.segments.length : sequence.segments.findIndex(segment => elapsed < (segment.start + segment.units) * unitMilliseconds);
      if (force || index !== currentIndex) {
        currentIndex = index;
        const segment = sequence.segments[index];
        global.PortfolioAudio?.stopLoop(audioKey);
        if (playing && segment?.on) global.PortfolioAudio?.startLoop(audioKey, 'morse', { frequency: 620, gain: .10 });
        root.dataset.signalOn = String(Boolean(segment?.on));
        root.querySelector('[data-morse-gate]').textContent = segment?.on ? labels.on : labels.off;
        root.querySelector('[data-morse-letter]').textContent = segment?.letter || (elapsed >= total ? sequence.text : '—');
        root.querySelector('[data-morse-phase]').textContent = segment ? `${labels[segment.kind]} · ${segment.units}T` : labels.complete;
        // Complete a letter after its separating gap (or the final message pulse).
        let receivedText = '';
        for (let letterIndex = 0; letterIndex < sequence.text.length; letterIndex += 1) {
          const letter = sequence.text[letterIndex];
          const parts = sequence.segments.filter(part => part.letterIndex === (letter === ' ' ? letterIndex - 1 : letterIndex) && (letter === ' ' ? part.kind === 'wordGap' : part.on || part.kind === 'letterGap' || part.kind === 'wordGap'));
          if (parts.some(part => (part.start + part.units) * unitMilliseconds > elapsed)) break;
          receivedText += letter;
        }
        root.querySelector('[data-morse-decoded]').textContent = elapsed >= total ? sequence.text : receivedText.trimEnd() || '—';
      }
    }

    function stop(notice = false) {
      if (playing) elapsed = Math.min(sequence.totalUnits * unitMilliseconds, performance.now() - startedAt);
      const wasPlaying = playing;
      playing = false;
      global.cancelAnimationFrame(animation);
      animation = 0;
      global.PortfolioAudio?.stopLoop(audioKey);
      play.textContent = elapsed >= sequence.totalUnits * unitMilliseconds ? labels.replay : labels.play;
      play.setAttribute('aria-pressed', 'false');
      if (wasPlaying) {
        status.textContent = labels.paused;
        paint();
        if (notice) announce(labels.pausedNotice);
      }
    }

    function restart() {
      stop();
      elapsed = 0;
      currentIndex = -1;
      root.dataset.signalOn = 'false';
      play.textContent = labels.play;
      status.textContent = labels.ready;
      paint(true);
      // At rest no carrier is emitted; the first pulse starts only on explicit play/step.
      root.dataset.signalOn = 'false';
      root.querySelector('[data-morse-gate]').textContent = labels.off;
      root.querySelector('[data-morse-phase]').textContent = labels.waiting;
      root.querySelector('[data-morse-letter]').textContent = '—';
      root.querySelector('[data-morse-decoded]').textContent = '—';
      currentIndex = -1;
    }

    function tick(now) {
      if (!playing || document.hidden) { stop(); return; }
      elapsed = Math.min(sequence.totalUnits * unitMilliseconds, now - startedAt);
      paint();
      if (elapsed >= sequence.totalUnits * unitMilliseconds) {
        playing = false;
        animation = 0;
        global.PortfolioAudio?.stopLoop(audioKey);
        play.textContent = labels.replay;
        play.setAttribute('aria-pressed', 'false');
        status.textContent = labels.complete;
        announce(labels.completeNotice);
        return;
      }
      animation = global.requestAnimationFrame(tick);
    }

    function setMessage(value) {
      const next = normalizeText(value);
      if (!next || /[^a-zA-Z0-9 ]/.test(value) || value.trim().length > 12) {
        input.setCustomValidity(labels.fieldError);
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      input.value = next;
      sequence = encodeMorse(next);
      root.querySelectorAll('[data-morse-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.morsePreset === next)));
      renderWave();
      restart();
      announce(labels.changed);
    }

    form.addEventListener('submit', event => { event.preventDefault(); setMessage(input.value); });
    input.addEventListener('input', () => input.setCustomValidity(''));
    root.querySelectorAll('[data-morse-preset]').forEach(button => button.addEventListener('click', () => setMessage(button.dataset.morsePreset)));
    play.addEventListener('click', event => {
      unlockAudio(event);
      if (playing) { stop(true); return; }
      if (elapsed >= sequence.totalUnits * unitMilliseconds) restart();
      playing = true;
      startedAt = performance.now() - elapsed;
      play.textContent = labels.pause;
      play.setAttribute('aria-pressed', 'true');
      status.textContent = sequence.text;
      announce(labels.playing);
      paint(true);
      animation = global.requestAnimationFrame(tick);
    });
    step.addEventListener('click', event => {
      unlockAudio(event);
      stop();
      const total = sequence.totalUnits * unitMilliseconds;
      if (elapsed >= total) restart();
      else if (currentIndex < 0 || elapsed === 0) elapsed = 1;
      else elapsed = Math.min(total, (sequence.segments[currentIndex].start + sequence.segments[currentIndex].units) * unitMilliseconds + 1);
      paint(true);
      if (sequence.segments[currentIndex]?.on) pulseAudio(sequence.segments[currentIndex].units * unitMilliseconds / 1000);
      status.textContent = elapsed >= total ? labels.complete : labels.step;
      play.textContent = elapsed >= total ? labels.replay : labels.play;
      announce(root.querySelector('[data-morse-phase]').textContent);
    });
    reset.addEventListener('click', () => { restart(); announce(labels.ready); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(true); });
    global.addEventListener('blur', () => stop(true));
    global.addEventListener('pagehide', () => stop());
    reduced.addEventListener('change', () => stop(true));
    global.addEventListener('portfolio-audio-change', event => {
      if (playing && sequence.segments[currentIndex]?.on && !document.hidden && event.detail?.enabled && event.detail?.ready) {
        global.PortfolioAudio?.startLoop(audioKey, 'morse', { frequency: 620, gain: .10 });
      } else global.PortfolioAudio?.stopLoop(audioKey);
    });
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(true); }).observe(root);
    }
    renderWave();
    restart();
    controls.hidden = false;
    root.querySelector('[data-morse-playback]').hidden = false;
    root.dataset.enhanced = 'true';
  });

  document.querySelectorAll('[data-morse-key]').forEach(root => {
    const french = root.dataset.lang === 'fr';
    const labels = french ? {
      ready: 'À vous de transmettre', holding: 'Signal ON · relâchez pour recevoir le symbole',
      dot: 'Point reçu ·', dash: 'Trait reçu —', letter: 'Lettre reçue :',
      unknown: 'Séquence inconnue : ? · effacez ou essayez une autre lettre.',
      cancelled: 'Appui interrompu : aucun symbole ajouté.', empty: 'Composez une lettre avant de la terminer.',
      cleared: 'Message effacé.', space: 'Séparation entre les mots.', limit: 'Message complet : effacez pour recommencer.'
    } : {
      ready: 'Your turn to transmit', holding: 'Signal ON · release to receive the symbol',
      dot: 'Dot received ·', dash: 'Dash received —', letter: 'Letter received:',
      unknown: 'Unknown sequence: ? · clear it or try another letter.',
      cancelled: 'Press interrupted: no symbol added.', empty: 'Compose a letter before finishing it.',
      cleared: 'Message cleared.', space: 'Word separator added.', limit: 'Message full: clear it to start again.'
    };
    const controls = root.querySelector('[data-key-controls]');
    const key = root.querySelector('[data-key-press]');
    const raw = root.querySelector('[data-key-raw]');
    const decoded = root.querySelector('[data-key-decoded]');
    const preview = root.querySelector('[data-key-preview]');
    const status = root.querySelector('[data-key-status]');
    const duration = root.querySelector('[data-key-duration]');
    const announcement = root.querySelector('[data-key-announcement]');
    if (!controls || !key || !raw || !decoded || !preview || !status || !duration || !announcement) return;

    const unit = 180;
    const audioKey = `morse-key-${root.id}`;
    const tokens = [];
    let pending = '';
    let held = false;
    let startedAt = 0;
    let animation = 0;
    let letterTimer = 0;
    let wordTimer = 0;
    let pointerId = null;
    let keyboardKey = '';
    let lastRelease = -1000;
    const words = french ? ['MARS', 'LUNE', 'CIEL', 'ORION', 'RADIO', 'SONDE', 'SIGNAL', 'FUSEE'] : ['MOON', 'MARS', 'ORBIT', 'RADIO', 'SOLAR', 'COMET', 'SPACE', 'PULSE'];
    let target = '';
    let successAnnounced = false;

    function currentMessage() { return tokens.map(token => token.letter).join('').trimEnd(); }
    function paintChallenge() {
      const progress = challengeProgress(currentMessage(), target);
      root.dataset.challengeComplete = String(progress.complete);
      root.dataset.challengeMismatch = String(progress.mismatch);
      root.querySelector('[data-key-challenge-progress]').textContent = `${progress.correct} / ${target.length}`;
      root.querySelector('[data-key-feedback]').textContent = progress.complete
        ? (french ? 'Message reçu. Défi réussi !' : 'Message received. Challenge complete!')
        : progress.mismatch
          ? (french ? `Une lettre diffère à la position ${progress.correct + 1}. Effacez et réessayez le même mot.` : `A letter differs at position ${progress.correct + 1}. Clear the message and retry this word.`)
          : progress.correct
            ? (french ? `${progress.correct} ${progress.correct === 1 ? 'lettre correcte' : 'lettres correctes'}. À vous de composer la suite.` : `${progress.correct} correct ${progress.correct === 1 ? 'letter' : 'letters'}. Encode the rest of the word.`)
            : (french ? 'Composez ce mot avec vos propres appuis. Les lettres seront vérifiées à réception.' : 'Encode this word with your own presses. Each letter is checked when received.');
    }

    function announce(message) { announcement.textContent = message; }
    function setStatus(message, spoken = false) { status.textContent = message; if (spoken) announce(message); }
    function clearTimers() { global.clearTimeout(letterTimer); global.clearTimeout(wordTimer); letterTimer = 0; wordTimer = 0; }
    function paint() {
      raw.textContent = [...tokens.map(token => token.symbols), ...(pending ? [pending] : [])].join(' ') || '—';
      decoded.textContent = tokens.map(token => token.letter).join('').trimEnd() || '—';
      preview.textContent = pending ? decodeMorse(pending) : '—';
      root.dataset.keyOn = String(held);
      key.setAttribute('aria-pressed', String(held));
      paintChallenge();
    }
    function finishLetter(spoken = true) {
      global.clearTimeout(letterTimer);
      letterTimer = 0;
      if (!pending) return false;
      const letter = decodeMorse(pending);
      tokens.push({ symbols: pending, letter });
      pending = '';
      paint();
      if (challengeProgress(currentMessage(), target).complete && !successAnnounced) {
        successAnnounced = true;
        setStatus(french ? 'Message reçu. Défi réussi !' : 'Message received. Challenge complete!', spoken);
        if (spoken && !document.hidden) global.PortfolioAudio?.play('pulse', { frequency: 880, duration: .13, gain: .08 });
      } else setStatus(letter === '?' ? labels.unknown : `${labels.letter} ${letter}`, spoken);
      return true;
    }
    function addSpace(spoken = true) {
      finishLetter(false);
      if (!tokens.length || tokens[tokens.length - 1].letter === ' ') return;
      tokens.push({ symbols: '/', letter: ' ' });
      paint();
      setStatus(labels.space, spoken);
    }
    function scheduleGaps() {
      clearTimers();
      letterTimer = global.setTimeout(() => finishLetter(), 3 * unit);
      wordTimer = global.setTimeout(() => { wordTimer = 0; addSpace(false); }, 7 * unit);
    }
    function appendSymbol(symbol, timed) {
      clearTimers();
      if (tokens.length >= 64 || pending.length >= 6) { setStatus(labels.limit, true); return; }
      pending += symbol;
      paint();
      setStatus(symbol === '.' ? labels.dot : labels.dash, true);
      if (timed) scheduleGaps();
    }
    function release(cancelled = false) {
      if (!held) return;
      const milliseconds = Math.min(4000, performance.now() - startedAt);
      held = false;
      keyboardKey = '';
      lastRelease = performance.now();
      global.cancelAnimationFrame(animation);
      animation = 0;
      global.PortfolioAudio?.stopLoop(audioKey);
      if (pointerId !== null && key.hasPointerCapture?.(pointerId)) key.releasePointerCapture(pointerId);
      pointerId = null;
      duration.textContent = `${(milliseconds / 1000).toFixed(2)} s`;
      root.style.setProperty('--key-hold', '0');
      if (cancelled) { paint(); setStatus(labels.cancelled, true); }
      else appendSymbol(classifyPress(milliseconds, unit), true);
    }
    function tick(now) {
      if (!held || document.hidden) { release(true); return; }
      const milliseconds = now - startedAt;
      duration.textContent = `${(milliseconds / 1000).toFixed(2)} s`;
      root.style.setProperty('--key-hold', String(Math.min(1, milliseconds / (3 * unit))));
      if (milliseconds >= 4000) { release(); return; }
      animation = global.requestAnimationFrame(tick);
    }
    function begin(event) {
      if (held || tokens.length >= 64) return;
      unlockAudio(event);
      clearTimers();
      held = true;
      startedAt = performance.now();
      duration.textContent = '0.00 s';
      paint();
      setStatus(labels.holding);
      global.PortfolioAudio?.startLoop(audioKey, 'morse', { frequency: 620, gain: .10 });
      animation = global.requestAnimationFrame(tick);
    }
    function suspend() {
      release(true);
      clearTimers();
      global.PortfolioAudio?.stopLoop(audioKey);
      finishLetter(false);
    }
    function clearMessage() {
      suspend(); tokens.length = 0; pending = ''; successAnnounced = false; duration.textContent = '—';
      paint(); setStatus(labels.cleared, true);
    }
    function newChallenge() {
      const options = words.filter(word => word !== target);
      target = options[Math.floor(Math.random() * options.length)];
      root.querySelector('[data-key-target]').textContent = target;
      clearMessage();
      setStatus(french ? `Nouveau mot à transmettre : ${target}.` : `New word to transmit: ${target}.`, true);
    }

    key.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false || held) return;
      event.preventDefault();
      key.focus({ preventScroll: true });
      begin(event);
      if (!held) return;
      pointerId = event.pointerId;
      key.setPointerCapture?.(pointerId);
    });
    key.addEventListener('pointerup', event => { if (event.pointerId === pointerId) release(); });
    key.addEventListener('pointercancel', () => release(true));
    key.addEventListener('lostpointercapture', () => release(true));
    key.addEventListener('contextmenu', event => event.preventDefault());
    key.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); release(true); return; }
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (event.repeat || held) return;
      begin(event);
      keyboardKey = event.key;
    });
    key.addEventListener('keyup', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (event.key === keyboardKey) release();
    });
    key.addEventListener('blur', () => release(true));
    key.addEventListener('click', event => {
      event.preventDefault();
      // Assistive technology may activate a button without pointer/keyboard hold events.
      if (event.detail === 0 && !held && performance.now() - lastRelease > 700) {
        unlockAudio(event);
        appendSymbol('.', true);
        pulseAudio();
      }
    });
    root.querySelectorAll('[data-key-symbol]').forEach(button => button.addEventListener('click', event => {
      unlockAudio(event);
      release(true);
      const symbol = button.dataset.keySymbol;
      appendSymbol(symbol, false); // These deliberate controls do not impose a speed requirement.
      pulseAudio(symbol === '.' ? .18 : .54);
    }));
    root.querySelector('[data-key-letter]').addEventListener('click', () => {
      release(true); clearTimers();
      if (!finishLetter()) setStatus(labels.empty, true);
    });
    root.querySelector('[data-key-space]').addEventListener('click', () => { release(true); clearTimers(); addSpace(); });
    root.querySelector('[data-key-reset]').addEventListener('click', clearMessage);
    root.querySelector('[data-key-new-word]').addEventListener('click', newChallenge);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
    global.addEventListener('pagehide', suspend);
    global.addEventListener('blur', suspend);
    global.addEventListener('portfolio-audio-change', event => {
      if (held && !document.hidden && event.detail?.enabled && event.detail?.ready) {
        global.PortfolioAudio?.startLoop(audioKey, 'morse', { frequency: 620, gain: .10 });
      } else global.PortfolioAudio?.stopLoop(audioKey);
    });
    if ('IntersectionObserver' in global) new IntersectionObserver(entries => { if (!entries[0].isIntersecting) suspend(); }).observe(root);
    newChallenge();
    announcement.textContent = '';
    controls.hidden = false;
    root.dataset.enhanced = 'true';
  });

  document.querySelectorAll('[data-morse-crc]').forEach(root => {
    const labels = labelsFor(root);
    const controls = root.querySelector('[data-crc-controls]');
    const form = root.querySelector('[data-crc-form]');
    const input = root.querySelector('[data-crc-input]');
    const byteSelect = root.querySelector('[data-crc-byte]');
    const bits = root.querySelector('[data-crc-bits]');
    const announcement = root.querySelector('[data-crc-announcement]');
    if (!controls || !form || !input || !byteSelect || !bits || !announcement) return;

    let text = normalizeText(input.value || 'SOS');
    let original = asciiBytes(text);
    let received = original.slice();
    let byteIndex = 0;
    let traceIndex = 0;

    function paintTrace() {
      const value = root.querySelector('[data-crc-trace-value]');
      if (!value) return;
      const french = root.dataset.lang === 'fr';
      const steps = crcTrace(received[byteIndex]);
      const current = steps[traceIndex];
      value.textContent = hex(current.register);
      root.querySelector('[data-crc-trace-binary]').textContent = current.register.toString(2).padStart(8, '0');
      root.querySelector('[data-crc-trace-byte]').textContent = hex(received[byteIndex]);
      root.querySelector('[data-crc-trace-step]').textContent = `${traceIndex} / 8`;
      root.querySelector('[data-crc-trace-action]').textContent = traceIndex === 0
        ? (french ? 'Départ : 0x00 XOR octet. Le registre prend la valeur de cet octet.' : 'Start: 0x00 XOR byte. The register takes this byte’s value.')
        : current.highBit
          ? (french ? 'Le bit de gauche valait 1 : décalage à gauche, puis XOR avec 0x07.' : 'The leftmost bit was 1: shift left, then XOR with 0x07.')
          : (french ? 'Le bit de gauche valait 0 : décalage à gauche, sans XOR avec 0x07.' : 'The leftmost bit was 0: shift left, without XOR with 0x07.');
      root.querySelector('[data-crc-trace-next]').textContent = traceIndex === 8
        ? (french ? 'Revoir les 8 étapes' : 'Replay the 8 steps')
        : (french ? 'Étape suivante' : 'Next step');
    }

    function paint() {
      const expected = crc8(original);
      const computed = crc8(received);
      const matches = expected === computed;
      const altered = original.some((byte, index) => byte !== received[index]);
      root.dataset.crcMatch = String(matches);
      root.querySelector('[data-crc-reference]').textContent = hex(expected);
      root.querySelector('[data-crc-computed]').textContent = hex(computed);
      root.querySelector('[data-crc-state]').textContent = matches ? labels.match : labels.mismatch;
      root.querySelector('[data-crc-note]').textContent = matches ? altered ? labels.collisionNote : labels.matchNote : labels.mismatchNote;
      root.querySelector('[data-crc-original-byte]').textContent = hex(original[byteIndex]);
      root.querySelector('[data-crc-received-byte]').textContent = hex(received[byteIndex]);
      root.querySelector('[data-crc-text]').textContent = text;
      root.querySelector('[data-crc-frame-payload]')?.replaceChildren(document.createTextNode(text));
      root.querySelector('[data-crc-frame-checksum]')?.replaceChildren(document.createTextNode(hex(expected)));
      let changes = 0;
      original.forEach((byte, index) => {
        let difference = byte ^ received[index];
        while (difference) { changes += difference & 1; difference >>>= 1; }
      });
      root.querySelector('[data-crc-changes]').textContent = changes ? `${changes} ${changes === 1 ? labels.changedBit : labels.changedBits}` : labels.noBit;
      bits.querySelectorAll('button').forEach(button => {
        const bit = Number(button.dataset.crcBit);
        const value = (received[byteIndex] >>> bit) & 1;
        const changed = ((received[byteIndex] ^ original[byteIndex]) >>> bit) & 1;
        button.querySelector('strong').textContent = String(value);
        button.setAttribute('aria-pressed', String(Boolean(changed)));
        button.setAttribute('aria-label', `${labels.flip} ${labels.bit} ${bit}, ${labels.byte.toLowerCase()} ${byteIndex + 1}: ${value}`);
      });
      paintTrace();
    }

    function setPayload(value) {
      const next = normalizeText(value);
      if (!next || /[^a-zA-Z0-9 ]/.test(value) || value.trim().length > 12) {
        input.setCustomValidity(labels.fieldError);
        input.reportValidity();
        return;
      }
      input.setCustomValidity('');
      text = next;
      input.value = text;
      original = asciiBytes(text);
      received = original.slice();
      byteIndex = 0;
      traceIndex = 0;
      byteSelect.replaceChildren();
      [...text].forEach((letter, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${labels.byte} ${index + 1} · ${letter === ' ' ? '␠' : letter} · ${hex(original[index])}`;
        byteSelect.append(option);
      });
      paint();
      announcement.textContent = labels.changedPayload;
    }

    for (let bit = 7; bit >= 0; bit -= 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.crcBit = String(bit);
      const label = document.createElement('span');
      label.textContent = `b${bit}`;
      const value = document.createElement('strong');
      button.append(label, value);
      button.addEventListener('click', event => {
        unlockAudio(event);
        received[byteIndex] ^= 1 << bit;
        traceIndex = 0;
        paint();
        pulseAudio(.055);
        announcement.textContent = root.querySelector('[data-crc-state]').textContent;
      });
      bits.append(button);
    }
    form.addEventListener('submit', event => { event.preventDefault(); setPayload(input.value); });
    input.addEventListener('input', () => input.setCustomValidity(''));
    byteSelect.addEventListener('change', () => { byteIndex = Number(byteSelect.value); traceIndex = 0; paint(); });
    root.querySelector('[data-crc-reset]').addEventListener('click', () => {
      received = original.slice();
      traceIndex = 0;
      paint();
      announcement.textContent = labels.resetNotice;
    });
    root.querySelector('[data-crc-trace-next]')?.addEventListener('click', event => {
      unlockAudio(event);
      traceIndex = traceIndex === 8 ? 0 : traceIndex + 1;
      paintTrace();
      pulseAudio(.045);
      announcement.textContent = `${root.querySelector('[data-crc-trace-step]').textContent}: ${root.querySelector('[data-crc-trace-value]').textContent}. ${root.querySelector('[data-crc-trace-action]').textContent}`;
    });
    setPayload(text);
    announcement.textContent = '';
    controls.hidden = false;
    const traceControls = root.querySelector('[data-crc-trace-controls]');
    if (traceControls) traceControls.hidden = false;
    root.dataset.enhanced = 'true';
  });
})(typeof window !== 'undefined' ? window : globalThis);
