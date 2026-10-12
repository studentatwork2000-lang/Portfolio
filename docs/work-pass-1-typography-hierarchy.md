# RWS Work redesign — Pass 1

Completed 11 October 2026. This pass implements typography and information hierarchy only. No commit, push, deployment or Pass 2 work occurred.

- [x] Inspection
- [x] Heading redesign
- [x] Project information
- [x] First QA
- [x] Corrections and second QA
- [x] Build and final report

| Stage | Changes and files affected | Verification | Issue and correction |
| --- | --- | --- | --- |
| Inspection | Read the supplied brief, current Work source, project data, font imports, global styles, project setup and existing QA notes. No source edits. Backed up the starting diff, both Work files and existing build output in `/tmp/rws-pass1/baseline/`. | Recorded the active branch and existing uncommitted changes. Fresh Chromium baseline captures at all three required sizes. Manrope 400/500 and IBM Plex Mono 500 are already imported; project data has four titles/categories and no URLs. | The heading's entrance measurement omitted its offset within the decorative counter grid. Identified the need to measure the heading itself. |
| Heading redesign | `src/components/WorkGlimpses/WorkGlimpses.tsx` and `WorkGlimpses.module.css`: “Glimpses of my work.” in Manrope 500, sentence case, -0.04em tracking and 1.08 line height. Removed the decorative counter and heading shadow. Added responsive heading size and balanced mobile wrapping. Included the heading's own offset in entrance measurement. | Fresh screenshots and geometry at 1350×640, 1440×900 and 390×844. Heading fits, stays horizontally centred, begins within 0.2px of the viewport's vertical centre and moves/scales into its settled position. Existing font-ready remeasurement retained. | Reserved mobile width for the existing 1.34 entrance scale. Adjusted only mobile gallery positioning to leave 24px below the two-line heading. |
| Project information | Both Work files: moved the active title beneath the carousel; matched the container to the existing panel width. Added the existing category string as the sole descriptor. Added a compact IBM Plex Mono counter at the right. Kept pagination below the row. Project title uses Manrope 500; descriptor uses Manrope 400 at 14px. | All four titles, category strings, counters, active pagination markers and live announcements update together. No overlapping text, clipping or slide-change layout movement. No URLs, links or CTA buttons added. | Visual review found captions losing contrast over the bright mobile texture; recorded for correction after first QA. |
| First QA | No source changes. Temporary browser scripts, screenshots and JSON results in `/tmp/rws-pass1/`. | Headless Chromium tested all required sizes plus short-landscape and reduced-motion flow. Checked entrance, reveal, settled gallery, exit, handoff, reverse scroll, pagination, keyboard navigation, both loop directions, arrows, mouse drag, native touch swipe and resize recentering. | Caption contrast remained the product issue. Corrected two temporary QA assumptions: compare document positions when pagination scrolls the page in flow mode; return to the gallery after resizing before checking card centring. The affected cases then passed. |
| Corrections and second QA | `WorkGlimpses.module.css`: applied a small dark text shadow to the information row, replacing the old flow-only caption shadow. No background or mask edits. | Repeated all six cases after the correction: 193 automated checks passed, with no page errors or failed checks. Reviewed fresh final screenshots, including mobile captions and the longest descriptor. Caption legibility improved without geometry or interaction regressions. | The recorded caption issue was corrected. No additional product issues found in tested cases. |
| Build and final report | Added this report. Ran `pnpm build`; saved the generated production output in `/tmp/rws-pass1/production-dist/`, then restored the complete starting `dist/` directory. | TypeScript and Vite build passed. `git diff --check` passed. Starting asset, lockfile, existing documents and all original dist file checksums match. Reviewed this pass's diff separately from pre-existing edits. | Vite retains the existing 679.95kB CelestialSky chunk-size warning. No bundle changes made in this pass. |

Measured settled typography and layout:

| Viewport | Heading | Project title | Active card, preserved | Pagination bottom |
| --- | --- | --- | --- | --- |
| 1350×640 | 50.6px | 24.3px | 601.6×320.0px | 571.0px |
| 1440×900 | 60.5px | 25.9px | 748.8×398.3px | 657.3px |
| 390×844 | 37.1px, two lines | 22.0px | 319.8×170.1px | 419.1px |

The information row reserves 64px on desktop and 56px on mobile. Its width, position and the following pagination remain stable across all four projects. Card sizes match the baseline within subpixel rounding.

| Browser case | First QA, with corrected harness where needed | Second QA after CSS correction |
| --- | --- | --- |
| 1350×640 desktop | Behaviour/layout passed; caption issue recorded separately | Passed |
| 1440×900 desktop | Behaviour/layout passed; resize harness rechecked | Passed |
| 390×844 touch mobile | Behaviour/layout passed; caption contrast needed correction | Passed |
| 844×390 touch landscape, static flow | Behaviour/layout passed; page-scroll harness rechecked | Passed |
| 1440×900 reduced motion, static flow | Passed | Passed |
| 390×844 touch reduced motion, static flow | Passed | Passed |

Representative final screenshots:

- [1350×640 gallery](/tmp/rws-pass1/second-qa-1350x640-gallery.png)
- [1440×900 gallery](/tmp/rws-pass1/second-qa-1440x900-gallery.png)
- [390×844 gallery](/tmp/rws-pass1/second-qa-390x844-gallery.png)
- [390×844 Motorsport information](/tmp/rws-pass1/second-qa-390x844-motorsport.png)
- [390×844 heading entrance](/tmp/rws-pass1/second-qa-390x844-heading.png)
- [1440×900 handoff](/tmp/rws-pass1/second-qa-1440x900-handoff.png)

Reproducible browser scripts: `/tmp/rws-pass1/capture.mjs` and `/tmp/rws-pass1/qa.mjs`. Evidence: `baseline.json`, `heading-stage.json`, `information-stage.json`, `first-qa.json`, `first-qa-recheck.json`, `second-qa.json` and `build.log` in the same directory. Interrupted baseline image decoding was corrected in the capture script and rerun before source edits; old QA documents were not treated as fresh testing.

Preservation checks confirm this pass retains carousel width/height, gaps, scaling, focus transforms, arrow and pagination styles, background asset/placement/masks/parallax, scroll timing ranges, section extent, navigation handlers and handoff definitions. The handoff typography token remains unchanged. Hero, Intro, Aesthetics and Contact source were not edited. Existing Work/background edits, `draggable={false}`, the deleted PNG, lockfile edits and both earlier documents are retained. Existing generated output is restored byte-for-byte; the new build remains available in the temporary production directory.

Testing used headless Chromium with desktop and touch emulation. Safari, Firefox and physical devices were not tested. No unresolved defects were found within the tested scope. Stopped after Pass 1.
