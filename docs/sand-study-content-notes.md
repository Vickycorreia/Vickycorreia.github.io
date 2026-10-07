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
