# SnakeBiteAI

**When minutes matter, SnakeBiteAI delivers clarity.**

An offline-first progressive web app for snakebite response: AI-assisted identification, a triage assessment that runs without an account, and a geographic view for surveillance. Built for low-resource Android phones in areas where the connection is unreliable and the nearest clinic is a long drive away.

Built by the **Kenapa Mendadak Banget Sih** team for **HSIL Hackathon 2026, Bandung Hub**, with support and reference from Harvard T.H. Chan School of Public Health (Health Systems Innovation Lab), AI for Smart-X, PATH Global Health, and Universitas Diponegoro.

![SnakeBiteAI landing page](screenshots/landing_page.png)

---

## What it does

**Identification without a network.** Photograph a snake or pick one from the on-device reference set. The pipeline runs locally and returns a ranked list with a confidence figure, never a certainty. The page states plainly that this is a suggestion, not a diagnosis, and lists the visual features the model matched so a user can disagree with it.

**Triage without an account.** Four short questions about the bite produce a grade from 0 to 4, the reasoning behind it, and the handling steps to follow. Tourniquets are banned on the result screen in every case. The full result is on screen before any account prompt appears.

**One account, three ways in** is temporarily disabled. Auth (sign in / register) is off for the current release; the landing page and app navigation carry the tool entry points — Identify, Triage, Discover, and Demo Dashboard — with no account gate. An assessment saved while signed out is written to the device anonymously and picked up by the sync queue when the next owner is attached.

**Geographic discovery.** Species recorded for your region, with a species page that discloses identification, distribution, habitat, and venom detail in sections rather than as a wall of text.

**A surveillance view.** Regional distribution on a map, per-species report counts, and a sync queue, all computed from records held on the device.

---

## Quick start

Requires Node.js 18 or newer.

```bash
npm install
npm run dev          # http://localhost:5174
npm test             # 52 tests across 7 files
npm run build        # production build into dist/
npm run preview      # serve the built app
```

---

## Architecture

| Layer          | Choice                                 | Role                                                                                                                          |
| -------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| View           | React 18 + TypeScript + Tailwind CSS 4 | Components and responsive layout                                                                                              |
| Routing        | React Router 6                         | Real URLs, so a refresh on `/triage` lands on the assessment                                                                  |
| ViewModel      | Zustand                                | GPS, network status, account and role, held assessment, sync queue                                                            |
| Model (local)  | Dexie.js over IndexedDB                | Encrypted incident records on the device                                                                                      |
| Model (remote) | Neon Postgres + Neon Object Storage    | Species reference set (245 taxa, 12 496 images) and observation metadata; images served as WebP from the `snake-image` bucket |
| Services       | Web Crypto API                         | AES-256-GCM encryption at rest, PBKDF2 key derivation                                                                         |
| Offline        | Service worker                         | Shell, hashed bundle, and reference images cached on first visit                                                              |

Routing brings one deployment requirement: unknown paths must serve the shell.
`vite.config.ts` sets `appType: "spa"` so `vite preview` does the fallback, and
`default.conf` already had `try_files $uri $uri/ /index.html` for the nginx
container. A server without either will 404 on a refreshed deep link.

Clinical rules live in `src/lib/clinical.ts` and are covered by unit tests: the
grading ladder, the recheck intervals, and the tourniquet ban. The assessment
draft that crosses the register page is built in `src/lib/assessment.ts`.

### Navigation model

| Route                         | Reachability                                          |
| ----------------------------- | ----------------------------------------------------- |
| `/`                           | Always. Carries its own navigation, no shell header   |
| `/identify`, `/triage`        | Always, from the hero or app navbar                   |
| `/discover`, `/species/:slug` | Always, from the app navbar                           |
| `/activity`, `/history`       | Always (no auth gate in v4)                           |
| `/government`                 | Always — Demo Dashboard CTA on landing and app navbar |

## Auth (`/login`, `/register`, `/account`) is temporarily disabled in v4. To re-enable, restore `Account.tsx`, `AuthPage.tsx`, and add the routes back to `App.tsx`.

## Design system

Tokens are defined once in `src/index.css` and mirrored into `tailwind.config.js`. The source of truth is `DESIGN.md`.

| Role                              | Value                                         |
| --------------------------------- | --------------------------------------------- |
| Brand accent                      | `#70020F`                                     |
| Canvas                            | `#F7F8FA`                                     |
| Surface                           | `#FFFFFF`                                     |
| Text primary / secondary / muted  | `#101828` / `#475467` / `#667085`             |
| Success / warning / danger / info | `#15803D` / `#B7791F` / `#C53030` / `#2563EB` |

