# Work background visibility correction

Completed 2026-10-11. The approved image was not edited, regenerated or replaced. No commit or push was made.

## Inspection

The approved WebP is 1280×853. The image element's CSS forced a 16:9 ratio, vertically compressing the diagonal composition. Its fixed center was 78% on desktop/tablet and 68% on mobile. The carousel backdrop covered the entire card field with an additional 2rem fade on each vertical edge. These combined to hide the upper luminous structure once the carousel appeared.

The atmosphere sits at z-index 0, the exhibition at 2 and the heading at 3. The atmosphere stays fully opaque through the heading and carousel states, then fades through `--work-copy-reveal` during the handoff. The backdrop follows carousel stack visibility. These opacity and stacking relationships were retained.

## Exact CSS changes

All implementation changes are in `src/components/WorkGlimpses/WorkGlimpses.module.css`:

| Property | Before | After |
| --- | --- | --- |
| Image aspect ratio | Forced `16 / 9` | `auto`, using the approved image's intrinsic 1280:853 proportions |
| Desktop image center | Fixed 78% | `calc(78% - var(--work-content-reveal) * 30%)`: 78% heading → 48% carousel |
| Tablet image center, 701–900px | Fixed 78% | `calc(78% - var(--work-content-reveal) * 40%)`: 78% heading → 38% carousel |
| Mobile image center, ≤700px | Fixed 68% | `calc(68% - var(--work-content-reveal) * 30%)`: 68% heading → 38% carousel |
| Mobile image width | `max(calc(100% + 48px), 90svh)` | `max(calc(100% + 48px), calc(90svh + var(--work-content-reveal) * 40svh))`: height-based width grows from 90svh to 130svh during reveal |
| Carousel backdrop outer bleed/fade | 2rem | 1.5rem, with explicit half-opacity stops at .75rem on both ends |
| Static flow image center | Inherited desktop/mobile position | 64% desktop/tablet/landscape; 56% at ≤700px, relative to the existing atmosphere container |

Black #030405, image opacity (.88/.84), brightness(1.04), diffusion, existing haze, image/perimeter masks, parallax, carousel sizes, transforms, opacity, handlers and scroll timing remain unchanged. No new effects were added. WorkGlimpses.tsx is byte-for-byte unchanged from the start of this correction.

The initial .75rem fade trial produced an abrupt transition and was widened to 1.5rem before final verification. Tablet and static flow positions were also corrected after the first visual review.

## Verification and recheck

Headless Chromium screenshots were captured before correction, after correction, and again after the final CSS changes. Both heading-only and fully displayed carousel states were reviewed, plus intermediate reveal, handoff and fade states. Landscape uses the existing static flow layout; a separately scrolled capture verifies the full carousel with atmosphere above and below.

| Viewport | Mode | Corrected pass | Recheck |
| --- | --- | --- | --- |
| 1440×900 | Desktop | Passed | Passed |
| 1920×1080 | Wide desktop | Passed | Passed |
| 768×1024 | Touch tablet | Passed | Passed |
| 390×844 | Touch mobile | Passed | Passed |
| 320×568 | Small touch mobile | Passed | Passed |
| 844×390 | Touch landscape / flow | Passed | Passed |
| 1440×900 | Reduced motion / flow | Passed | Passed |
| 390×844 | Touch reduced motion / flow | Passed | Passed |

Visual review found no exposed image boundaries, hard image-mask edges, excessive glow or heading/project-label contrast problems in the final captures. The approved diagonal texture remains visible around the cards. Page overflow and page errors were absent. Carousel viewport geometry matches the pre-correction captures within subpixel rounding; the rendered image ratio matches 1280:853.

Interaction checks passed: desktop arrows, pagination, keyboard ArrowLeft/ArrowRight and Home/End, wrapping in both directions, mouse drag, native touch swipe, atmosphere fade to zero and reverse-scroll restoration to one, bounded desktop parallax, and live reduced-motion switching. Recheck screenshots also verify returning from the handoff to the heading and carousel on desktop and mobile.

Evidence and reproducible browser scripts are in `/tmp/rws-visibility/`. Baseline screenshots use `before-`, final corrected screenshots use `corrected-`, and repeated final screenshots use `recheck-`. Geometry and errors are recorded in `before.json`, `corrected.json` and `recheck.json`; interaction results are in `interactions.json`.

## Validation and limits

- `pnpm build`: passed. The existing 679.95kB CelestialSky bundle still triggers Vite's chunk-size warning.
- `git diff --check`: passed.
- Approved asset SHA-256 before and after: `f254df49f3000ac573e915f22ed74a5d61dfdaa6acc5d1d972e81abf3df20749`.
- The required build regenerated `dist/index.html`; the starting index is backed up at `/tmp/rws-visibility/pre-build-index.html`.
- Pre-existing source, asset and lockfile changes were preserved. This correction adds only the CSS adjustments above, this report and the generated build output.
- No unresolved defects were found in the verified cases. Safari, Firefox and physical devices were not tested.
