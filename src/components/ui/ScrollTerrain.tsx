"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { createNoise2D } from "simplex-noise";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from "three";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

/**
 * Scene constants — WebGL scene values, outside the Tailwind design-token
 * system (see obsidian/workflows/optimize-3d-scene.md → "How it sits with
 * the hard rules"). This is a feature build, not a performance-audit pass,
 * so the segment counts below are a reasonable default rather than a
 * device-tiered budget — revisit via the `optimize-3d-scene` skill if this
 * scene ships and turns out to jank on mobile.
 */
const TERRAIN_WIDTH = 60;
const TERRAIN_DEPTH = 110;
const WIDTH_SEGMENTS = 64;
const DEPTH_SEGMENTS = 110;

const NOISE_FREQUENCY = 0.05;
const NOISE_AMPLITUDE = 3;
const NOISE_DETAIL_FREQUENCY = 0.13;
const NOISE_DETAIL_AMPLITUDE = 0.7;

const BASE_FLIGHT_SPEED = 2.6; // world units/s — continuous forward drift
const SCROLL_BOOST_PER_PIXEL = 0.02; // extra speed added per px of scroll delta
const SCROLL_BOOST_MAX = 9;
const SCROLL_BOOST_DECAY = 2.2; // per-second exponential decay back to base speed

const WIREFRAME_COLOR = "#3fd6e8";
const WIREFRAME_COLOR_BOOST = "#eafcff";
const BACKGROUND_COLOR = "#050508";
const FOG_NEAR = 16;
const FOG_FAR = 58;

const CAMERA_FOV = 55;
const CAMERA_HEIGHT = 5.2;
const CAMERA_BACK = 12;
const CAMERA_BASE_TILT_X = -0.32; // rad — fixed downward pitch, aims the rig at the terrain
const CAMERA_TILT_STRENGTH = 0.1; // rad of look-tilt at the pointer's extremes
const CAMERA_TILT_EASE = 0.05; // per-frame lerp factor toward the target tilt

interface TerrainMeshProps {
  onSpeedChange: (normalizedSpeed: number) => void;
}

/**
 * The wireframe ground. Vertex heights are re-sampled from 2D simplex noise
 * every frame — cheap enough at this segment count to run inside `useFrame`
 * directly, so the flight offset never touches React state (no re-render on
 * scroll or on every animation tick).
 */
