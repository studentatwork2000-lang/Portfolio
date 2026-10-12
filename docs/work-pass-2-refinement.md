# Work / Glimpses — Pass 2

Completed 11 October 2026. This pass refines only the Work presentation. Stopped after Pass 2.

- [x] Stage 1 — inspected current files and identified the section's component, CSS module and font requirements; saved the starting files, diff and checksums in `/tmp/rws-pass2/baseline/`.
- [x] Stage 2 — loaded local Outfit 700 for “Glimpses of my work.”, reduced heading sizes, and used IBM Plex Mono 400 for categories and 500 for the compact counter. Tightened project title sizes and caption spacing. Handoff font tokens retain their existing values.
- [x] Stage 3 — reduced unfocused previews from 93% to 36% scale, lowered opacity and brightness, and reduced inward overlap. Retained active card dimensions, snap geometry, carousel handlers and scroll timing. Reduced-motion mode retains the same visual hierarchy without transitions.
- [x] Stage 4 — concentrated the existing background texture with an elliptical mask and neutral grayscale treatment. Reduced opacity and haze spread, added stronger corner falloff and bottom-left shading, and removed the full-width shelf mask.
- [x] Stage 5 — reviewed fresh heading/gallery/project screenshots and ran the first interaction and layout QA: 120 checks passed across 1350×640, 1440×900 and touch-emulated 390×844. No section defects were found that required another edit.
- [x] Stage 6 — reviewed the presentation again at wide desktop, laptop and mobile widths; 328 checks passed across nine browser cases. `pnpm build` and `git diff --check` passed.

The starting presentation had a light heading, near-equal side cards, oversized supporting text and a broad bright band beneath a full-width carousel mask. The resulting presentation has a fuller, smaller heading, recessed preview cards, quieter metadata and an asymmetrical frost concentration surrounded by black.

Exact files changed or added in this pass:

- `src/components/WorkGlimpses/WorkGlimpses.module.css`
- `src/components/WorkGlimpses/WorkGlimpses.tsx` — IBM Plex Mono 400 import only.
- `src/assets/fonts/outfit-latin-700-normal.woff2`
- `src/assets/fonts/outfit-LICENSE.txt`
- `docs/work-pass-2-refinement.md`

The local Outfit 700 asset and its bundled license came from the Fontsource Outfit package, version 5.2.8. [Fontsource reference](https://fontsource.org/fonts/outfit).

| Second QA case | Passed checks |
| --- | ---: |
| 1350×640 laptop | 40 |
| 1440×900 desktop | 41 |
| 1920×1080 wide desktop | 40 |
| 768×800 tablet width | 39 |
| 320×740 touch mobile | 38 |
| 390×844 touch mobile | 39 |
| 844×390 touch landscape / static flow | 30 |
| 1440×900 reduced motion | 31 |
| 390×844 touch / reduced motion | 30 |

Checks covered actual font loading, typography hierarchy, caption alignment and stability across all four projects, preview proportions, clipping/overlaps, pagination, arrow navigation, both loop directions, keyboard navigation, mouse drag, native touch swipe, resize recentering, scroll reveal/exit, reverse scrolling and the existing handoff. No runtime errors or failed checks were recorded.

Isolated background captures contain 79–84% near-black pixels (RGB average below 16/255); only 2.9–4.5% exceed 90/255. Corner means are approximately 3/255, including bottom-left. The texture asset and parallax handlers were preserved; all new composition is CSS.

Evidence and reproducible browser scripts are in `/tmp/rws-pass2/`: `capture.mjs`, `qa.mjs`, `background-qa.mjs`, `measure-background.mjs`, `first-qa.json`, `second-qa.json`, `background-metrics.json` and `build.log`.

- [Wide desktop](/tmp/rws-pass2/second-qa-1920x1080-gallery.png)
- [Laptop](/tmp/rws-pass2/second-qa-1350x640-gallery.png)
- [Mobile](/tmp/rws-pass2/second-qa-390x844-gallery.png)
- [Longest category at 320px](/tmp/rws-pass2/second-qa-320x740-motorsport.png)
- [Background without foreground](/tmp/rws-pass2/background-only-1440x900.png)

Checksum verification confirms unrelated source, original assets, lockfiles and earlier reports match the starting state. The complete starting `dist/` contents were restored after the successful build; the new production output is available in `/tmp/rws-pass2/production-dist/`.

No unresolved section defects were found in Chromium desktop/touch emulation. Safari, Firefox and physical devices were not tested. The existing 679.95kB CelestialSky bundle-size warning remains. No commit, deployment or Pass 3 work was performed.
