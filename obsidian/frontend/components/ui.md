---
tags: [frontend, stable]
updated: 2026-08-24
---

# Catalog — UI Components

Files in `src/components/ui/` — design-system primitives, stateless, no provider
deps. Conventions: [[component-conventions]].

## `<CubeAnimation>` — `CubeAnimation.tsx`

Decorative, interactive 3D cube — a dark metallo-glass rounded cube built on
`@react-three/fiber` + `@react-three/drei` (`three`). Not part of the
[[animation-system]]: a WebGL render loop is not DOM/React motion and isn't
governed by hard rule #1 — see [[optimize-3d-scene]] → "How it sits with the
hard rules". `"use client"` leaf.

- **Motion:** idle rotation drift on X/Y, plus a pointer-parallax tilt (an outer
  `<group>` lerps toward the normalised R3F pointer; an inner `<group>` carries
  the continuous spin — kept separate so the two don't fight over the same
  rotation values).
- **Hover:** spin speed multiplies, the edge colour warms, and the key light
  intensifies — driven by one `hovered` boolean lifted to the scene root.
- **Material:** `meshPhysicalMaterial` (metalness/clearcoat) for the glass-metal
  look, `<Edges>` for crisp silhouette lines, a `night` HDRI via
  `<Environment>` (`background={false}`) for reflections without a visible
  backdrop.
- **Accessibility / perf:** respects `prefers-reduced-motion` via
  [[hooks|`useReducedMotionPreference`]] (freezes rotation, keeps the pointer
  tilt); the wrapper is `aria-hidden` (purely decorative); the render loop
  stops on a hidden tab (`document.visibilitychange` → Canvas `frameloop`);
  `dpr={[1, 2]}` clamps pixel ratio. This is a baseline, not a full
  [[optimize-3d-scene]] pass — device tiering, a bot poster, and asset
  compression are deferred to that skill if/when this scene needs it.
- **Loading:** the whole `<Canvas>` is wrapped in `<Suspense>` (the `Environment`
  HDRI is the suspending resource); the fallback is a static placeholder block —
  no CSS keyframes, per hard rule #1.
- **Constants:** cube geometry, material colours, rotation speeds, parallax
  strength and light intensities are named constants at the top of the file —
  not design tokens (those govern CSS/Tailwind, not WebGL scene values) but not
  sprinkled through the render code either.

Props: `className` (Tailwind classes for the wrapper — defaults to
`"h-full w-full"`, filling the parent per the design brief).

Not currently mounted anywhere (superseded on the home view by
`<ScrollTerrain>` below) — kept in the catalog as a working primitive.

## `<ScrollTerrain>` — `ScrollTerrain.tsx`

Infinite-flight wireframe terrain — a fogged, glowing `planeGeometry` whose
vertex heights are resampled from 2D simplex noise (`simplex-noise`) every
frame. Same non-DOM-motion footing as `<CubeAnimation>` above — see
[[optimize-3d-scene]] → "How it sits with the hard rules". `"use client"` leaf.
Mounted on the home view (`src/views/home.tsx`).

- **Motion:** a continuous "flight" offset feeds the noise sample coordinate
  each frame, so the terrain appears to scroll toward the camera indefinitely
  — no geometry is ever rebuilt, only the existing buffer's Z values.
- **Scroll reactivity:** a passive `window` scroll listener accumulates a
  decaying speed boost (`MathUtils.damp` back to zero) added on top of the
  base flight speed; the wireframe colour lerps toward a brighter cyan and the
  camera FOV widens slightly at higher boost — all read from refs, no React
  state in the per-frame path.
- **Camera:** a `<group>` rig (holding drei's `<PerspectiveCamera makeDefault>`)
  lerps its tilt toward the normalised R3F pointer on top of a fixed downward
  pitch, so the rig stays aimed at the terrain while still parallaxing.
- **Geometry mutation vs. the React Compiler:** the `PlaneGeometry` lives in
  JSX (`<planeGeometry ref={geometryRef} .../>`), not `useMemo` — a `useMemo`
  result mutated inside `useFrame` trips `eslint-plugin-react-hooks`'
  immutability rule (`Cannot modify local variables after render completes`);
  a ref's `.current` is the sanctioned mutable cell instead.
- **Accessibility / perf:** respects `prefers-reduced-motion` by freezing the
  *autonomous* flight speed only — the user's own scroll still drives the
  boost, same reasoning as the Lenis scroll store (user-driven, not autoplay);
  wrapper is `aria-hidden`; render loop stops on a hidden tab; `dpr={[1, 2]}`.
  Segment counts (`WIDTH_SEGMENTS` / `DEPTH_SEGMENTS`) are a reasonable
  default, not a device-tiered budget — this is a feature build, not an
  [[optimize-3d-scene]] pass.
- **Loading:** `<Canvas>` wrapped in `<Suspense>`; fallback is a static
  placeholder block, no CSS keyframes (hard rule #1).
- **Layout note:** `globals.css`'s `body` is `display:flex; align-items:center`
  (centers its children), so a full-bleed view needs `self-stretch` on its
  `<main>` — otherwise it shrink-wraps to the canvas's own `w-full`, which is
  circular. See `home.tsx`.

Props: `className` (Tailwind classes for the wrapper — defaults to
`"h-full w-full"`, filling the parent).

## Related

[[component-conventions]] · [[animation-system]] · [[optimize-3d-scene]] · [[hooks]]
