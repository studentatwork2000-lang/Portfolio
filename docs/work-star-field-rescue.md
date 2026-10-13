# Work star-field rescue

Base: `7340ce2d399410516c8d25f8236d6a704cc1738b`, the newest relevant branch head when inspected on 2026-10-13. All eight remote branches were checked. Work was tested in a separate local clone and rescue branch, keeping Codespace files untouched.

- [x] Inspect repository history and failed implementation
- [x] Run and review the original resting field and Saturn experiment
- [x] Replace geometry and tune delicate star rendering
- [x] Test scenarios A–E in the actual rendered website
- [x] Review first-pass screenshots and correct visibility
- [x] Run a second complete QA pass and review timed motion captures
- [x] Verify TypeScript, production build, and rendered production interaction

## Diagnosis

The failed experiment assigned every particle a permanent slot in a core or ellipse. A plateau recruited almost all stars within the inner 80% of a 320–560 px radius. Sparse subsets could not form convincing ellipses, while the crowded core, enlarged discs, and brightness increases produced a white knot surrounded by broken arcs.

The committed checkpoint already measured distance from resting positions: permanent mutation of home coordinates was not found there. However, attraction used a delayed moving center, broad full-strength recruitment, and relatively slow damping while the pointer stayed active. Those choices prolonged the appearance of stars following the cursor. The replacement fixes target calculation and release behavior directly.

## Replacement

Each star retains immutable normalized home coordinates. Every frame measures home-to-current-cursor distance, with a finite 320–480 CSS px influence radius. Attraction is strongest near the cursor and fades smoothly to zero at the boundary. It compresses the original distribution radially, preserving natural irregularities without assigning any slots, angles, circles, or orbits.

The radial mapping is monotonic and leaves at least 10% of each star's home-to-cursor spacing, avoiding a collapsed knot or a ring of particles. Slight fixed depth variation prevents uniform compression. Frame-rate-independent exponential easing gathers smoothly; decreasing influence uses faster restoration even when the cursor remains elsewhere inside Work. There are no accumulated forces, oscillating springs, or random per-frame changes.

Two cached 32×32 white/frost-white sprites replace hard discs and large halos. Tiny points fade softly, stay the same size during interaction, and receive at most 0.04 extra opacity. About 4.5% are brighter. The existing seeded pockets, voids, and quiet corners remain, with a modest population adjustment to compensate for softer rendering: 403 points at 1440×900.

Work remains blank apart from stars, with background exactly `#030405`. All adjacent sections, fonts, preserved Work content, CSS, and runtime dependencies are unchanged. Touch events and primary coarse pointers use the static field; reduced motion is also static. Existing idle/offscreen/hidden suspension and listener/observer cleanup remain.

## Verification

Two complete headless Chromium 153 passes exercised the actual React page with software WebGL enabled for the surrounding Hero. Both passed:

- A: stationary gathering, unchanged star size, bounded brightness, and untouched stars outside the influence radius.
- B: slow travel recruits a new region while old particles return to their exact home positions.
- C: ten rapid cross-section moves leave no travelling passengers. Outside-influence displacement after 250 ms was below 0.4 px in both passes.
- D: actual pointer exit restores the exact resting canvas pixels after a prompt, smooth return.
- E: three repeated visits reproduce identical cluster pixels and identical resting pixels, without drift.
- Static/stationary/offscreen/hidden processing stops; interaction reallocates no canvas buffers.
- Live reduced-motion switching restores the static field on reentry. The surrounding Intro changes layout under reduced motion, so this check navigates back to Work before comparing its pixels.
- Three StrictMode mount/animate/unmount cycles leave zero pending Work frames and no extra listeners or observers.
- Viewports: 1440×900, 1366×640, 1280×720, touch 390×844 / 320×568 / 844×390, reduced-motion 1440×900, and 2560×1440 at DPR 2. No overflow, restored content, boundary gap, or runtime errors occurred. Canvas allocation remains capped near 3 million pixels.

The sampled dense-region concentration increased from 11 to 69 stars within 70 px. Instrumented 2D drawing measured about 0.5 ms median / 0.8 ms p95 locally; these are not hardware-independent FPS guarantees.

Resting, dense-region, quiet-center, slow-travel, rapid-travel, mobile, and desktop screenshots were visually reviewed. Eleven timed rendered samples in pass 2 showed formation, a large cursor jump, old-region release, and full restoration. Initial soft sprites were too faint; size/opacity and radius were adjusted before the successful passes.

`npm run build -- --outDir /tmp/starfield-build` and `git diff --check` passed. A separate production-preview browser check confirmed visible attraction, pixel-identical restoration, and no page errors. The existing large CelestialSky chunk warning remains outside this change.

No unresolved Work issue was found in the tested scenarios. Physical devices, Firefox, and Safari were not tested; hidden-tab state was simulated.

## Repeat the checks

Use an existing Playwright installation and Chromium binary; no project dependency change is required:

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium \
QA_PASS=2 QA_MOTION=1 \
node qa/work-starfield-rescue/verify.mjs
```

The script starts Vite itself, captures screenshots and JSON measurements in a temporary output directory, and closes browser/server resources. `QA_OUTPUT` selects another output directory; `QA_URL` uses an already-running development server. The canvas instrumentation is test-only and is not part of the shipped component. The older Saturn QA scripts describe the abandoned experiment and should not be used to judge this replacement.
