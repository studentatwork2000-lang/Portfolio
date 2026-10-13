# Work star field — Pass B

Scope: add only a decorative star field to the blank, one-viewport Work section. Preserve its ID, accessible label, height and normal-flow boundary with Aesthetics. Keep archived Work content unmounted and all adjacent section implementations untouched.

## Sequential checklist

- [x] Inspect existing Hero stars and blank Work section
- [x] Implement static Work star field
- [x] Verify static appearance
- [x] Implement cursor clustering
- [x] Verify interaction and performance
- [x] Desktop/mobile QA pass 1
- [x] Corrections and QA pass 2
- [x] Build and final report

## Inspection

Hero uses a seeded sphere with 1,800 far, 550 mid, 110 near and 16 bright points, projected through a 58-degree camera. Sprite sizes are 2 / 2.8 / 3.6 / 5.2 device-scaled pixels with soft alpha edges. Its palette mixes cool/frost whites with a few warm points and a muted central patch. The visible count is a fraction of that total, so copying the population count into a flat field would be excessive.

Work currently has no children and a minimum height of 100svh (100vh fallback). Its existing #work link and normal document-flow relationship with Aesthetics must stay intact. Use a local 2D canvas, rather than copying the Hero scene or importing archived Work.

## Static verification

Compared Hero and Work at 1440×900, 1366×640 and 390×844, using screenshots plus connected bright-point counts above RGB 25 (a repeatable proxy, not an exact measure of perception). Work/Hero visible counts: 334/266 (+25.6%), 404/315 (+28.3%), 109/87 (+25.3%). At least 99.76% of Work pixels remain exactly #030405. Lower corner sectors are quieter than the upper/interior pockets. Screenshots were visually reviewed. The first attempt measured +36–39%; its population multiplier was reduced before introducing interaction.

## Interaction and performance verification

A smooth radial falloff pulls stars from their immutable resting points. Exponential, time-based easing varies slightly by a fixed depth value; brightness rises by at most 0.2 alpha and core radius by at most 28%. There is no idle drift, orbiting, twinkle or trail. Input is limited to a fine, hovering pointer, with no coarse pointer present and no reduced-motion preference.

At 1440×900, the deliberate test moved 48 nearby stars, with maximum displacement 36.54 CSS px. The count inside an 85 px inner radius rose from 12 to 17. Leaving returned to exactly identical positions and pixels; an intermediate 160 ms sample verified the return was gradual. Static, stationary-pointer, returned and offscreen states stop drawing. No canvas buffer allocations occurred during motion. The canvas scales to at most 1.5 DPR and roughly three million pixels.

Instrumented headless Chromium measured median draw time 1.2 ms, p95 1.9 ms, and median/p95 moving frame intervals 16.7/18.8 ms. These are local QA observations, not a guarantee for every device. StrictMode retained exactly 10 input/lifecycle listeners and two observers. Three additional mount/unmount cycles, each interrupted during animation, returned to the same listener/observer counts with zero pending Work frames.

QA harness corrections: live reduced-motion changes collapse the existing Intro, moving Work out of view; the test now re-enters Work before comparing its static buffer. Listener checks distinguish Work callbacks from equally named Hero callbacks. The existing missing /favicon.ico resource is excluded specifically from runtime-error assertions; no page errors or other console errors occurred.

## QA pass 1

All ten cases passed: desktop 1440×900; short laptop 1366×640; laptop 1280×720; touch phones 390×844, 360×800 and 320×568; touch tablet 768×800; touch landscape 844×390; reduced-motion desktop 1440×900; high-resolution desktop 2560×1440 at device DPR 2. Phone/tablet tests use DPR 2–3; the canvas stays capped at 1.5. The large desktop canvas stays around three million pixels.

Verified no horizontal overflow, unchanged one-viewport section height, a zero-gap normal-flow boundary with Aesthetics, existing Work link arrival, no headings/controls/text restored, exact static return, seeded resize round trips, static touch/reduced-motion output and runtime errors. A source comparison also confirms Hero, Intro, Aesthetics, archived Work, shared styles and dependencies remain unchanged.

One high-resolution capture initially recorded two extra draws, and a resize round trip intermittently captured a different point count before the final resized buffer was ready. An isolated retry passed. The harness was corrected to move the test cursor outside the viewport and wait for the canvas backing dimensions to match the current section plus a settled frame state before capturing. The full ten-case pass then succeeded. No production defect was established by those timing failures.

## QA pass 2

Repeated all ten viewport/input cases after tightening the capture synchronization; all passed. Repeated clustering, inner-radius density, gradual exact return, stationary-pointer and offscreen idle behavior, live reduced-motion switching and StrictMode/mount-unmount cleanup; all passed. A simulated hidden-tab visibility change also suspended Work drawing and restored its static field when visible again. Desktop and mobile screenshots were visually reviewed again.

The repeated interaction retained the same 48 moved stars and 36.54 px maximum displacement. Local instrumented draw times: median 1.1 ms, p95 1.9 ms, maximum 3.2 ms. Moving frame intervals: median 16.7 ms, p95 17.0 ms, maximum 23.8 ms. No Work buffer reallocations occurred during interaction; three interrupted unmounts left zero pending Work frames and no extra listeners or observers.

## Actual changes

- Added src/components/WorkStarField/WorkStarField.tsx and its local CSS module.
- Replaced only the self-closing Work placeholder in App.tsx with that component, retaining #work, the Work accessible label, the existing global one-viewport height and section order.
- Added this checklist/report plus inspection screenshots, two QA screenshot sets, repeatable browser checks and JSON measurements under qa/work-star-field.
- No dependency, shared-style, adjacent-section or archived-Work changes. No old Work content is mounted. No commits or pushes.

## Remaining limitations

QA used headless Chromium with emulated device dimensions, DPR, touch and reduced-motion settings. Physical phone browsers, Safari/WebKit and Firefox were not tested. Hidden-tab suspension was tested by simulating the document visibility flag/event rather than measuring OS background throttling. Perceived density remains subjective; connected bright-point counts and visual comparison support the chosen calibration. Device performance can vary. The pre-existing /favicon.ico 404 remains outside this pass.

## Reproducing the checks

With the local Vite app running, run `node qa/work-star-field/qa.mjs` and `node qa/work-star-field/interaction.mjs`; use `QA_PASS=2` to save a second run separately. The harness reuses the environment's cached Playwright/Chromium without adding project dependencies. Its defaults are machine-local; `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH` and `QA_URL` can select another installed test setup.

## Final validation

`pnpm build` passed (TypeScript and Vite production build). `git diff --check` passed. Vite reports a size warning for the existing Hero CelestialSky chunk (679.95 kB); this pass adds no WebGL scene and leaves Hero untouched. Tracked dist files regenerated or removed by the build were restored to their pre-pass state to keep generated artifacts out of the change set. Final changes remain confined to the Work component/integration and its QA/report artifacts. No commit or push was made.