Three tokens deviate from the literal hexes in `DESIGN.md`, because the values given there fail the WCAG AA standard the same document requires. Each deviation is commented in the token file:

- `--color-warning-ink: #92400e` carries warning text. `#B7791F` on its own background measures 3.51:1 and fails for normal text; `#92400e` measures 6.84:1.
- `--color-control-border: #7a8699` on inputs and buttons. `#D0D5DD` measures 1.47:1 against white and fails the 3:1 non-text bar.
- `--color-text-disabled: #98a2b3` is graphic-only and never used for text. It measures 2.58:1 at every size.

Accessibility is verified rather than asserted: 44 px minimum targets, a visible 2 px focus ring on every interactive element, semantic landmarks, and status conveyed by an explicit word rather than colour alone.

---

## Deploying to Vercel

Pushes to `main` deploy to production automatically. Pull requests get a preview
deployment so a reviewer can open the change without a local build.

### One-time setup

1. Import the repository at [vercel.com/new](https://vercel.com/new). The
   framework preset is Vite; `vercel.json` already pins the build command and the
   output directory, so the defaults do not need changing.
2. Create a token: Vercel dashboard, Account Settings, Tokens, Create. Give it
   the **Deployments** write scope for the project.
3. Add three repository secrets under Settings, Secrets and variables, Actions:

   | Secret              | Where to get it                                                                       |
   | ------------------- | ------------------------------------------------------------------------------------- |
   | `VERCEL_TOKEN`      | The token from step 2                                                                 |
   | `VERCEL_ORG_ID`     | `vercel link` writes it into `.vercel/project.json`, or the project Settings, General |
   | `VERCEL_PROJECT_ID` | Same place as the org id                                                              |

4. Push to `main`. `.github/workflows/deploy.yml` runs the verify job first
   (type check, tests, build, routing check) and only deploys if it passes.

Locally, `npm run build` plus `node tools/serve-dist.mjs` serves `dist/` the way
Vercel does, so the routing can be exercised without deploying:

```bash
npm run build
node tools/serve-dist.mjs 4180
node tools/click-through.mjs http://localhost:4180 390
```

### Why the rewrite rule matters

The app uses client-side routing, so `/triage`, `/register` and `/species/0` are
not files. Vercel resolves the filesystem before applying rewrites, so a single
rule sending everything to `index.html` cannot shadow a real asset.
`node tools/vercel-rewrite-check.mjs` asserts exactly that: every file in
`dist/` is served as itself, and every app route falls through to the shell.

The same shell fallback is already in `public/sw.js`, which is why deep links
also resolve with the network blocked.

---

## Verification

Three harnesses drive the built app in headless Chrome over CDP. Start `npm run preview` first; the preview port is printed on startup.

```bash
node tools/click-through.mjs http://localhost:4173 390   # per-viewport click-through
node tools/contrast-audit.mjs  http://localhost:4173      # computed contrast across 4 screens
node tools/offline-check.mjs   http://localhost:4173      # reload with the network blocked
node tools/vercel-rewrite-check.mjs                       # routing and cache headers
```

`click-through.mjs` takes a width and a height, so it can be run at each breakpoint. Current results: 65 assertions passing at 360, 390, 768, 1024, 1280 and 1440 px with zero console errors, 222 text nodes passing AA, and the full triage and identification flows completing with the network disabled. Deep links resolve both online and offline.

---

## Known limits

- The map outlines are schematic island-group shapes, not administrative province boundaries. Real province polygons need a GeoJSON source that is not in this repository.
- Government figures describe records collected on that device. With an empty store every number is a true zero, and the interface says so. There is no live ministry feed yet.
- Identification scores are deterministic rather than model output. The reference set holds four species.
- Wound photographs are held as base64 inside the encrypted incident record, which is fine at prototype scale and would not be for a real record.

---

## Team

- **Haidar Ali Laudza** (Informatics) — project lead, AI engineering
- **Julius Tegar Aji Putra** (Informatics) — AI engineering, mobile application
- **Muhammad Fikri** (Informatics) — backend, systems integration
- **Cahya Mutiara Sandi** (Nursing) — clinical advisor, domain expert
- **Elizabet Febriani** (Nursing) — clinical advisor, domain expert

Organisations are named as part of the team's support and reference network. Listing them is not a statement of formal partnership or endorsement.

---

## License

Research prototype. Not cleared for clinical use.
