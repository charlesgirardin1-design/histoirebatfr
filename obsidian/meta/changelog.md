---
tags: [meta, changelog]
updated: 2026-08-18
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## Baseline — built from `next16-claude-starter` v0.1.0

What the starter ships, so the first project entry has something to diff against:

| Area | What is there |
|------|---------------|
| Framework | Next.js 16 App Router · React 19 · TypeScript · Yarn · Node ≥ 20.19 |
| Styling | Tailwind v4, CSS-only config, three-tier design tokens ([[design-system]]) |
| Motion | Vendored spring engine + `spring-text-engine`, shared rAF ticker, reduced-motion ([[animation-system]]) |
| Layout | Adaptive scaling grid — root font-size tracks the viewport ([[design-system]]) |
| Scroll | Lenis smooth scroll + Zustand scroll store ([[smooth-scroll]]) |
| Server | `app/api` route handlers, zod-validated env, `{ data }`/`{ error }` envelope ([[api-architecture]]) |
| SEO | Metadata generator, `robots.ts`, `sitemap.ts`, JSON-LD ([[seo-metadata]]) |
| Agent harness | 8 commands, 7 path-scoped rules, 11 skills, 4 subagents, `verify.sh` ([[agent-harness]]) |
| Not included | CMS, database, auth, payments, i18n, tests — added per project ([[backend/README]]) |

The home view (`src/views/home.tsx`, route `/`) ships empty on purpose — start
there ([[new-page]]).

<!-- Log this project's changes below, newest first, under a `## YYYY-MM-DD` heading. -->

## 2026-08-24 (2)

- **Added `<ScrollTerrain>`** (`src/components/ui/ScrollTerrain.tsx`) — an
  infinite-flight wireframe terrain: fogged, glowing `planeGeometry` whose
  heights are resampled from simplex noise every frame, a continuously
  accumulating flight offset for the "scrolling toward camera" illusion, a
  scroll-driven speed boost (decays back to base), and camera pointer-tilt.
  Replaces `<CubeAnimation>` on the home view (`src/views/home.tsx`); the cube
  stays in the catalog, just unmounted. See [[components/ui]].
- **New dependency:** `simplex-noise`. See [[tech-stack]].
- **Layout fix:** `home.tsx`'s `<main>` now carries `self-stretch` —
  `globals.css`'s `body` centers its flex children, so a full-bleed view
  needs it explicitly or it shrink-wraps to its own `w-full` child. Same fix
  will apply to any future full-viewport view.
- **Pattern note:** a `PlaneGeometry` mutated every frame inside `useFrame`
  must be held via `useRef` (through JSX, e.g. `<planeGeometry ref={...}/>`),
  not `useMemo` — `eslint-plugin-react-hooks`' immutability rule rejects
  mutating a `useMemo` result post-render (`Cannot modify local variables
  after render completes`). Refs are the sanctioned mutable cell for this.

## 2026-08-24

- **Added `<CubeAnimation>`** (`src/components/ui/CubeAnimation.tsx`) — an
  interactive dark metallo-glass 3D cube: idle rotation drift, pointer-parallax
  tilt, and a hover state that speeds up the spin and warms the edge/key-light
  colour. Mounted on the home view (`src/views/home.tsx`) as the starting
  content, filling the viewport. See [[components/ui]].
- **New dependency:** `three`, `@react-three/fiber`, `@react-three/drei`
  (+ `@types/three` dev). First 3D/WebGL scene in this project — see
  [[tech-stack]] → "3D (added per project)".
- **New hook:** `useReducedMotionPreference` (`src/hooks/`) — a
  `prefers-reduced-motion` boolean for render loops react-spring's
  `<ReducedMotion>` doesn't reach. See [[hooks]].
- **New catalog note:** [[components/ui]] — `src/components/ui/` didn't exist
  yet; created on this, its first primitive, and linked from [[README]].
- **Authorised engine fix (ADR-0023):** `@react-three/fiber`'s global
  `JSX.IntrinsicElements` augmentation broke `yarn build`'s type-check in five
  `#do-not-modify` spring files (`animated-var-text-tag.tsx`, `hover.tsx`,
  `progress-trigger.tsx`, `spring-trigger.tsx`, `spring.tsx`) — a polymorphic
  `<Tag {...props}>` JSX pattern collapsed to `children: never`. Fixed, with
  explicit user sign-off, by swapping that JSX for `createElement(Tag, {...})`
  in all six call sites — mechanical, no behaviour change. `yarn build` is
  green again.
