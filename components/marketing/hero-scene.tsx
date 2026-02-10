"use client";

import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import type { Group, Mesh } from "three";

type OrbConfig = {
  lane: number;
  offset: number;
  speed: number;
  radius: number;
  color: string;
};

const SCENE_Y_OFFSET = -2.8;

function CenterGlow({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) {
      return;
    }

    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 0.6) * (reducedMotion ? 0.02 : 0.06);
    ref.current.scale.set(pulse, pulse, pulse);
    ref.current.rotation.y = t * 0.08;
  });

  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.1, 3]} />
        <meshStandardMaterial
          color="#72e4ee"
          emissive="#4ac8d6"
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.18}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.45, 32, 32]} />
        <meshStandardMaterial
          color="#5cdbe6"
          emissive="#5cdbe6"
          emissiveIntensity={0.1}
          transparent
          opacity={0.08}
        />
      </mesh>
    </group>
  );
}

function FlowingOrb({
  curve,
  config,
  reducedMotion,
}: {
  curve: CatmullRomCurve3;
  config: OrbConfig;
  reducedMotion: boolean;
}) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) {
      return;
    }

    const elapsed = state.clock.elapsedTime;
    const t = (elapsed * config.speed + config.offset) % 1;
    const point = curve.getPointAt(t);
    ref.current.position.copy(point);

    const pulse = 1 + Math.sin(elapsed * 1.2 + config.offset * 6) * 0.08;
    ref.current.scale.setScalar(config.radius * pulse);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 20, 20]} />
      <meshStandardMaterial
        color={config.color}
        emissive={config.color}
        emissiveIntensity={reducedMotion ? 0.2 : 0.38}
        metalness={0.5}
        roughness={0.22}
      />
    </mesh>
  );
}

function TokenComet({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) {
      return;
    }

    const cycle = reducedMotion ? 8.5 : 6;
    const phase = (state.clock.elapsedTime % cycle) / cycle;
    const x = -9 + phase * 18;
    const y = 2 + Math.sin(phase * Math.PI) * 0.35;

    ref.current.position.set(x, y, -2.6);
    ref.current.visible = phase > 0.08 && phase < 0.92;
  });

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial color="#9af6fd" emissive="#9af6fd" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[-0.42, 0, 0]} scale={[2.8, 0.5, 0.5]}>
        <sphereGeometry args={[0.12, 18, 18]} />
        <meshStandardMaterial
          color="#74dae5"
          emissive="#74dae5"
          emissiveIntensity={0.2}
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh position={[-0.9, 0, 0]} scale={[4.6, 0.36, 0.36]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#6dcfd9"
          emissive="#6dcfd9"
          emissiveIntensity={0.12}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

function HeroSceneContent({
  reducedMotion,
  mouseRef,
}: {
  reducedMotion: boolean;
  mouseRef: React.RefObject<{ x: number; y: number }>;
}) {
  const rootRef = useRef<Group>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setIsMobile(media.matches);
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  const dest: [number, number, number] = [0, SCENE_Y_OFFSET, 0];

  const lanePoints = useMemo(
    () => [
      [
        [-7, 3.5, -3.5],
        [-4, 1.8, -1.8],
        [-1.8, 0.2, -0.6],
        dest,
      ],
      [
        [7, 3, -3.5],
        [4, 1.4, -1.8],
        [1.7, 0.1, -0.5],
        dest,
      ],
      [
        [-5, -5.5, -3.5],
        [-2.8, -4.2, -1.8],
        [-1.1, -3.4, -0.6],
        dest,
      ],
    ] as [number, number, number][][],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const curves = useMemo(
    () =>
      lanePoints.map(
        (lane) =>
          new CatmullRomCurve3(
            lane.map((p) => new Vector3(p[0], p[1], p[2])),
            false,
            "catmullrom",
            0.5,
          ),
      ),
    [lanePoints],
  );

  const orbs = useMemo(() => {
    const perLane = reducedMotion ? 2 : isMobile ? 2 : 3;
    const colors = [
      "#7ce8f2",
      "#5ecdd8",
      "#94f2fa",
      "#68d9e4",
      "#80edf6",
      "#58c4cf",
      "#a0f5fc",
      "#6edce6",
      "#85eff8",
    ];

    return curves.flatMap((_, lane) =>
      Array.from({ length: perLane }, (_, index) => ({
        lane,
        offset: index / perLane + lane * 0.12,
        speed: 0.04 + lane * 0.006 + index * 0.003,
        radius: 0.18 + (index % 2) * 0.06,
        color: colors[(lane * perLane + index) % colors.length],
      })),
    );
  }, [curves, isMobile, reducedMotion]);

  useFrame((state) => {
    if (!rootRef.current) {
      return;
    }

    const t = state.clock.elapsedTime;
    const baseRotY = Math.sin(t * 0.08) * 0.08;
    const baseRotX = Math.sin(t * 0.06) * 0.02;

    rootRef.current.rotation.y = baseRotY;
    rootRef.current.rotation.x = baseRotX;

    if (mouseRef.current && !reducedMotion) {
      const targetX = mouseRef.current.x * 0.4;
      const targetY = mouseRef.current.y * 0.25;
      rootRef.current.position.x += (targetX - rootRef.current.position.x) * 0.025;
      rootRef.current.position.y += (targetY - rootRef.current.position.y) * 0.025;
    }
  });

  return (
    <group ref={rootRef}>
      <group position={[0, SCENE_Y_OFFSET, 0]}>
        <CenterGlow reducedMotion={reducedMotion} />
      </group>
      {orbs.map((config, index) => (
        <FlowingOrb
          key={`orb-${index}`}
          curve={curves[config.lane]}
          config={config}
          reducedMotion={reducedMotion}
        />
      ))}
      <TokenComet reducedMotion={reducedMotion} />
      <Sparkles
        count={reducedMotion ? 10 : isMobile ? 20 : 32}
        speed={reducedMotion ? 0.1 : 0.2}
        opacity={0.35}
        color="#8ef4fc"
        size={2.5}
        scale={[16, 12, 8]}
        position={[0, -1, 0]}
      />
    </group>
  );
}

export function HeroScene() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReducedMotion(media.matches);
    };

    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -((event.clientY / window.innerHeight) * 2 - 1),
      };
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
      <Canvas
        camera={{ fov: 48, position: [0, 0, 11] }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#020b10"]} />
        <fog attach="fog" args={["#020b10", 8, 18]} />
        <ambientLight intensity={0.22} />
        <hemisphereLight args={["#9bf0fa", "#0a222b", 0.4]} />
        <directionalLight position={[5, 4, 6]} intensity={0.9} color="#93f0fd" />
        <directionalLight position={[-4, -3, -2]} intensity={0.25} color="#4aaab8" />
        <HeroSceneContent reducedMotion={reducedMotion} mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
