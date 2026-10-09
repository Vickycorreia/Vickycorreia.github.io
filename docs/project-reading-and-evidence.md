# Project reading and evidence

All five projects in English and French share three additions: a native personal-contribution details block near the four-fact introduction, a visual result summary after the experiments, and a project status / takeaways block. The completed Air France internship and presented sand study are distinguished from ongoing IR and Rafale work. Morse retains partial validation at the final presentation, without implying active development. No completion percentages, dates or new experimental values are invented. Home cards for IR and Rafale show their next step.

## Navigation

`project-reading-nav.css` and `project-reading-nav.js` provide a five-part native contents menu: objective, setup, tests/checks, results and takeaways/next steps. Photo-chapter shortcuts target readable headings rather than the full-screen photo reveal. Existing anchors remain available, including the former Air France and Morse summary IDs.

The existing `space-navigation.js` rocket gauge remains the sole page-progress instrument. Its description also identifies the current reading section. The new menu updates on scroll/resize/layout changes without continuous animation. Native links retain hashes, and keyboard focus follows the selected section. Escape closes the menu and returns focus. The menu hides while a photo’s detailed-information panel is open. Without JavaScript it remains an ordinary expanded contents list.

On narrow screens and short landscape viewports, the menu becomes a 48 px reading toolbar once the main header leaves the viewport. Chapter labels sit below it, and heading shortcuts leave room for both controls. This keeps the chapter text clear of a floating box while retaining the existing rocket gauge.

## Result visuals and contribution

`project-evidence.css` styles compact, static HTML/SVG blocks:

- Air France: observed transmit activity, PCAN reference and the receive-path validation boundary.
- Sand: reported resting angle 32.1 ± 0.6° and onset angle 36.7 ± 0.3°, drawn on one degree scale with their stated uncertainties. These are not reinterpreted as confidence intervals. The original experiment, apparatus and interpretation remain described in the photo chapters and sand widget.
- Morse: demonstrated prototype timing/OLED and measured piezo response, separated from the unfinished final PCB-to-PCB radio chain. Processing and logic are credited to Victor with Tristan within the team.
- Rafale: currently assembled manual structure, remaining finish/accessories and optional electronic gear extension. Personal construction is documented independently; the concept preview remains clearly labelled.
- Infrared: qualitative square-command versus rounded-pulse response from the 10 kHz written test account. The schematic has no measured time/amplitude axes and is not an oscilloscope digitisation. Analogue participation remains a team contribution; 45 kHz, stereo FM/PLL and approximately 10 m remain goals.

The Air France and Morse generic bottom summaries have been replaced by these more concrete blocks. Other chapters, animations, code/documentation links and native video controls remain in place.

## Source images

`project-photo-sources.css` presents source links in each photo’s information panel, with short corner controls that remain usable on narrow screens. `docs/project-photo-provenance.json` records the source, byte hashes, dimensions and relationship to the displayed image.

Four unchanged JPEGs extracted from the supplied sand report are available under `assets/project-originals/sand/`. They are actual experiment photos, distinct from the supplied illustrative montages. The sand corner controls open these experiment photographs; the information panel also retains the presentation montage. The introductory montage links to the associated experiment photo below its caption.

Morse images match the embedded source bytes from the supplied presentation. Photos, CAD renderings and routing exports keep distinct labels. The six supplied Rafale files match the ZIP bytes and remain unchanged; page rotation and fading are CSS effects.

Air France keeps its existing public presentation versions, with internal monitor material already removed. Raw camera files were not available. Infrared also lacks the raw inline camera bytes; the current versions are explicitly presentation retouches, not originals. No unavailable source is reconstructed or falsely offered as a raw photograph.

## Verification

Checks cover all twelve site pages for language navigation, unique IDs, preserved anchor destinations and local resources. Project checks cover desktop, narrow mobile, landscape, native controls with JavaScript disabled, reduced motion, contents focus/current section, rocket-gauge integration, detailed-information visibility, source links and static result accessibility. Source hashes are verified against the extracted files. No orbital physics or experimental animation model changes are involved.
