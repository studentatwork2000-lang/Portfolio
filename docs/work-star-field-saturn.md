# Work star field — Saturn-inspired cursor formation

Scope: refine the existing WorkStarField component. The pre-existing App integration, CSS, Hero, Intro, Aesthetics, resting population, and #030405 background are preserved. No content, images, outlines, connecting lines, dependencies, commits, or pushes were added.

- [x] Inspect current clustering logic
- [x] Implement central circular formation
- [x] Implement two irregular elliptical rings
- [x] Tune smooth pointer response and restoration
- [x] Visual QA and corrections
- [x] Second QA pass and final build verification

The old algorithm combined radial attraction with a second compression step, leaving original-spacing distortion around the center. Each star now has a permanent target in one of three layers, generated once with a separate seed. The resting random sequence is unchanged. The core is a scattered disk with a 24 CSS px maximum radius. The primary ellipse has 78/35 px semiaxes; the fainter outer ellipse has 108/49 px semiaxes. Both tilt -20 degrees. Fixed angular jitter, radial variation, and depth offsets soften the geometry. All drawing remains individual stars.

A broad 320–560 px influence radius fully recruits stars within its inner 80%, with smoothstep falloff through the outer 20%. It blends directly from resting coordinates to assigned formation slots. The center follows pointer movement with time-based damping; particles ease into and out of their destinations. Layer-specific brightness and modest radius variation keep the outer ring subordinate. Targets never shuffle, orbit, repel, or acquire per-frame randomness.

Visual correction: the first geometry check showed overly sparse outer-ring coverage. Increasing the fully recruited area from 70% to 80% made both ellipses more readable without changing their compact dimensions. Six geometry checks cover pocket, center, and lower positions at 1440×900 and 1366×640. In the final 1440×900 central formation, fully recruited stars comprise 82 core, 65 primary-ring, and 38 outer-ring points. Mean primary/outer alpha is 0.658/0.408. The two desktop resting canvases match saved pre-change PNG hashes exactly; mobile resting coordinates and rendering properties are also checked against the pre-change baseline.

Resize correction: QA reproduced a stale canvas after a rapid resize/scroll round trip. Intersection notifications could lag behind current layout. Resize now checks current section bounds, and scroll refreshes dimensions before releasing the pointer. No layout reads were added to the animation loop. Offscreen/hidden animation suspension and static idle behavior remain intact.

Motion checks exercise gradual entry, continuous pointer travel, fast travel, stationary idle, gradual exit, exact restoration, revisiting the same position, scrolling, hidden-tab simulation, live reduced-motion changes, StrictMode, and three interrupted mount/unmount cycles. Revisiting a pointer location reproduces identical star positions and pixels. No buffers are allocated during interaction; unmount leaves zero pending Work frames and restores listener/observer counts. An initial video-sampling check exceeded an absolute per-sample displacement limit. The check now records elapsed time and normalizes movement to 60 Hz, allowing for recording and screenshot sampling delays. Both subsequent checks passed; the second pass recorded a maximum 32.61 px per normalized frame during recruitment and travel.

Viewport QA covers 1440×900, 1366×640, 1280×720, touch 390×844 / 360×800 / 320×568 / 768×800 / 844×390, reduced-motion 1440×900, and 2560×1440 at DPR 2. Checks include unchanged section height/boundary/background, zero text or controls, no horizontal overflow, safe static touch/reduced-motion output, capped canvas allocation, resize restoration, existing Work navigation, and runtime errors.

Evidence and repeatable checks are in `qa/work-saturn/`. Run `node qa/work-saturn/geometry.mjs`, `node qa/work-saturn/motion.mjs`, `node qa/work-saturn/visual-motion.mjs`, and `node qa/work-saturn/viewport.mjs` with Vite running. Set `QA_PASS=2` for the second output directory. The checks reuse `qa/work-star-field/browser.mjs`; `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, and `QA_URL` can select another local setup. Saved PNG hashes depend on the browser's canvas serialization.

QA limitations: headless Chromium with emulated touch/DPR/reduced motion; physical devices, Safari, and Firefox were not tested. Hidden-tab behavior uses a simulated visibility event. Existing favicon 404 is explicitly excluded from runtime-error assertions. No unresolved formation issue was found in the tested cases. The existing Hero CelestialSky bundle-size warning remains outside this change.

Both full ten-case viewport passes passed after the resize correction. The second geometry and motion passes passed, and their screenshots were visually reviewed separately. The second instrumented interaction run measured median/p95 draw duration of 1.7/2.0 ms and moving-frame intervals of 16.7/17.7 ms. These are local Chromium measurements, not hardware-independent guarantees.

Final verification: `pnpm build` passed (TypeScript and Vite); `git diff --check` passed. The untracked Work component and new QA/report text also received whitespace checks. Build-generated dist output was restored from a pre-build filesystem copy. No adjacent-section source was edited, and no commit or push was made.
