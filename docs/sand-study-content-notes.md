# Sand avalanche study: content sources

The page uses the supplied final presentation, *Mécanique des matériaux granulaires : Dynamique des avalanches de sable*, and the four montages in `sable.zip`. The presentation is a source document rather than a public download.

| Content | Source slides | Interpretation used on the page |
| --- | --- | --- |
| Drum angles: 36.7 ± 0.3° and 32.1 ± 0.6° | 4–6 | Reported onset/resting measurements; keep their stated uncertainties. |
| μ = 0.7, θc ≈ 35° | 5 | Input and prediction of a simplified Coulomb model. |
| Rough inclinable plane, variable-feed hopper, approximately 30 cm/s | 7–10 | Apparatus and reported sand-avalanche observation. |
| Tac-Tac ball/cylinders, approximately 0.33 m/s, e ≈ 0.46 | 11–14, 21 | Separate analogue experiment; restitution inferred using its impact model. |
| Layer-depth comparison and Hstart/Hstop | 15–18 | Qualitative stability findings; explicitly distinguish the Adrian Daerr literature illustration. |
| Python / NumPy / Matplotlib | 20, 22–23 | Documented analysis tools; avoid claiming each appendix reproduces the main-slide figures. |

The impact model balances gravitational energy gain with collision losses. It does not conserve mechanical energy through dissipative impacts. The restitution estimate belongs to the Tac-Tac analogue, not to all sand grains.

Some appendix datasets and fits differ from the main slides. The Hstart/Hstop plot also has an ambiguous angle-axis unit. The page therefore reproduces the main reported results, explains the methods, and avoids creating numerical plots from ambiguous data.

The supplied montages contain illustrative annotations. Their numerical labels are not treated as measured project results. WebP assets preserve the decoded RGB pixels of the supplied PNGs exactly. The angle widget uses the reported central onset/rest values to illustrate hysteresis. Its simple steady-feed model assumes an unlimited supply: grains remain immobile at rest, move downhill at a constant illustrative speed during flow, and are replenished at the high end so the layer stays uniform. The animation speed is a visual parameter unrelated to the reported experimental velocities; the widget generates no experimental data.

## Recorded experiments

Five MP4 clips supplied on 7 October 2026 appear in both language versions of the home video gallery and sand study. Each gallery card links to its matching experiment; both locations reference the same media file.

| Uploaded WhatsApp filename time | Published basename | Recorded experiment |
| --- | --- | --- |
| 09.40.03 | `drum-flow` | Turning the sand-filled drum and triggering an avalanche. |
| 01.37.04 | `sand-flow` | Releasing sand from the hopper into the apparatus. |
| 01.34.10 | `ball-restitution` | Releasing a ball and observing its rebound to study restitution. |
| 09.40.48 | `tac-tac-normal` | Ball descent over PVC tubes at normal speed. |
| 09.41.53 | `tac-tac-slow` | A separate slow-motion ball descent over PVC tubes. |

The rebound clip does not independently establish the report’s model-inferred e ≈ 0.46. The hopper clip does not independently establish the reported avalanche speed. Normal-speed and slow-motion clips are separate trials; no slow-motion factor is inferred from their frame rates.

Media in `assets/sand-study/videos/` use their original H.264 video and AAC audio streams, remuxed with MP4 fast-start metadata. No colour grading, cropping, audio removal or timing conversion is applied. WebP posters are frames extracted from the same recordings.

The shared `project-video.css` and `project-video.js` component uses native video controls. Project-page videos marked `data-scroll-play` can start muted when sufficiently visible, while home-gallery videos remain manual. The component pauses clips outside the screen or in a hidden tab, respects deliberate pauses and reduced-motion preferences, and leaves the native player available without JavaScript.
