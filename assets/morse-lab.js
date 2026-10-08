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

  const exported = { ALPHABET, normalizeText, encodeMorse, crc8, asciiBytes, hex };
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
    play.addEventListener('click', () => {
      if (playing) { stop(true); return; }
      if (elapsed >= sequence.totalUnits * unitMilliseconds) restart();
      playing = true;
      startedAt = performance.now() - elapsed;
      play.textContent = labels.pause;
      play.setAttribute('aria-pressed', 'true');
      status.textContent = sequence.text;
      announce(labels.playing);
      animation = global.requestAnimationFrame(tick);
    });
    step.addEventListener('click', () => {
      stop();
      const total = sequence.totalUnits * unitMilliseconds;
      if (elapsed >= total) restart();
      else if (currentIndex < 0 || elapsed === 0) elapsed = 1;
      else elapsed = Math.min(total, (sequence.segments[currentIndex].start + sequence.segments[currentIndex].units) * unitMilliseconds + 1);
      paint(true);
      status.textContent = elapsed >= total ? labels.complete : labels.step;
      play.textContent = elapsed >= total ? labels.replay : labels.play;
      announce(root.querySelector('[data-morse-phase]').textContent);
    });
    reset.addEventListener('click', () => { restart(); announce(labels.ready); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(true); });
    global.addEventListener('pagehide', () => stop());
    reduced.addEventListener('change', () => stop(true));
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(true); }).observe(root);
    }
    renderWave();
    restart();
    controls.hidden = false;
    root.querySelector('[data-morse-playback]').hidden = false;
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
      button.addEventListener('click', () => {
        received[byteIndex] ^= 1 << bit;
        paint();
        announcement.textContent = root.querySelector('[data-crc-state]').textContent;
      });
      bits.append(button);
    }
    form.addEventListener('submit', event => { event.preventDefault(); setPayload(input.value); });
    input.addEventListener('input', () => input.setCustomValidity(''));
    byteSelect.addEventListener('change', () => { byteIndex = Number(byteSelect.value); paint(); });
    root.querySelector('[data-crc-reset]').addEventListener('click', () => {
      received = original.slice();
      paint();
      announcement.textContent = labels.resetNotice;
    });
    setPayload(text);
    announcement.textContent = '';
    controls.hidden = false;
    root.dataset.enhanced = 'true';
  });
})(typeof window !== 'undefined' ? window : globalThis);
