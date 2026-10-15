# Celestial development tuner

Run `npm run dev`, then open the development URL with `?celestialTuning=1`
(for example `http://localhost:5173/?celestialTuning=1`). If the URL already
has a query, append `&celestialTuning=1`. Remove the parameter and reload to hide it.
The panel is excluded from production builds.

Adjust Astronaut and Earth using sliders or numeric fields. Drag the move
handle to reposition the panel; collapse its title to inspect the Hero.
Aim in the Hero and press **Shift+F** to freeze/resume the camera. Sliders
remain live while frozen, including Earth's `centerY` anchor.

**Copy** exports the current JSON; **Reset** restores the committed defaults.
Edits are temporary and reset on reload. To preserve a chosen composition,
copy the JSON into `defaultConfig` in
`src/components/Hero/CelestialDiscoveries.tsx`.
