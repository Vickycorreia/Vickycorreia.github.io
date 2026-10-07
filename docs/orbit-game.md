# Correia / Orbit Lab

The English and French home pages share the same solar-system game. `assets/orbit-game.js` creates the SVG and controls the launch; `assets/orbit-game.css` styles it within the existing personal introduction. There are no dependencies or remote assets. Without JavaScript, the original inline SVG remains visible and the portfolio links still work.

Choose Earth, Mars or Saturn, drag the rocket or the arrow tip to set the initial velocity, then launch. Arrow keys adjust direction and thrust when the scene has focus; Enter launches. Reset and destination selection immediately cancel the current flight. Pause remains available during flight and animated orbits.

The eight planets and Sun form a cartoon map with imaginary distances. Only the selected destination attracts the rocket; all bodies can cause a collision. Preview and flight share a velocity-Verlet integrator with a fixed step of 1/120 second. The three initial circular launches each take approximately six seconds to complete a turn. Escape requires nonnegative orbital energy and outward travel beyond four initial orbital radii; crossing the SVG edge alone is not an escape. A large bound trajectory beyond that distance is identified as a wide orbit if its calculated periapsis clears the destination. Its message does not claim a completed turn, and subsequent collisions are still calculated.

Frames stop while the scene is outside the viewport, the document is hidden, or the player has paused. Returning does not advance the hidden interval. Reduced motion keeps decorative animation still; an explicit launch runs until its result, then a successful orbit freezes. The trail has a bounded history and flight uses one animation-frame loop.

Validation covers actual EN/FR launches for the three destinations, collision and escape through pointer input, keyboard aiming, reset during flight, target changes, pointer cancellation, manual and automatic pauses, reduced motion, mobile gestures, and the static fallback. Resource loading, language navigation and narrow-screen overflow are checked with the rest of the portfolio.
