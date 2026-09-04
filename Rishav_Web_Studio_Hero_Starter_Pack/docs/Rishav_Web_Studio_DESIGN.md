# Rishav Web Studio — Design System and Art Direction

## Status

This is the visual source of truth for the Rishav Web Studio homepage. It replaces the earlier soft neo-grotesk direction.

The site is generated and built in stages:

1. Stitch produces high-fidelity static desktop compositions and editable frontend structure.
2. Approved frames become visual references, even if their generated code is discarded.
3. Codex assembles the approved sections, replaces placeholders, builds interactions, makes the site responsive, tests it and optimises it.

Stitch is not expected to solve scroll choreography, physics, realtime 3D, accessibility logic or backend behaviour.

## 1. Creative world

The whole homepage belongs to one world:

**A moody independent web studio at night, art-directed with oversized editorial typography and restrained warm light.**

The personality comes from scale, compression, negative space, asymmetry and precise typography—not decorative effects.

The result must feel:

- bold but not loud;
- premium rather than fashionable-by-default;
- editorial rather than app-like;
- nocturnal without becoming cyberpunk;
- interactive without looking like a game;
- handmade in small details, but never cute or messy.

## 2. Typography references

The three supplied images are type references, not complete layouts to copy.

### Reference A — oversized wide black title

Take from it:

- the title’s visual mass;
- extremely tight line stacking;
- a large display face filling most of the composition;
- tiny utility text as a deliberate counter-scale;
- confident left-edge alignment.

Do not copy its ivory background or exact three-line arrangement.

### Reference B — compressed two-line statement

Take from it:

- tall, condensed capitals;
- short two-line rhythm;
- very little air inside the text block;
- strong figure/ground contrast.

### Reference C — editorial condensed portfolio

Take from it:

- ultra-condensed chapter headings;
- asymmetrical editorial placement;
- extreme contrast between display type and microcopy;
- generous empty space outside the type mass.

Do not copy the portrait, wording or monochrome palette.

## 3. Font system

### Display A — identity and hero

Use **Archivo Black** for `RISHAV` and `WEB STUDiO`.

Fallbacks, in order:

1. Archivo Black
2. Arial Black
3. Anton, optically widened only if necessary

This face must appear very heavy, broad and compact. Do not use a medium-weight sans.

### Display B — statements and chapter headings

Use **Anton** for the intro statement and major chapter headings.

Fallbacks, in order:

1. Anton
2. Barlow Condensed ExtraBold or Black
3. Roboto Condensed Black

This face must feel tall, tightly drawn and forceful, similar in anatomy to the supplied condensed references.

### Text — navigation, body and metadata

Use **Inter** for body copy, labels and navigation only.

Do not use Plus Jakarta Sans, Instrument Sans, Poppins, Montserrat, Manrope, DM Sans or Inter for hero and chapter display type. Do not use italics for emphasis in the main statements.

### Desktop type specifications

| Role | Family | Size | Line height | Tracking | Weight |
| --- | --- | ---: | ---: | ---: | ---: |
| Hero `RISHAV` | Archivo Black | 216–226px | 0.78 | -0.055em | Black |
| Hero `WEB STUDiO` | Archivo Black | 200–210px | 0.78 | -0.055em | Black |
| Intro first line | Anton | 118–132px | 0.86 | -0.025em | Regular/Black face |
| Intro keyword | Anton | 200–226px | 0.82 | -0.035em | Regular/Black face |
| Chapter heading | Anton | 104–152px | 0.86 | -0.025em | Regular/Black face |
| Project title | Anton | 42–58px | 0.9 | -0.015em | Regular/Black face |
| Body | Inter | 16–18px | 1.5 | 0 | 400 |
| Utility label | Inter | 11–12px | 1.15 | 0.10–0.14em | 600 |

The two hero lines use the same weight and colour. `WEB STUDiO` is only approximately 6–8% smaller; it must not become a thin grey subtitle.

## 4. Colour and lighting

| Token | Value | Role |
| --- | --- | --- |
| `night-00` | `#030609` | Deepest edge and contact background |
| `night-10` | `#060B12` | Primary background |
| `night-20` | `#0A111B` | Slightly lifted dark plane |
| `ink-warm` | `#F1EDE4` | Main display type |
| `ink-muted` | `#9FA7B1` | Body and metadata |
| `rule-cool` | `#263241` | Thin rules and architectural lines |
| `light-warm` | `#DFAE63` | Warm falloff |
| `light-core` | `#FFD790` | Tiny bulb core only |
| `fill-cool` | `#14233A` | Cool ambient shadow |
| `plant-green` | `#5E705E` | Leaves and stems |
| `plant-oxide` | `#8B5B4E` | Muted geometric fruit |
| `plant-ochre` | `#A08758` | Muted geometric fruit |

