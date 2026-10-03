# Celestial discovery verification

Both supplied replacements were copied byte-for-byte from `assets_archives`:

- `ChatGPT Image Oct 1, 2026, 02_41_52 PM-2.png` → `src/assets/celestial/earth-source.png` (1672 × 941, 2,579,540 bytes).
- `ChatGPT Image Oct 1, 2026, 02_41_48 PM-1.png` → `src/assets/celestial/astronaut-source.png` (1122 × 1402, 1,626,312 bytes).

Both are RGBA PNGs with transparent backgrounds. The astronaut's former upper-right black-hole region is fully transparent. Neither image was cropped, resized, painted, or regenerated.

The discoveries are static Three.js sprites in the existing R3F scene. Their materials use sRGB textures, full opacity, and render order 1 above the existing stars at order 0. Each texture loads independently and is disposed on unmount.

| Object | World anchor yaw / elevation | Distance | Angular scale |
| --- | --- | --- | --- |
| Astronaut | −22° / +41° | 24 units | 4° full-body height, accounting for transparent margins |
| Earth | +18° / −50° | 48 units | 20° texture width / 10° radius-equivalent |

Earth uses a local sprite center of `[0.5, 1.55]` to place its complete artwork below its world anchor. This keeps the source's rectangular edges beyond the deepest supported downward view. The partial horizon is produced by camera framing, with the full source texture and UVs intact.

## Checks

- `pnpm build`: passed. Vite retains its large-chunk advisory.
- `git diff --check`: passed, including the new component checked separately.
- Browser: Chromium with software WebGL, at 1440×900, 1366×768, 1920×1080, 2560×1080, 390×844, and 844×390.
- All six neutral screenshots were pixel-identical to captures taken before integration. Both complete sprite rectangles are outside the neutral frustum.
- Desktop upper-left pointer exploration revealed the complete astronaut. Downward/right exploration revealed Earth's partial horizon. Their opaque areas composite over the stars.
- Title bounds stayed unchanged in all neutral and discovery views; no horizontal overflow; one canvas; original 2,476 stars.
- Keyboard light toggle: on/off passed. Cord pull: armed, toggled on, and settled after release.
- Mobile: coarse-pointer mode remained active, and a native touch swipe scrolled the page (1046 px). No touch camera control was added.
- Corrupting each PNG response independently omitted only that discovery; the other discovery, all stars, and the Hero remained working.
- Context loss removed the canvas and preserved the CSS fallback and Hero.
- No JavaScript or WebGL errors. Chromium reported the existing `/favicon.ico` 404.

At 844×390 the Hero keeps its existing minimum height, so Earth can stay below the visible viewport. Mobile exploration remains unavailable under the existing coarse-pointer policy.

Representative screenshots and actual scene/interaction observations are stored alongside this report. Application source changes are limited to `CelestialSky.tsx`, the new `CelestialDiscoveries.tsx`, and the two replacement PNGs. Typography, copy, stars, camera behavior, bulb, rope, and fallback code are unchanged. No commit or push was made.
