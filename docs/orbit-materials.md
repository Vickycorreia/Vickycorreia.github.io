# Project world surfaces

`assets/orbit-materials.js` renders five decorative, fictional project worlds on
the existing orbital SVG. The textures suggest Earth (Air France), Mars (sand),
the Moon (Morse), Jupiter (infrared audio) and Mercury (cardboard Rafale). They are
procedural materials, not geographic maps or astronomical observations. Project
size and attraction still use the existing technical-difficulty weights.

The sphere normals, a distant upper-left light, smooth limb shading, coherent
three-dimensional noise, clouds, gas bands and crater bowls are computed into
one transparent PNG per body. The native SVG image remains exactly `2r × 2r`
at `(-r, -r)` inside each unchanged body group. No position, radius, hit region,
reference orbit, flight trajectory or gravitational parameter changes.

The module loads after `orbit-game.js`, waits for the orbital section to enter
the viewport margin, and renders in small idle chunks. It suspends pending work
when that section leaves the viewport or the document is hidden. Once all five
images are rendered there is no animation loop. Renders use 320px spheres on
desktop and 256px on mobile; temporary Canvas buffers are released. Browser
Canvas failures retain the original SVG gradient and relief.

For the baked light to avoid being shaded twice, style only completed bodies:

```css
.orbit-textured > g[clip-path] { display: none; }
.orbit-textured > .orbit-planet-shade { opacity: .12; }
```

Visible explanatory text can read:

- EN: “Project worlds inspired by the Solar System.”
- FR: “Mondes de projets inspirés du Système solaire.”

No third-party material or image is included and no image attribution is
required. Project photographs are unchanged.

Browser verification: all five materials rendered with no JavaScript error in
English at 1440px and French at 390px, including reduced motion. Image extents
match the original radii exactly, the five direct project links remain present,
queued work pauses offscreen and resumes on return, and disabling Canvas keeps
the original five SVG bodies. The desktop batch completed in about 2.5 seconds
in Chromium, with work yielded between short row groups.
