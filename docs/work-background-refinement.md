# Work background refinement

Status: ready for review. All stages were executed in order; placement and atmosphere were verified before the following stage started. No commit or push was made.

| Stage | Status | Evidence |
| --- | --- | --- |
| 1 — Inspect | [x] Completed | Inspected source, asset, geometry, masks and foreground stacking; recorded issues before implementation changes. |
| 2 — Correct placement | [x] Completed | Reviewed desktop and touch-mobile entry/gallery screenshots before Stage 3. |
| 3 — Atmospheric refinement | [x] Completed | Reviewed desktop/mobile diffusion, haze, heading contrast and image perimeter before Stage 4. |
| 4 — First QA pass | [x] Completed | Eight viewport/motion cases passed after the corrections below; screenshots reviewed. |
| 5 — Second QA pass | [x] Completed | Repeated all eight cases after corrections; preference, resize, rotation and parallax checks also passed. |
| 6 — Validation and report | [x] Completed | `pnpm build` and `git diff --check` passed; final implementation diff reviewed for unrelated changes. |

## Initial inspection

Work imports the existing `src/assets/work/milky-way-atmosphere.webp`, a 1280×720 rendition of the retained PNG source. Both files remain byte-for-byte unchanged, verified with SHA-256 checksums.

The initial photograph covered the full stage with a 12px bleed, desktop scale 1.025 and portrait scale 1. Its opacity was .88 on desktop and .84 on portrait screens. Position was centered on desktop and 56% horizontally on portrait screens. Dark gradients masked the viewport perimeter, but the image had no diffusion or frost-white haze.

The decorative background is clipped, ignores pointer events and sits at z-index 0 beneath the exhibition at 2 and heading at 3. The carousel has its own isolated visual stage and focus-driven card stacking. Initial previews confirmed heavy portrait cropping, competition with the entering heading, and galactic detail showing through dimmed neighboring cards.

## Problems and exact corrections

| Discovered | Problem | Correction |
| --- | --- | --- |
| Stage 1 | Full-height portrait cover lost most of the diagonal composition. | Use width-driven intrinsic 16:9 sizing with `height: auto`. Width is `max(calc(100% + 48px), 115svh)` on desktop and `max(calc(100% + 48px), 90svh)` below 700px. On 390×844, visible source width increases from about 27% to 51%. |
| Stage 1 | Bright band competed with the heading and card field. | Lower the image center to 78% of its background container on desktop and 68% below 700px. Retain the luminous band and aspect ratio. |
| Stage 1 | Stars appeared inside translucent neighboring previews. | Add a noninteractive black backdrop behind the isolated card field; keep card opacity, geometry and focus transforms unchanged. |
| Stage 2 verification | Touch overrides canceled the new image-centering transform. | Separate static centering into `translate: -50% -50%`; preserve the existing transform overrides for parallax and motion preferences. |
| Stage 2 verification | Resizing exposed the photograph's upper perimeter. | Add image-local standard and WebKit vertical masks, fading to full opacity at 18% and out after 80%; retain viewport edge gradients and horizontal overscan. |
| Stage 1 / Stage 3 | Atmospheric treatment and local heading contrast were missing. | Apply image-only blur of .65px desktop / .4px portrait and `brightness(1.04)`. Overlay frost-white radial haze at .07 and .035 alpha, above the photo and below edge masks. Add a dark heading text shadow. |
| Stage 4 | Percentage backdrop fades left preview edges partly exposed. | Match fade stops to the backdrop's 2rem outer bleed: black from `2rem` through `calc(100% - 2rem)`. |
| Stage 4 | Backdrop persisted after the carousel faded, creating a horizontal cutoff during handoff. | Set backdrop opacity to `calc(1 - var(--work-stack-visibility))`; explicitly retain opacity 1 in flow mode, matching the existing carousel override. |
| Stage 4 | Native image dragging emitted `dragstart` and `pointercancel`, interrupting mouse carousel dragging. | Set `draggable={false}` on carousel preview images so the existing pointer handlers receive the complete gesture. No carousel handler or state logic changed. |

## QA evidence

Both passes used a real headless Chromium browser with desktop and touch-device emulation:

| Viewport | Mode | First pass | Second pass |
| --- | --- | --- | --- |
| 1440×900 | Desktop | Passed | Passed |
| 1920×1080 | Wide desktop | Passed | Passed |
| 768×1024 | Touch tablet | Passed | Passed |
| 390×844 | Touch mobile | Passed | Passed |
| 320×568 | Small touch mobile | Passed | Passed |
| 844×390 | Touch landscape / flow | Passed | Passed |
| 1440×900 | Reduced motion / flow | Passed | Passed |
| 390×844 | Touch reduced motion / flow | Passed | Passed |

Checks covered arrows where available, pagination, ArrowLeft/ArrowRight, Home/End, infinite wrapping in both directions, mouse dragging and native touch swiping. Scroll checks covered entry, reveal, gallery, handoff, background fade, foreground inert state and reverse scrolling. There were no page errors or horizontal page overflow in the completed cases.

Second-pass dynamic checks verified ±8px parallax limits, hidden image edges at pointer extremes, live reduced-motion changes, portrait/landscape resizing with the selected Motorsport project preserved, and backdrop fade/restore. Screenshots confirm visible galactic structure, a luminous core, readable headings and independent previews. No additional implementation defects were found.

Temporary browser scripts, screenshots, results and the pre-edit inspection record are in `/tmp/rws-work-qa/`. Browser setup was outside the project; no project dependencies were added. Interrupted browser batches were rerun successfully, and final capture checks awaited asynchronous preview decoding.

## Validation and limitations

- `pnpm build`: passed. Vite emitted a size warning for the unchanged 679.95kB CelestialSky bundle; bundle optimization is outside this refinement.
- `git diff --check`: passed.
- Final source diff is limited to Work background/heading presentation and the preview `draggable` attribute. Carousel navigation, snapping, focus transforms, geometry, state and scroll choreography remain unchanged. No other section was redesigned.
- Existing `package-lock.json` edits remain unchanged. The requested build regenerated `dist/index.html`; its pre-build version is backed up at `/tmp/rws-work-qa/preexisting-dist-index.html`.
- No unresolved defects were found in the tested layouts. Safari, Firefox and physical-device rendering remain unverified. Visual preview was available through Chromium screenshots.

The implementation is ready for review within this verified scope.
