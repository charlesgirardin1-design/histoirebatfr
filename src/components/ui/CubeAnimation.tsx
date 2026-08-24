"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Environment, RoundedBox } from "@react-three/drei";
import { Component, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { Group, MathUtils } from "three";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

/**
 * Scene constants — named rather than sprinkled through the render code.
 * These are WebGL material/scene values, outside the Tailwind design-token
 * system (see obsidian/workflows/optimize-3d-scene.md → "How it sits with
 * the hard rules").
 */
const CUBE_SIZE = 2.2;
const CUBE_RADIUS = 0.09; // subtle chamfer, not a fully rounded corner
const CUBE_SMOOTHNESS = 4;
const EDGE_ANGLE_THRESHOLD = 8; // degrees — low enough to catch the chamfer's own angle

const MATERIAL_COLOR = "#2a2a32";
const EDGE_COLOR = "#87879a";
const EDGE_COLOR_HOVER = "#d8b273";

const ROTATION_SPEED_X = 0.09; // rad/s — idle drift
const ROTATION_SPEED_Y = 0.14;
const HOVER_SPEED_MULTIPLIER = 2.4;

const PARALLAX_STRENGTH = 0.45; // rad of tilt at the pointer's extremes
const PARALLAX_EASE = 0.06; // per-frame lerp factor toward the target tilt

// Direct-light levels are deliberately generous: `Environment` (the IBL
// reflection source) is a CDN fetch that can fail (blocked, offline, slow) —
// see `EnvironmentErrorBoundary` below — and a high-metalness material reads
// as near-black without an environment to reflect. These lights keep the cube
// legibly shaded and dimensional on their own; the HDRI is a bonus, not a
// dependency for the material to read as a cube at all.
const LIGHT_AMBIENT_INTENSITY = 0.55;
const LIGHT_KEY_INTENSITY = 2.4;
const LIGHT_KEY_INTENSITY_HOVER = 3.4;
const LIGHT_FILL_INTENSITY = 1.1;
const LIGHT_RIM_INTENSITY = 1.4;

interface RotatingCubeProps {
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
}

const RotatingCube = ({ hovered, onHoverChange }: RotatingCubeProps) => {
  const tiltRef = useRef<Group>(null);
  const spinRef = useRef<Group>(null);
  const prefersReducedMotion = useReducedMotionPreference();

  useFrame((state, delta) => {
    const tilt = tiltRef.current;
    const spin = spinRef.current;
    if (!tilt || !spin) return;

    const { pointer } = state; // R3F: normalised [-1, 1], no manual listener needed
    tilt.rotation.x = MathUtils.lerp(tilt.rotation.x, -pointer.y * PARALLAX_STRENGTH, PARALLAX_EASE);
    tilt.rotation.y = MathUtils.lerp(tilt.rotation.y, pointer.x * PARALLAX_STRENGTH, PARALLAX_EASE);

    if (!prefersReducedMotion) {
      const speedMultiplier = hovered ? HOVER_SPEED_MULTIPLIER : 1;
      spin.rotation.x += ROTATION_SPEED_X * speedMultiplier * delta;
      spin.rotation.y += ROTATION_SPEED_Y * speedMultiplier * delta;
    }
  });

  return (
    <group ref={tiltRef}>
      <group
        ref={spinRef}
        onPointerOver={() => onHoverChange(true)}
        onPointerOut={() => onHoverChange(false)}
      >
        <RoundedBox
          args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
          radius={CUBE_RADIUS}
          smoothness={CUBE_SMOOTHNESS}
        >
          <meshPhysicalMaterial
            color={MATERIAL_COLOR}
            metalness={0.4}
            roughness={0.35}
            clearcoat={1}
            clearcoatRoughness={0.2}
            reflectivity={0.6}
          />
          <Edges threshold={EDGE_ANGLE_THRESHOLD} color={hovered ? EDGE_COLOR_HOVER : EDGE_COLOR} />
        </RoundedBox>
      </group>
    </group>
  );
};

/**
 * The `night` HDRI is fetched from a CDN — a blocked/offline/slow request must
 * not take the whole scene (or the page's route-level error boundary) down
 * with it. `<Environment>` throws a real error on fetch failure, not a
 * suspended promise, so this needs an error boundary, not another Suspense.
 * Losing it means losing IBL reflections only — the explicit lights below
 * still fully light the cube.
 */
class EnvironmentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

const Scene = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <ambientLight intensity={LIGHT_AMBIENT_INTENSITY} />
      <directionalLight
        position={[4, 5, 3]}
        intensity={hovered ? LIGHT_KEY_INTENSITY_HOVER : LIGHT_KEY_INTENSITY}
      />
      <directionalLight position={[-3, -1, 4]} intensity={LIGHT_FILL_INTENSITY} />
      <pointLight position={[-4, -2, -3]} intensity={LIGHT_RIM_INTENSITY} color={EDGE_COLOR_HOVER} />
      <EnvironmentErrorBoundary>
        <Environment preset="night" background={false} />
      </EnvironmentErrorBoundary>
      <RotatingCube hovered={hovered} onHoverChange={setHovered} />
    </>
  );
};

/** Static — no CSS keyframes/`animate-*` (hard rule #1); shown only while the scene suspends. */
const CubeLoader = () => (
  <div className="flex h-full w-full items-center justify-center" role="status" aria-label="Chargement de la scène 3D">
    <div className="h-24 w-24 rounded-md border border-foreground/15 bg-foreground/5" />
  </div>
);

export interface CubeAnimationProps {
  /** Tailwind classes for the wrapper — controls the canvas size. Defaults to filling the parent. */
  className?: string;
}

export const CubeAnimation = ({ className = "h-full w-full" }: CubeAnimationProps) => {
  // Cheap correctness measure: stop the WebGL render loop on a backgrounded tab.
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  useEffect(() => {
    const handleVisibilityChange = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <Suspense fallback={<CubeLoader />}>
        <Canvas
          dpr={[1, 2]}
          frameloop={frameloop}
          camera={{ position: [3, 2, 5], fov: 40 }}
          gl={{ antialias: true }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
};