Rules:

- Do not use pure white as the main type colour.
- Do not use neon blue, purple, magenta, bright cyan or saturated orange.
- Use warm light locally, never as a full-page orange gradient.
- Use a cool blue-black ambient fill from the opposite direction.
- Limit bloom; no lens flare or theatrical light beams.
- Add static grain at about 1.5–2% visual opacity.

## 5. Grid, spacing and geometry

- Desktop frame width: 1440px.
- Outer margin: 56–64px.
- Twelve-column grid with 24px gutters.
- Utility/navigation baseline: approximately 36–46px from the top.
- Major section content begins 80–120px from the top unless a frame specification overrides it.
- Use decisive scale changes rather than many middling sizes.
- Use 1px rules and mostly square geometry.
- Radius is 0–4px by default and 8px maximum.
- No glass containers, floating cards, round feature tiles or pill-shaped controls.
- Do not place a tall navigation bar above the hero.

## 6. Decorative language

- No full square grid across the hero.
- At most four to six very faint vertical construction lines and one baseline may appear.
- Use only two sparse studio-drawing clusters in the hero: for example a cropped desk/monitor fragment and a shelf/frame fragment.
- Drawings use one 0.75–1px stroke language and remain partly hidden.
- No central abstract circle-and-rectangle diagram.
- No particles, stars, floating chrome, liquid blobs, oversized gradient orbs or meaningless 3D shapes.

## 7. Desktop composition frames

Stitch should generate five frames together so the system can be evaluated across the whole homepage. They are consecutive scroll chapters, not five unrelated pages.

### Frame 01 — Hero, illuminated reference state

Canvas: 1440 × 1000px.

Display:

```text
RISHAV
WEB STUDiO
```

- Place the title at approximately x=56–64px and y=185–215px.
- The full title block should occupy roughly 84–90% of the usable width and 35–42% of frame height.
- Keep leading extremely tight, similar to Reference A.
- Both lines use the same warm off-white and the same black weight.
- Keep the lowercase `i` in `STUDiO`.
- Replace only its dot with a 12–15px refined bulb.
- A 1px cord begins below and slightly to the right of the bulb, hanging 86–106px downward; it must not run upward into the page header.
- Show the intended softly illuminated state as a static reference. Codex will create the off state and interaction.
- Warm light reveals only nearby type edges and faint studio fragments.

Navigation is transparent and visually small:

- left label: `RISHAV WEB STUDIO`, 11–12px uppercase Inter;
- right links: `WORK`, `APPROACH`, `CONTACT`, 11–12px uppercase Inter;
- no large logo text, navigation surface, blur panel or divider bar.

Bottom utility copy:

- left: `INDEPENDENT WEB DESIGN & DEVELOPMENT — INDIA / WORLDWIDE`;
- right: `SCROLL TO EXPLORE ↓`.

### Frame 02 — Intro and transition cue

Canvas: 1440 × 1000px.

Show only:

```text
PRESENT YOUR
BUSINESS
```

- Use Anton, not the hero family.
- Place `PRESENT YOUR` near x=64px at 118–132px.
- Place `BUSINESS` as the dominant second line at 200–226px.
- Keep both lines warm off-white; do not make `BUSINESS` orange, italic, outlined or enclosed.
- Use an offset editorial alignment, not a centred marketing headline.
- Leave a clean invisible mask zone around `BUSINESS` for later word replacement.
- Do not show `Welcome`, `work`, `brand`, `self` or the final resolved sentence.
- A fine rule leaves the text block and extends toward the lower-right.
- At the bottom edge, allow only a restrained preview of the next chapter label `GLIMPSES OF MY WORK` so the transition feels connected.

### Frame 03 — Glimpses of My Work

Canvas: 1440 × 1240px.

The only chapter heading is:

`GLIMPSES OF MY WORK`

- Use Anton at approximately 100–118px with compressed editorial line rhythm.
- The rule from Frame 02 becomes the top rule of the project system.
- Directly below, create one fixed-width stacked accordion composition with four horizontal project rows.
- Default open row: `01 RESTAURANT`.
- Closed rows: `02 CLINIC`, `03 MOTORSPORT`, `04 SALON`.
- Open-row height: approximately 610–670px.
- Closed-row height: approximately 84–96px each.
- Use 1px separators, no individual rounded cards and no floating shadows.
- Inside the open row, reserve about 68–72% for a dominant desktop website view, then use the remaining area for one mobile view and one feature crop.
- Create credible, replaceable web-design placeholder compositions rather than empty grey boxes.
- Do not use stock device photography, fake client logos, fake awards, fake statistics or testimonials.
- Keep the project imagery brighter than its dark containing interface so the work dominates.
- Show one static state only. Codex will implement hover, focus and tap behaviour.

