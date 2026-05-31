import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  SOURCE_CUP_POSITION,
  TARGET_POSITIONS,
  useGameStore,
} from "../store/useGameStore";
import type { Vector3 } from "../types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

interface CupProps {
  position: Vector3;
  fill: number;
  active?: boolean;
  highlighted?: boolean;
  ghost?: boolean;
  tiltDeg?: number;
}

function Cup({ position, fill, active, highlighted, ghost, tiltDeg = 0 }: CupProps) {
  const fillHeight = Math.max(0.01, fill * 0.62);
  const fillOffset = -0.25 + fillHeight / 2;

  return (
    <group
      position={position}
      rotation={[0, 0, THREE.MathUtils.degToRad(tiltDeg)]}
      scale={highlighted ? 1.08 : 1}
    >
      <mesh position={[0, 0, 0.16]}>
        <cylinderGeometry args={[0.32, 0.25, 0.78, 48, 1, true]} />
        <meshStandardMaterial
          color={active ? "#c7f0df" : "#f8fbff"}
          transparent
          opacity={ghost ? 0.3 : 0.62}
          roughness={0.2}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, -0.4, 0.19]}>
        <cylinderGeometry args={[0.25, 0.25, 0.035, 48]} />
        <meshStandardMaterial color="#d9e2ec" transparent opacity={ghost ? 0.25 : 0.65} />
      </mesh>
      <mesh position={[0.34, -0.02, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.17, 0.024, 12, 36]} />
        <meshStandardMaterial color="#d8e8f7" transparent opacity={ghost ? 0.25 : 0.74} />
      </mesh>
      {fill > 0 && (
        <mesh position={[0, fillOffset, 0.22]}>
          <cylinderGeometry args={[0.25, 0.22, fillHeight, 48]} />
          <meshStandardMaterial
            color="#69b7dd"
            transparent
            opacity={ghost ? 0.25 : 0.78}
            roughness={0.35}
          />
        </mesh>
      )}
      {highlighted && (
        <mesh position={[0, 0, 0.1]}>
          <torusGeometry args={[0.48, 0.018, 16, 64]} />
          <meshBasicMaterial color="#8ba88e" transparent opacity={0.72} />
        </mesh>
      )}
    </group>
  );
}

function TargetGuide({ position, active }: { position: Vector3; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) {
      return;
    }
    const pulse = active ? 1.08 : 1 + Math.sin(clock.elapsedTime * 2) * 0.025;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} position={[position[0], position[1], 0.08]}>
      <torusGeometry args={[0.67, 0.025, 16, 80]} />
      <meshBasicMaterial color={active ? "#005eb8" : "#8ba88e"} transparent opacity={0.72} />
    </mesh>
  );
}

function Cursor() {
  const cursor = useGameStore((state) => state.cursor);
  const handPresent = useGameStore((state) => state.handPresent);
  const isPinching = useGameStore((state) => state.isPinching);

  if (!handPresent) {
    return null;
  }

  return (
    <group position={[cursor[0], cursor[1], 0.85]}>
      <mesh>
        <torusGeometry args={[isPinching ? 0.18 : 0.25, 0.018, 12, 48]} />
        <meshBasicMaterial color={isPinching ? "#3d7f6f" : "#005eb8"} />
      </mesh>
      <mesh>
        <sphereGeometry args={[isPinching ? 0.045 : 0.035, 20, 20]} />
        <meshBasicMaterial color={isPinching ? "#3d7f6f" : "#005eb8"} />
      </mesh>
    </group>
  );
}

