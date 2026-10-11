# Changelog - SnakeBiteAI

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

---

## [4.0.0] - 2026-10-11

Auth system temporarily disabled. Routing restructured, S3-based image pipeline,
and Neon Postgres integration landed.

### Added

- **Neon Postgres + S3 Object Storage integration.** Species and observation
  metadata loaded from Neon via `src/lib/neon.ts` (browser SQL); 12,640 reference
  WebP images served from Neon Object Storage (`snake-image` bucket,
  `public_read`).
- **`scripts/seed_from_csv.mjs`** — idempotent CSV-to-DB + S3 reseed pipeline
  (flags: `--no-wipe`, `--no-s3`, `--s3-only`, `--wipe`). Incremental S3 upload
  skips already-present keys, so partial quota runs can resume.
- **In-memory page cache in `neon.ts`** (`pageCache` Map). `/discover` no longer
  re-hits the DB on page reload within the same session; `invalidate()` clears
  the cache when new data is committed.
- **3D hero carousel on landing page** — three reference-species WebP images
  rotate in perspective (rotateY + translateZ), auto-advancing every 3 s.
- **Organization logos** on landing page: Universitas Diponegoro, Harvard,
  Health Systems Innovation Lab, AI for Smart-X, PATH.
- **S3 client helper** (`src/lib/s3-client.ts`) — Node-only, env-driven
  S3Client with `forcePathStyle`, shared by seed and upload scripts.
- **Demo Dashboard CTA** on landing page navbar and footer, linking to
  `/government`.

### Changed

- **Auth disabled (temporarily).** `/login`, `/register`, `/account` routes
  removed; navbar shows Activity | Identify | Discover | Demo Dashboard only.
  Triage "Save to this device" writes anonymously to IndexedDB with `null`
  owner. To re-enable: restore `Account.tsx` and `AuthPage.tsx` and add the
  routes back.
- **Landing page navbar** no longer lists landing-section anchors; replaced
  with tool entry points (Identify, Triage) and the Demo Dashboard CTA.
- **All non-landing page containers unified** to `max-w-5xl px-4 py-6
  sm:px-6 sm:py-8` (was `max-w-3xl` / `max-w-4xl` per component).
- **`/identify` and `/triage` back buttons removed** — the app navbar now
  provides navigation on every page.
- **`/government` copy** updated: states this is a demo of all assessment
  records created to date, for clinical staff responsible for snakebite cases;
  explains offline-first record storage and sync via the "Data and Reports"
  tab.
- **`/discover` region dropdown** — `.field:focus` no longer changes
  `border-radius` or adds inset box-shadow, so the open state keeps the same
  rounded corners as the closed state.
- **`public/dataset/` folder removed** — dummy JPG data no longer used; all
  image references point at S3 URLs. `db.ts` `imageSrc()` passes absolute S3
  URLs through unchanged.
- **`Identify.tsx` `speciesForPath()`** parses both S3 URLs
  (`/reference/…`) and legacy local paths (`/dataset/…`).
- **`useNeonSpecies.ts`** switched to cached fetch for all page loads (not just
  page 1).

### Removed

- `public/dataset/` — 7 dummy JPG files.
- `/login`, `/register`, `/account` routes and their components' active use.
- Triage "Create an account to save" register flow (register page no longer
  exists while auth is disabled).
- Back buttons on Identify and Triage.

### Fixed

- **S3 key casing mismatch.** `snake_images.storage_path` in DB stored CSV
  mixed-case folder names (e.g. `Acanthophis_Laevis`) while S3 keys used
  filesystem casing (`Acanthophis_laevis`). All 12,496 rows updated to match;
  245/245 species folders verified against S3.
- **Home.test.tsx** mock now targets `../lib/neon` instead of the removed
  Dexie layer.
- **`s3-client.ts`** `process` reference fixed for browser `tsc` build.
- **Discover.test.tsx** `image_path` values updated from `/dataset/…` to
  S3-style relative paths.

### Known limits

- Auth is disabled, not deleted — re-enabling requires restoring routes and the
  account components.
- In-memory page cache is cleared on hard reload; a cross-session cache
  (IndexedDB) would require a migration.
- Neon Object Storage quota is the hard cap for S3 uploads; `seed_from_csv.mjs`
  `--wipe` is opt-in to avoid accidental data loss.

---

## [4.1.0] - 2026-10-11

### Added

- **Vercel Analytics** — `@vercel/analytics/react` component mounted inside the
  router; pageviews are tracked automatically on every route change. No
  per-component instrumentation needed.
- **Landing page navbar burger menu** — mobile and tablet-portrait viewports
  (< md) show a burger button that opens a dropdown with Identify a Snake,
  Explore Snake Map, Start Triage Assessment, and Demo Dashboard. At md+ the
  same four links render inline; no burger.
- **App shell single-bar layout** — all non-landing pages now use one header
  bar: logo pinned left, nav links centred (`absolute left-1/2`), online badge
  pinned right. The separate second nav row was removed.

### Changed

- **Non-landing page navigation per breakpoint.** Mobile (< sm): header
  carries only the logo and the online badge; navigation is the fixed bottom
  tab bar (Activity, Identify, Discover, Dashboard — short labels so
  "Dashboard" never wraps to two lines). Tablet and desktop (sm+): bottom
  bar hidden, nav links visible in the top bar. No burger button on any
  non-landing page.
- **Landing page mobile navbar** — the Demo Dashboard CTA button is no longer
  visible in the mobile bar; it moved into the burger dropdown so the mobile
  bar is a clean logo + burger pair.
