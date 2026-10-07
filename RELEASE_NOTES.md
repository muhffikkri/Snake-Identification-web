# SnakeBiteAI 3.0.0

Rebuilt against `DESIGN.md`. Breaking release: the design system, the
information architecture, the navigation and the data schema all changed.

## What it is

An offline-first PWA for snakebite response. Identification, triage and the
surveillance view all run on the device, so the app keeps working when the
connection does not.

## Highlights

- **Triage produces a full result without an account.** Grade 0 to 4, the
  reasoning behind it, the handling steps, and the tourniquet ban, all on screen
  before any account prompt appears.
- **Identification reports uncertainty.** A ranked list with a confidence
  figure, the visual features the model matched, and related species the user
  can switch to. It states that the result is a suggestion, not a diagnosis.
- **A real Indonesia map.** Leaflet choropleth over seven regions with region,
  venom-status and species filters, plus per-species report counts and a sync
  queue.
- **Honest empty states.** The government view is computed from records held on
  the device. With nothing collected it reads as a true zero and says so.

## Verification

Three harnesses in `tools/` drive the built app in headless Chrome over CDP,
with no new dependency.

```bash
npm run build
npm run preview
node tools/click-through.mjs http://localhost:4174 390
node tools/contrast-audit.mjs  http://localhost:4174
node tools/offline-check.mjs   http://localhost:4174
```

Results at release: 38 click-through assertions passing at 360, 390, 768, 1024,
1280 and 1440 px with zero console errors; 264 text nodes passing WCAG AA;
triage and identification both completing with the network blocked. 42 unit and
integration tests pass.

## Notes for reviewers

Three tokens deviate from the literal hexes in `DESIGN.md`, because those values
fail the AA standard the same document requires. Each is commented in
`src/index.css`: `--color-warning-ink` (3.51:1 to 6.84:1),
`--color-control-border` (1.47:1 to 3.47:1), and `--color-text-disabled`, which
is graphic-only and never used for text.

Known limits are listed in the README: schematic map outlines, device-local
figures, deterministic identification scores, and base64 wound photographs.

Not cleared for clinical use.