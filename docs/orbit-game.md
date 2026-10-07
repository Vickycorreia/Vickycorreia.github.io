# Correia / Orbit Lab

The English and French home pages share a transparent orbital scene integrated into the introduction. `assets/orbit-game.js` creates a distant faded Sun and one world for each of the five projects: Air France, sand avalanches, STM32 Morse, infrared audio and the cardboard Rafale. Procedural SVG terrain, atmospheric shading and a slim launch vehicle require no external dependencies. Native SVG project links and HTML shortcuts remain available without JavaScript.

## Weights, size and gravity

The user chose **technical difficulty** as the basis for project weights. Initial editorial weights are Air France 5, sand 4, infrared audio 4, STM32 3 and Rafale 2. These relative scores are configurable in the single `PROJECT_DEFS` table; they are not measurements of effort or astronomical masses. Each project's model mass is `weight / 5`, radius is `32 × cbrt(mass)` (the same model density), and gravitational parameter is `G × mass`, with `G = 200000` in scene units. Changing a weight changes both its size and its attraction. The distant Sun is a separate attractor.

At every fixed step the rocket's acceleration is the vector sum `Σ G Mᵢ (rᵢ − r) / |rᵢ − r|³`. Force magnitude is proportional to each mass and inversely proportional to squared distance. All six visible attractors contribute, regardless of the chosen launch preset. Positions remain fixed in schematic scene coordinates. Outside-body gravity is unsoftened; swept segment checks catch surface collisions before singularities are reached.

Newton's inverse-square field gives the three Kepler laws for a single attractor: an ellipse with that attractor at one focus, equal swept areas in equal times, and `T² ∝ a³`. Combined fields perturb those ellipses. A turn observed in this scene does not guarantee a permanently stable orbit, and leaving the scene does not certify escape from the full gravitational field.

## Interaction

Each project has a prepared launch, selected through the five orbit buttons. Fine solid reference paths show the actual first revolution computed with the same integrator as the flight; they are not fitted ellipses. Drag the rocket or arrow tip to adjust its initial velocity. Arrow keys change direction and initial speed; Enter launches when the scene itself has focus. Manual adjustment clears the preset selection; reset restores the current project's prepared launch.

The dotted preview covers **four seconds of visible flight** at the nominal simulation speed (`PREVIEW_TIME = 4 × TIME_SCALE`). It stops earlier only for a collision or departure. It does not expose a predicted result and cannot navigate. A solid bounded trail records only the path already travelled. All calculations use the same fixed-step velocity-Verlet integrator (`STEP = 1/120`). The thrust percentage sets initial launch speed; flight then coasts under gravity.

Contact with a project world after an explicit launch opens that project's localized page. Contact with the Sun remains a collision. Preview, reference calculation, initialization and reset never open pages. Native planet links also allow immediate exploration; pressing Enter on a project link retains normal link behavior.

Pause, reset and changing presets cancel or interrupt flight appropriately. Animation frames stop outside the viewport, on document hiding and during manual pause, without catching up on return. A first observed revolution pauses the flight automatically so its result can be inspected; Resume continues the same physical simulation. Reduced motion keeps the idle scene still; flight always requires an explicit launch or resume. Pointer targets and buttons are at least 44 CSS pixels. EN/FR project routes include the new Rafale page and the saved language preference.

## Validation

Independent checks compare Newton's vector force with a separate analytical calculation, double masses and distances, remove each attractor, verify mass/weight and radius³/mass consistency, check all three Kepler laws in a single-body case, and compare each prepared orbit and four-second preview with actual integration. Browser checks cover five project links, explicit-launch landings, reset and custom aim, pointer and keyboard controls, pause, visibility, reduced motion, native fallback, localization and responsive layout.