- **"Discover" copywriting** — renamed to "Explore Snake Map" in both the
  landing navbar and the footer for a more descriptive label.
- **Collaborator logos enlarged** — 56 px to 80 px (h-20 w-20) on the
  landing page, with name and note stacked vertically below each logo.
- **Hero carousel** — replaced the 3D rotateY fan with a slide-in-from-right
  / slide-out-to-left transition; duration changed from 3 s to 5 s; card
  now fills the full md column span (no uneven left/right margins) with
  16 px species-name and note text.
- **Horizontal overflow on landing page** — root div now carries
  `overflow-x-hidden` so the carousel's off-screen card state cannot produce
  a horizontal scrollbar.

### Removed

- **Burger button from app shell** — the previous commit's mobile/tablet
  burger on non-landing pages was removed; mobile uses the bottom tab bar
  and tablet/desktop use the centred top nav links.
- **`useState` and `Menu`/`X` imports** from `App.tsx` after the burger was
  removed from the shell.

---

## [3.0.0] - 2026-10-07

Rebuilt against `DESIGN.md`. This is a breaking release: the design system, the
information architecture, the navigation, and the data schema all changed.

### Added

- **Design token layer.** Every colour, radius, shadow and transition is defined
  once in `src/index.css` and mirrored into `tailwind.config.js`, replacing the
  previous scattered hex values.
- **Location-based species discovery.** `src/components/Discover.tsx` resolves
  the current coordinate to a region, with a manual region picker when the
  satellite fix is denied or unavailable.
- **Species pages with progressive disclosure.** Identification, distribution,
  habitat, venom and physical characteristics open as sections rather than
  rendering as a wall of text.
- **Patient-facing surfaces.** `Dashboard`, `History` and `Account`, all scoped
  to the signed-in account so one person never sees another person's records.
- **Government surface split into four views.** Overview, distribution map,
  species analytics, and a data-and-reports queue.
- **Indonesia distribution map.** Leaflet choropleth over seven schematic
  island-group regions, with region, venom-status and species filters. The
  interface states that the outlines are not administrative boundaries.
- **Three verification harnesses** in `tools/`, driving the built app in headless
  Chrome over CDP: `click-through.mjs`, `contrast-audit.mjs` and
  `offline-check.mjs`. No new dependency; they use Node's built-in WebSocket.
- **Service worker that precaches the reference photographs.** Previously the
  shell cached but the hashed bundle and images did not, so nothing worked
  offline. Fixed.

### Changed

- **Triage no longer requires an account to produce a result.** The full
  assessment is on screen before any account prompt, and the prompt never
  obstructs the result.
- **Identification reports uncertainty in words.** The capture screen states the
  result is a suggestion rather than a diagnosis, the confidence is a percentage
  with related species listed, and the page names the visual features matched so
  a user can override the choice.
- **Severity grading extracted** into `src/lib/clinical.ts` with tests covering
  the grading ladder, the recheck intervals, and the requirement that the
  tourniquet ban appears on every grade.
- **Region lookup uses ray casting** rather than a centre-distance heuristic.
- **Incident records carry an owner.** Anonymous assessments are written with a
  null owner, so they reach the agency view but never appear in a user's
  history.

### Removed

- **The four fabricated clinical records** that were seeded into IndexedDB on
  first load for demonstration. Every figure in the government view is now
  computed from real records, and an empty store reads as a true zero.
- **The infinite pulsing glow on the emergency control.** `DESIGN.md` 46 and the
  calm-under-pressure requirement both rule out continuous animation, and the
  emergency button now uses a static danger treatment.
- **The dual-brand chrome.** The dark `#1E1E1E` header and the teal palette from
  the previous `agents.md` specification, replaced by the `DESIGN.md` neutrals
  with crimson as the single accent.
- **`Inference.tsx` and `SkeletonLoader.tsx`**, superseded by `Identify.tsx` and
  the shared primitives in `src/components/ui/Primitives.tsx`.
- **The dead `/logo.svg` reference** in `index.html` and the service worker. The
  file did not exist; both now point at `Logo_1.webp`.

### Fixed

- Three tokens from `DESIGN.md` fail the WCAG AA standard the same document
  requires. `--color-warning-ink`, `--color-control-border` and
  `--color-text-disabled` now carry corrected values, each documented inline.
- Touch targets in the header were 40 px wide on mobile. Now 44 px minimum, with
  accessible names on the icon-only controls.
- The identification pipeline read the reference set from render state, so the
  result depended on which effect resolved first. It now reads from the
  database inside the pipeline.

### Known limits

- Map outlines are schematic, not administrative province boundaries.
- Government figures describe records collected on that device, not the country.
- Identification scores are deterministic; the reference set holds four species.
- Wound photographs are base64 inside the encrypted record.

---

## [2.0.0] - 2026-06-23

Initial setup and core flow: Vite, TypeScript, React 18, Tailwind CSS; Dexie.js
local schema for species and incidents; AES-256-GCM client-side encryption;
Zustand state; four integrated pages (home, inference, triage, dashboard with a
Leaflet map and a simulated delayed sync).

[4.1.0]: https://github.com/muhffikkri/Snake-Identification-web/releases/tag/v4.1.0
[4.0.0]: https://github.com/muhffikkri/Snake-Identification-web/releases/tag/v4.0.0
[3.0.0]: https://github.com/muhffikkri/SnakeBiteAI/releases/tag/v3.0.0
[2.0.0]: https://github.com/muhffikkri/SnakeBiteAI/releases/tag/v2.0.0