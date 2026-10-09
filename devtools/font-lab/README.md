# Font Lab V2 — archived typography browser

Font Lab is archived and is not imported or mounted in development or production. Its implementation, preview overrides, and inert target attributes are preserved for reactivation. The Hero now loads bundled Agdasima Latin 700 independently, with tracking `0.015em`, line-height `0.87`, and responsive size multiplier `1.23` on both title lines. `WEB STUDIO` retains its custom bulb in the I slot; exported `WEBSTUDO` is not replacement copy.

## Reactivation

To temporarily reactivate, import `lazy` and `Suspense` from React in `src/App.tsx`, define `const FontLab = import.meta.env.DEV ? lazy(() => import('../devtools/font-lab/FontLab')) : null`, and mount `{FontLab && <Suspense fallback={null}><FontLab /></Suspense>}` inside the App fragment. The existing target attributes and CSS-module references still support the archived preview implementation. Remove that import, definition, and mount again when finished. Preview fonts require network access; the production Hero font does not.

The following notes describe the archived tool when reactivated.

Run `pnpm dev`. Expand **FONT LAB**, or use **✎** to pick supported text directly on the website. Drag the header to move the panel. All settings and shortlisted families live in memory; reload restores the website defaults. No fonts have been finalized.

## Targets

- RISHAV / WEB STUDIO (main title; includes its existing bulb structure)
- Welcome. / Present your… (animated display and reduced-motion counterpart)
- In a beautiful way. (independent subtitle)
- GLIMPSES OF MY WORK
- Restaurant / Clinic / Motorsport / Real Estate (existing project titles; categories are not currently rendered)
- Aesthetics that fit you. (main Aesthetics heading)
- RISHAV WEB STUDIO / WORK / APPROACH / CONTACT (optional, independent utility/navigation target)

## Browser behavior

Single-click or Up/Down auditions a candidate without closing. Double-click, Enter, or **USE THIS FONT** accepts it for this runtime session. Escape, outside pointer press, or × cancels the candidate and restores the accepted typography. Searches and category/variable/shortlist filters run in memory. Stars maintain a session shortlist. **RESET TARGET** removes that target's inline overrides. Copy target/all config buttons export human family names, actual weights, tracking, line height and size multipliers; shared targets also export their distinct text-part settings. A selectable textarea is the clipboard fallback.

All targets expose weight, tracking, line height and a 0.75–1.25 size multiplier. Original responsive CSS sizes are read again on resize; animation transforms and existing clamps are not rewritten. Intro's text ResizeObserver refreshes its existing word-width interpolation and centering. Work's existing resize measurement runs after previews.

The dev outline reads current rendered text rectangles on animation frames, with no layout participation. Pick mode captures pointer/click events before rope, carousel or link handlers. Escape exits picking; selecting text expands the panel and opens its controls.

## Fontsource integration

`fontsource.ts` fetches `https://api.fontsource.org/v1/fonts` once per page session, then caches per-family `/v1/fonts/{id}` details and `/v1/variable/{id}` axes. A failed catalog request has an explicit Retry button. No Vite proxy/backend is needed where direct CORS access works.

The full catalog drives the browser, not a fixed shortlist. The list renders only a viewport-sized window plus one row on each side. An IntersectionObserver loads samples when rows enter the list viewport. Active previews and selected weights receive queue priority. The metadata/file queue allows at most four concurrent jobs, and promises deduplicate in-flight and completed loads. Search keystrokes do not fetch metadata.

Each loaded file gets a temporary `@font-face` rule under a private `FontLab-{id}` family, so it cannot replace a local production font. A candidate is applied only after `document.fonts.load()` succeeds. Failed loads keep the previous font and display an error. Local V1 audition-only packages/imports were removed; existing production font packages remain.

Static WOFF2 URLs come from the individual-font endpoint. That endpoint exposes static variants even for variable families, so variable WOFF2 URLs use Fontsource's documented `:vf` CDN format and axis metadata. Variable `wght` sliders use the API's real min/max/step; static sliders snap to the metadata's supported weights and fetch only that real weight. Extra axes are informational. Families without a Latin subset cannot preview the English canvas text and show an explanatory error. Remote availability is required for new development previews.

Official references:
- https://fontsource.org/docs/api/fonts
- https://fontsource.org/docs/api/font-id
- https://fontsource.org/docs/api/variable
- https://fontsource.org/docs/getting-started/cdn

## Production boundary

App has no Font Lab import or mount. Neither development nor production loads its browser, preview overrides, outlines, API loader or CSS. Only inert text-target data attributes remain in the website components. The locally bundled Hero font is independent of this archive. No localStorage or sessionStorage is involved.