function WaterStream() {
  const phase = useGameStore((state) => state.phase);
  const target = useGameStore((state) => state.currentTarget);
  const progress = useGameStore((state) => state.pourProgress);

  if (phase !== "pouring" || progress <= 0.02) {
    return null;
  }

  return (
    <group position={[target[0] - 0.1, target[1] + 0.52, 0.52]}>
      <mesh>
        <cylinderGeometry args={[0.03, 0.045, 0.78, 16]} />
        <meshBasicMaterial color="#55add2" transparent opacity={0.78} />
      </mesh>
      <mesh position={[0, -0.45, 0]}>
        <sphereGeometry args={[0.075, 18, 18]} />
        <meshBasicMaterial color="#55add2" transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function SuccessBurst() {
  const phase = useGameStore((state) => state.phase);
  const target = useGameStore((state) => state.currentTarget);
  const groupRef = useRef<THREE.Group>(null);
  const stars = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => ({
        angle: (index / 7) * Math.PI * 2,
        radius: 0.42 + (index % 3) * 0.12,
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 5) * 0.12;
    }
  });

  if (phase !== "success") {
    return null;
  }

  return (
    <group ref={groupRef} position={[target[0], target[1] + 0.18, 0.75]}>
      {stars.map((star) => (
        <mesh
          key={`${star.angle}-${star.radius}`}
          position={[
            Math.cos(star.angle) * star.radius,
            Math.sin(star.angle) * star.radius,
            0,
          ]}
        >
          <icosahedronGeometry args={[0.075, 0]} />
          <meshStandardMaterial color="#d29922" emissive="#d29922" emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Countertop() {
  return (
    <group>
      <mesh position={[0, -1.72, -0.08]}>
        <boxGeometry args={[7.3, 0.38, 0.18]} />
        <meshStandardMaterial color="#d7d1c7" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, -0.22]}>
        <boxGeometry args={[7.6, 3.5, 0.08]} />
        <meshStandardMaterial color="#edf1f0" roughness={0.82} />
      </mesh>
      <mesh position={[-2.65, -0.45, 0]}>
        <circleGeometry args={[0.62, 64]} />
        <meshBasicMaterial color="#e7efe9" transparent opacity={0.8} />
      </mesh>
      {TARGET_POSITIONS.map((target, index) => (
        <mesh key={`${target[0]}-${target[1]}`} position={[target[0], target[1], -0.01]}>
          <circleGeometry args={[index === 0 ? 0.68 : 0.42, 64]} />
          <meshBasicMaterial
            color={index === 0 ? "#eef6fb" : "#f3f6f5"}
            transparent
            opacity={index === 0 ? 0.78 : 0.35}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function BaristaScene() {
  const phase = useGameStore((state) => state.phase);
  const cupPosition = useGameStore((state) => state.cupPosition);
  const currentTarget = useGameStore((state) => state.currentTarget);
  const hoverSource = useGameStore((state) => state.hoverSource);
  const overTarget = useGameStore((state) => state.overTarget);
  const pourProgress = useGameStore((state) => state.pourProgress);
  const isGrabbed = useGameStore((state) => state.isGrabbed);
  const rollAngle = useGameStore((state) => state.rollAngle);
  const activeThreshold = useGameStore((state) => state.activePourAngleThreshold);
  const tilt = isGrabbed ? clamp(rollAngle, -70, 70) * 0.62 : 0;

  return (
    <>
      <color attach="background" args={["#f2f4f3"]} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[3, 4, 6]} intensity={1.45} castShadow />
      <Countertop />
      <TargetGuide position={currentTarget} active={overTarget} />
      <Cup
        position={currentTarget}
        fill={phase === "success" || phase === "completed" ? 1 : pourProgress}
        highlighted={overTarget}
        ghost
      />
      <Cup
        position={phase === "targeting" ? SOURCE_CUP_POSITION : cupPosition}
        fill={phase === "success" || phase === "completed" ? 0 : 1}
        active={isGrabbed}
        highlighted={hoverSource || isGrabbed}
        tiltDeg={tilt}
      />
      <WaterStream />
      <SuccessBurst />
      <Cursor />
      {isGrabbed && Math.abs(rollAngle) >= activeThreshold && (
        <mesh position={[cupPosition[0], cupPosition[1] + 0.54, 0.55]}>
          <torusGeometry args={[0.24, 0.018, 12, 48]} />
          <meshBasicMaterial color="#d29922" transparent opacity={0.75} />
        </mesh>
      )}
    </>
  );
}
