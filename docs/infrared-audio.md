# Infrared speaker project

Both `projects/infrared-audio.html` and `fr/projects/infrared-audio.html` describe the ongoing second-year ENSEA team project. The user supplied a technical account (`Texte collé.txt`) and five inline photographs. The approximately 90-hour figure is the planned project framework, not completed work. Personal contribution is participation in the analogue studies and tests; no division of roles or custom PCB authorship is assumed.

## What the page establishes

- Initial transmitter/receiver tests at 10 kHz, with square command and distorted pulse-like received response. The exact pink-trace measurement node is not established.
- A transistor teaching board and a TL081 teaching board. The role of the visible adjustment and the actual receiver topology require the schematic.
- XR2206 / HC4046 and TL081 / TL082 studies, and the start of a PSpice representation.
- FM audio, VCO / PLL integration, stereo channels on distinct carriers, speaker amplification, infrared remote volume control and a roughly 10 m final range remain objectives.
- 45 kHz is a proposed carrier and 10 mA an initial LED design target. Neither is reported as a measured result.

The narratives state the question, experiment, observation and next check. The native “More information” blocks provide current limiting, VCO control, phase integration, ideal transimpedance conversion, calculated periods and Carson bandwidth / channel separation, while distinguishing these principles from the installed circuit. Possible RC, coupling, bandwidth and saturation explanations remain hypotheses.

## Photographic presentation

`assets/infrared-audio/` contains five WebP presentation images: `architecture`, `emitter`, `receiver`, `optical-link`, and `bench`. Imagegen was used to rotate the portrait teaching boards and adjust photographic presentation; WebP encoding uses FFmpeg without further rotation or colour filters. These AI-retouched versions are presentation material, not raw captures for measuring components, printed values or waveforms. The paired-board image was reviewed and regenerated to preserve the original tabletop composition without introducing laboratory equipment. The page states that photographs have been reoriented and retouched and that quantitative claims come from the supplied account.

The emitter and paired boards were rotated counterclockwise, the receiver clockwise. Whiteboard and bench photographs retain landscape orientation. Full-photo links open these presentation versions in a separate tab, with `noopener noreferrer`.

Each chapter shows a contained foreground photograph over a softened full-section photographic background, so circuit details remain in frame. The shared `photo-reading.css` / `photo-reading.js` progressively blur and wash towards white as the user scrolls; concise leads and fuller paragraphs continue through the natural document flow. Native details work without JavaScript; close and Escape support come from the shared script. Reduced motion keeps a readable fixed presentation.

## Interactive illustrations

`infrared-link.js` / `infrared-link.css` implement a finite 3.6-second optical-link illustration with run/stop, obstacle and reset controls. Copper rays make invisible infrared conceptually visible; waveform examples and propagation are explicitly illustrative. Sounds use the shared optional `PortfolioAudio` system, following a gesture. The animation stops off screen, on loss of focus or with reduced motion. No automatic replay.

The existing `fm-lab.js` / `fm-lab.css` continue to show constant-amplitude sinusoidal FM in relative units, with frequency and modulation-index controls, an animation and an audible illustration. It does not simulate actual hardware, stereo validation or a PLL measurement.

## Verification

- All 12 local pages: existing language variants, unique IDs, local assets and anchor targets, native language navigation, browser resource / JavaScript errors and desktop overflow.
- Infrared EN/FR: desktop, phone, narrow phone and landscape, five loaded photos, four-fact brief, first-view title, progressive whitening, full-photo links, details / Escape and fallback content without JavaScript and with reduced motion.
- Optical illustration: finite sequence, obstacle, reset, shared mute, lifecycle stops, touch controls and keyboard interaction.
- Home discovery: in-progress status in native and generated orbital labels, direct links, mission telemetry and photo previews, keyboard / Escape and mobile layout. Orbital physics are unchanged.
