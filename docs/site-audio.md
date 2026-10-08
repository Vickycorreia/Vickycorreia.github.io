# Shared sound design

`assets/site-audio.js` provides the optional `window.PortfolioAudio` API. Include it with `defer` before animation scripts and load `assets/site-audio.css` after the navigation styles. A compact, bilingual Sound / Son toggle joins the header language switch. It controls both generated effects and original video audio, with an explicit silent preference saved between routes.

Audio remains silent until a trusted pointer or keyboard interaction. A gesture unlocks Web Audio; activating an animation can then call `play()` or `startLoop()` immediately. Pending sounds are cancelled by mute, `stopAll()`, page backgrounding or blur. Focus alone never restarts audio. Synthesis uses sine tones and filtered noise, with a master gain of 0.12 and no external audio files.

API:

- `unlock(event?)`: resumes audio on a trusted gesture; resolves to readiness.
- `play(kind, {duration, frequency, gain, volume}?)`: a finite effect. Duration is in seconds; `gain` is a relative effect level. Small values such as 0.06–0.10 are compensated for filtered noise or pure tones before the master gain, so textures remain audible without raising every effect.
- `startLoop(key, kind, options?)` / `stopLoop(key)`: explicitly owned continuous sound, such as a held Morse key or a running grain illustration. Stop on pause, completion, offscreen visibility and reset.
- `stopAll()` / `setEnabled(boolean)`.
- `enabled`, `ready`, `supported` getters.
- The window event `portfolio-audio-change` provides `detail.enabled`, `detail.ready` and `detail.supported`.

Effect names include `launch`, `rocket`, `frame`, `pulse`, `morse`, `success`, `impact`, `escape`, `tick`, `grain` and `build`. Sound effects are illustrative; they do not represent recorded hardware or a physical measurement.

The infrared FM demonstration uses a finite eight-note illustration after an explicit Listen action. The notes follow the relative input frequency and modulation index; they are not the optical carrier or a recording of the circuit. Scheduled notes stop on global mute, blur, backgrounding, leaving the demonstration, or reset. The visual animation lasts six seconds, and reduced motion replaces it with one phase step.

## Original video audio

All five supplied project recordings retain their original stereo AAC tracks:

| File | Sample rate |
| --- | --- |
| `sand-flow.mp4` | 48 kHz |
| `drum-flow.mp4` | 48 kHz |
| `tac-tac-normal.mp4` | 48 kHz |
| `ball-restitution.mp4` | 44.1 kHz |
| `tac-tac-slow.mp4` | 44.1 kHz |

`assets/project-video.js` enables original audio after interaction when global sound is on. A native mute choice remains attached to its video across global toggles. Global silence always overrides attempted native unmute. At most one video plays at a time; manual playback takes priority. Native controls, manual pauses, the 55% scroll threshold, reduced-motion opt-in and offscreen pause remain available. Browser rejection of audible scroll playback falls back to muted playback. No audio is invented or substituted for a recording.
