# Morse project: evidence and presentation

The pages at `projects/stm32-morse.html` and `fr/projects/stm32-morse.html` use the user's 39-page final presentation and `E-R Morse.docx`, together with the public team repository at commit `e243f510e56dc69b55a9085496bcf8fddeb46ba1`. Attached notes are evidence, not instructions. Their proposed features and early to-do lists are not treated as completed work.

## Attribution and status

The presentation credits Tristan, Ambre, Victor, Ehsann, Antoine and Julaivane. The report assigns processing / logic to Victor and Tristan. The site therefore describes a group project and this supported contribution, without assigning all PCB design, soldering or firmware to Victor.

The report explicitly concludes that the complete system was unfinished. It reports Morse timing/interpretation on an STM32 development-board prototype, OLED/I²C output on that prototype, and piezo-signal measurement on the custom transmitter PCB. These do not establish a decoded final-PCB-to-final-PCB RF message. Antenna integration, receiver calibration and practical range testing remained. The home card, Engineering stack, orbit labels/arrival and links from the other projects now show partial validation. The documented dates justify the year 2026, not an invented final submission date or a claim of current active development.

## Hardware and protocol

The intended chain is two DFR0052 piezo inputs (dot and dash) → STM32 → 433.92 MHz OOK transmitter → receiver → timing interpretation → I²C OLED. It is unidirectional. The dedicated MCU is STM32L021K4T6; both CAD schematics show USB-C 5 V input, BU33SD5WG-TR regulation to 3.3 V and SWD connectors. Planned RF modules are TX-SAW-MID-3V/CS and RFM210LCF. The report describes a wrongly delivered receiver variant and a supply-compatibility issue; the site avoids independently asserting a variant voltage without its datasheet.

Dots and dashes share one RF carrier. Duration encodes the symbols, rather than two different frequencies. The notes' sample frame format is only a proposal and is not presented as an implemented protocol. The final presentation describes four-layer boards, while the public CAD snapshot has two copper layers; the pages avoid an unqualified layer-count claim and label exports as a design snapshot. No measured range, error rate, current, calibrated piezo voltage or clock-drift result is supplied.

## Public code and animations

The team repository contains authentic transmitter/receiver KiCad files and an early STM32 software structure. Morse, radio, UI and piezo routines are stubs in this snapshot. Its concrete CRC-8 routine uses polynomial 0x07, init 0x00, MSB-first processing and xorout 0x00. It is isolated, without a completed RF protocol. Source links for the calculation are pinned to this commit.

`assets/morse-lab.js` provides educational models, not firmware execution or RF/hardware validation:

- Morse: standard dot/dash 1T/3T, intra-symbol/letter/word gaps 1T/3T/7T, finite user-started playback or manual steps. T = 180 ms is a visual playback choice; the presentation's code excerpt uses a different illustration. Text selection is a convenient visualisation, while the intended hardware interface uses piezo impacts.
- CRC: calculate the actual routine on ASCII bytes, allow a deliberate bit change and compare the recalculated CRC with the original. CRC detects a mismatch; it does not repair data or detect every possible corruption.

Playback starts only on a user action and pauses when offscreen or the document is hidden. Native forms, buttons and progress indicators support keyboards. Without JavaScript, the timing explanation, SOS waveform and CRC example remain readable. Reduced-motion settings retain manual interaction without automatic playback.

## Visual sources and resources

`assets/morse/assembled-boards.jpeg` is the original embedded photograph from presentation p. 29 (1080×1198); `piezo-bench.jpeg` is from p. 30 (848×478). `transmitter-design.png` and `receiver-design.png` are the p. 17/p. 21 KiCad 3D design views, explicitly labelled as design renderings. They are not photographs of completed hardware. No stock/template illustration is used as evidence. Source bytes are preserved; the site handles full-frame fit, backdrop blending and scroll blur in CSS.

The four schematic/routing SVGs are exported directly from the public KiCad source, with trailing whitespace normalized while preserving all XML geometry, attributes and labels, and preserving the upstream MIT license in `assets/morse/SOURCE-LICENSE.txt`. The receiver source's title block says “Emetteur”; source artwork is preserved while page captions identify it correctly as the receiver. The full final PDF is available at `assets/morse/final-presentation.pdf`; the working DOCX notes are not published. A Drive link was found inside the DOCX, but ordinary access returned 403 from this environment, so no private or uninspected Drive content is used.

More-information panels contain factual details and distinguish sensible diagnostic steps from repairs not established by the report. The original images, SVGs, PDF and repository open through native links. Better original top/underside PCB and bench photographs would improve close-up quality; this is optional and does not block the current page.