### Frame 04 — Aesthetics That Fit You

Canvas: 1440 × 1000px.

Heading:

```text
AESTHETICS
THAT FIT YOU.
```

- Use Anton at approximately 126–148px with tight leading.
- The heading settles across the upper portion of the frame.
- Below it, left content occupies roughly columns 1–5; the plant occupies columns 7–12.

Left content:

`WHAT I PROVIDE`

`Distinct visual direction, clear structure and considered interaction—shaped around the personality and purpose of each project.`

Labels:

- `01 — TAILORED DIRECTION`
- `02 — CLEAR STRUCTURE`
- `03 — POLISHED INTERACTION`

Right placeholder:

- Create a refined 2D or 2.5D sculptural plant, not realtime 3D.
- Use a matte stoneware pot, asymmetrical green stems and leaves, a glazed sphere, a slate cube/prism and a small tetrahedron.
- Use muted colours, selective dark contours, warm key light and cool shadow.
- It should resemble a gallery maquette or art-directed still life, not a game asset or children’s illustration.
- Do not add a conventional five-point star, smile, face, glossy plastic or endless rotation cue.

### Frame 05 — Contact spotlight

Canvas: 1440 × 1000px.

Show:

```text
HAVE A PROJECT IN MIND?
LET’S MAKE IT REAL.
```

- Set the first line as a smaller condensed lead-in and `LET’S MAKE IT REAL.` as the dominant statement.
- Use Anton with tight line spacing and an asymmetric layout.
- Use the deepest background and one controlled elliptical warm spotlight with restrained cool edge fill.
- The light must feel like the hero bulb’s illumination returning in a focused final form.

Supporting copy:

`Tell me what you’re building, what it needs to do and when you want it live.`

Email treatment:

- `rishavstudio.web@gmail.com` is a central designed object, not tiny footer text.
- Set it at approximately 34–46px in Inter Medium, aligned to a long 1px rule.
- Add a restrained `EMAIL RISHAV ↗` label and optional `COPY ADDRESS` utility action.
- Include only minimal footer metadata.

Do not use a literal door, furnished room, cartoon placard or repeated pull cord.

## 8. Continuity between frames

- Backgrounds move subtly from `night-10` to `night-20` and finally `night-00`; never switch themes.
- Use the same outer margin, rules, type families and text colours throughout.
- The intro rule becomes the work-system rule.
- The warm/cool lighting relationship remains consistent.
- The plant’s warm key light visually narrows into the contact spotlight.
- Do not repeat the hero navigation shell inside every frame.

## 9. Deferred implementation

Codex will later build:

- the draggable/clickable pull cord and physically restrained bulb swing;
- the initial dark state and illuminated hero state;
- the sticky intro sequence and `business → work → brand → self` word track;
- the final sentence resolution;
- the accessible project accordion;
- real project screenshots and case-study links;
- the scroll-grown lightweight 3D/2.5D plant;
- transitions, responsive behaviour, reduced-motion behaviour and performance optimisation;
- email-copy feedback and any backend functionality.

Do not fake these interactions in the static Stitch pass.

## 10. Rejection criteria

Reject a generated direction if any of these appear:

- Plus Jakarta Sans, Instrument Sans or another friendly medium-weight sans for display text;
- a hero title that looks like a normal website heading rather than the primary visual object;
- a 40px+ brand name in the navigation;
- grey or thin `WEB STUDiO` typography;
- loose hero leading;
- centred generic marketing copy;
- italic or orange `BUSINESS`;
- a full graph-paper grid;
- a central abstract diagram;
- rounded floating cards;
- a generic footer inserted before all requested frames are produced;
- glassmorphism, neon, particles, chrome blobs or cartoon 3D;
- skipped requested chapters.

## 11. Mobile direction for the later pass

Do not generate mobile in this Stitch round. The later mobile pass will preserve the same type anatomy while adapting layout:

- 20–24px outer margins;
- hero type uses fluid sizing and may break into three lines only if necessary;
- bulb interaction becomes tap-first with a generous invisible target;
- intro uses a shorter sticky distance;
- project accordion becomes vertical tap-to-expand rows;
- plant and copy stack without forced horizontal movement;
- email wraps intentionally or uses a copy action without shrinking into illegibility.

