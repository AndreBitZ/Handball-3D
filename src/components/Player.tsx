"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PlayerProps {
  position: [number, number, number];
  color: string;
  number?: number;
  isGoalkeeper?: boolean;
}

export default function Player({ position, color, number, isGoalkeeper = false }: PlayerProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.03;
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#f5d0a9" />
      </mesh>

      {number !== undefined && (
        <mesh position={[0, 1.1, -0.3]}>
          <planeGeometry args={[0.35, 0.35]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}

      {isGoalkeeper && (
        <mesh position={[0, 0.9, 0.05]}>
          <capsuleGeometry args={[0.29, 0.92, 8, 16]} />
          <meshStandardMaterial color="#f0f0f0" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}
