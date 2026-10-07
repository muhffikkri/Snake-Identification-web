# Changelog - SnakeBiteAI

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added

- **Vercel deployment.** `vercel.json` pins the build command, the output
  directory and `npm ci`, and routes every client route to the shell. Pushes to
  `main` deploy to production, pull requests get a preview.
- **GitHub Actions workflow** that verifies before it deploys: type check, tests,
  build, and a routing check. A deploy job depends on it, so a failing test
  never reaches production.
- **`tools/serve-dist.mjs`**, which serves `dist/` with the same
  filesystem-then-shell order Vercel uses, so the deployed routing shape can be
  exercised locally without a Vercel account.
- **`tools/vercel-rewrite-check.mjs`**, which asserts that every file in `dist/`
  is served as itself, every app route falls through to the shell, and the
  service worker headers allow updates to land.
- **Client-side routing** on React Router 6. `/login`, `/register`,
  `/triage`, `/identify`, `/discover`, `/species/:id`, `/activity`, `/history`,
  `/account` and `/government` are all addressable, so a refresh or a shared
  link lands on the right screen.
- **Account pages** with a government-account control. Signing in as an agency
  account opens the surveillance view; the account page can switch between the
  two roles without signing out.
- **Held assessment across registration.** Finishing triage while signed out and
  choosing "Create an account to save" routes to the register page with the
  draft in the store, which writes it to the new account's history on submit.
- **Where-to-next panel.** Declining to save an assessment now offers the landing
  page, the snake map, and the camera.
- **Unknown-route page** with a real destination, replacing the browser's own
  error.

### Changed

- **The landing page carries its own navigation** with the section links and
  Sign in plus Register. The shell header, the account control and the menu
  button no longer appear there, so the landing page has one bar rather than two.
- **The app navigation is for a signed-in general user.** Home, Identify, Snake
  Map, Triage, Activity and History appear once signed in and are hidden again
  on sign-out.
- **Back from triage returns to activity when signed in and to the landing page
  when signed out**, matching where the assessment was started from.
- **Account is a single object** carrying a name and a role, replacing the
  separate account name and audience flags.

### Fixed

- **`npm install` failed to resolve, so the build broke on any fresh clone.**
  `@vitejs/plugin-react@4.7.0` declares a peer range ending at vite 7 while the
  project runs vite 8. Upgraded to `@vitejs/plugin-react@5.2.0`, which supports
  vite 8 with the same API, instead of forcing the conflict away with
  `--legacy-peer-deps`. Output is byte-identical.
- **Deep links 404'd after routing was introduced.** `vite.config.ts` now sets
  `appType: "spa"`, and `vercel.json` carries the equivalent rewrite for
  production; the service worker already returned the cached shell for
  navigations, so offline deep links work.
- **Switching to a government account left the user stranded** on the account
  page with no navigation, because the role change removed the app nav without
  moving them. It now routes to the view that applies.
- **A failing sync-count read could strand a registration.** The count refresh
  no longer throws, so a store error cannot abort the caller's own work.

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

[3.0.0]: https://github.com/muhffikkri/SnakeBiteAI/releases/tag/v3.0.0
[2.0.0]: https://github.com/muhffikkri/SnakeBiteAI/releases/tag/v2.0.0