const TerrainMesh = ({ onSpeedChange }: TerrainMeshProps) => {
  const meshRef = useRef<Mesh>(null);
  // Owned by the JSX below (`<planeGeometry ref={geometryRef} />`), not `useMemo` —
  // this is the object `useFrame` mutates every tick (vertex heights), and a ref's
  // `.current` is the sanctioned mutable cell; a `useMemo` result is treated as
  // render output the compiler assumes stays untouched after render.
  const geometryRef = useRef<PlaneGeometry>(null);
  const materialRef = useRef<MeshBasicMaterial>(null);
  const flightOffset = useRef(0);
  const scrollBoost = useRef(0);
  const prefersReducedMotion = useReducedMotionPreference();
  const noise2D = useMemo(() => createNoise2D(), []);

  const baseColor = useMemo(() => new Color(WIREFRAME_COLOR), []);
  const boostColor = useMemo(() => new Color(WIREFRAME_COLOR_BOOST), []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;
      scrollBoost.current = Math.min(
        scrollBoost.current + delta * SCROLL_BOOST_PER_PIXEL,
        SCROLL_BOOST_MAX,
      );
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useFrame((_, delta) => {
    const geometry = geometryRef.current;
    if (!geometry) return;

    scrollBoost.current = MathUtils.damp(scrollBoost.current, 0, SCROLL_BOOST_DECAY, delta);

    // Autonomous drift only — the user's own scroll is not gated behind
    // reduced-motion, same reasoning as the Lenis scroll store (see
    // obsidian/frontend/smooth-scroll.md): it is user-driven, not autoplay.
    const speed = (prefersReducedMotion ? 0 : BASE_FLIGHT_SPEED) + scrollBoost.current;
    flightOffset.current += speed * delta;

    const position = geometry.attributes.position as BufferAttribute;
    const array = position.array as Float32Array;
    for (let i = 0; i < array.length; i += 3) {
      const x = array[i];
      const localDepth = array[i + 1]; // pre-rotation Y — becomes world Z (depth)
      const sampleZ = localDepth + flightOffset.current;
      const height =
        noise2D(x * NOISE_FREQUENCY, sampleZ * NOISE_FREQUENCY) * NOISE_AMPLITUDE +
        noise2D(x * NOISE_DETAIL_FREQUENCY, sampleZ * NOISE_DETAIL_FREQUENCY) *
          NOISE_DETAIL_AMPLITUDE;
      array[i + 2] = height;
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    const normalizedSpeed = MathUtils.clamp(scrollBoost.current / SCROLL_BOOST_MAX, 0, 1);
    if (materialRef.current) {
      materialRef.current.color.lerpColors(baseColor, boostColor, normalizedSpeed);
    }
    onSpeedChange(normalizedSpeed);
  });

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position-y={-1.2}>
      <planeGeometry
        ref={geometryRef}
        args={[TERRAIN_WIDTH, TERRAIN_DEPTH, WIDTH_SEGMENTS, DEPTH_SEGMENTS]}
      />
      <meshBasicMaterial ref={materialRef} color={WIREFRAME_COLOR} wireframe />
    </mesh>
  );
};

/** Small camera-side reaction to speed — a subtle FOV widen reads as acceleration. */
const CameraRig = ({ normalizedSpeed }: { normalizedSpeed: number }) => {
  const rigRef = useRef<Group>(null);

  useFrame((state) => {
    const rig = rigRef.current;
    if (!rig) return;

    const { pointer, camera } = state;
    const targetTiltX = CAMERA_BASE_TILT_X - pointer.y * CAMERA_TILT_STRENGTH;
    rig.rotation.x = MathUtils.lerp(rig.rotation.x, targetTiltX, CAMERA_TILT_EASE);
    rig.rotation.y = MathUtils.lerp(rig.rotation.y, pointer.x * CAMERA_TILT_STRENGTH, CAMERA_TILT_EASE);

    if ("fov" in camera) {
      const targetFov = CAMERA_FOV + normalizedSpeed * 6;
      camera.fov = MathUtils.lerp(camera.fov, targetFov, 0.08);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <group ref={rigRef} position={[0, CAMERA_HEIGHT, CAMERA_BACK]}>
      <PerspectiveCamera makeDefault fov={CAMERA_FOV} near={0.1} far={FOG_FAR + 10} />
    </group>
  );
};

const Scene = () => {
  const [normalizedSpeed, setNormalizedSpeed] = useState(0);

  return (
    <>
      <color attach="background" args={[BACKGROUND_COLOR]} />
      <fog attach="fog" args={[BACKGROUND_COLOR, FOG_NEAR, FOG_FAR]} />
      <CameraRig normalizedSpeed={normalizedSpeed} />
      <TerrainMesh onSpeedChange={setNormalizedSpeed} />
    </>
  );
};

/** Static — no CSS keyframes/`animate-*` (hard rule #1); shown only while the scene suspends. */
const TerrainLoader = () => (
  <div
    className="flex h-full w-full items-center justify-center"
    role="status"
    aria-label="Chargement du terrain 3D"
  >
    <div className="h-24 w-24 rounded-md border border-foreground/15 bg-foreground/5" />
  </div>
);

export interface ScrollTerrainProps {
  /** Tailwind classes for the wrapper — controls the canvas size. Defaults to filling the parent. */
  className?: string;
}

export const ScrollTerrain = ({ className = "h-full w-full" }: ScrollTerrainProps) => {
  // Cheap correctness measure: stop the WebGL render loop on a backgrounded tab.
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  useEffect(() => {
    const handleVisibilityChange = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <Suspense fallback={<TerrainLoader />}>
        <Canvas dpr={[1, 2]} frameloop={frameloop} gl={{ antialias: true }}>
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
};
