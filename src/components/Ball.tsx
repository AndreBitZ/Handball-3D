"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BallProps {
  position: [number, number, number];
}

export default function Ball({ position }: BallProps) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 4;
      mesh.current.rotation.z = state.clock.elapsedTime * 2.5;
    }
  });

  return (
    <mesh ref={mesh} position={position} castShadow>
      <sphereGeometry args={[0.12, 24, 24]} />
      <meshStandardMaterial color="#f5a623" roughness={0.4} metalness={0.1} />
    </mesh>
  );
}
