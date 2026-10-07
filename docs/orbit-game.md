# Correia / Orbit Lab

The English and French home pages share an orbital scene integrated into the introduction's background. `assets/orbit-game.js` creates the transparent SVG and controls the launch; `assets/orbit-game.css` styles the scene and its controls. Earth, the Moon and Mars are the three launch locations, with a distant, faded Sun. There are no remote assets or dependencies. The inline SVG remains visible without JavaScript.

Drag the rocket or arrow tip to set the initial velocity, then launch. Arrow keys adjust direction and thrust while the scene has focus; Enter launches. Reset and changing launch location cancel the current flight immediately. Pause remains available during flight and observed orbits.

All four bodies exert gravity on the rocket at every integration step. Acceleration is the sum of their inverse-square fields, not just the attraction of the selected launch location. The bodies stay fixed during the flight; distances, sizes and gravitational parameters use schematic scene units rather than astronomical scale. A fixed-step velocity-Verlet integrator drives the short initial preview and the full flight, and swept segment checks detect collisions with every body. The dotted preview reveals only the beginning; the subsequent solid trail records the path already travelled.

An orbit message describes a turn observed around a body within its local neighbourhood, rather than promising permanent stability. Single-body Kepler energy or periapsis cannot establish a stable orbit in the combined field. A departure message describes leaving the displayed region, rather than certifying escape from the entire solar gravitational field. Later perturbations and collisions continue to be computed after an observed orbit.

Frames stop when the scene leaves the viewport, the document is hidden, or the player pauses. Returning does not advance the hidden interval. Reduced motion keeps the idle scene still; an explicit launch runs until a result, then an observed orbit freezes. The trail has a bounded history and the flight uses one animation-frame loop.

Validation checks the combined force against an independent analytical sum, the influence of each body, total energy in the fixed field, short-preview consistency, actual launches and outcomes, reset, target changes, pointer cancellation, pause and visibility, reduced motion, mobile gestures, and EN/FR fallback and navigation.
