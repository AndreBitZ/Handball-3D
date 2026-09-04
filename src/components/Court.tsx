"use client";

import { useMemo } from "react";
import * as THREE from "three";

const COURT_LENGTH = 40;
const COURT_WIDTH = 20;
const LINE_WIDTH = 0.08;

export default function Court() {
  const lines = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const group = new THREE.Group();

    const mid = new THREE.Mesh(
      new THREE.BoxGeometry(LINE_WIDTH, 0.02, COURT_WIDTH),
      material
    );
    mid.position.set(0, 0.01, 0);
    group.add(mid);

    const circleGeo = new THREE.RingGeometry(8.9, 9.1, 64);
    const circle = new THREE.Mesh(circleGeo, material);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.015;
    group.add(circle);

    const sixLeft = new THREE.Mesh(
      new THREE.BoxGeometry(LINE_WIDTH, 0.02, 12),
      material
    );
    sixLeft.position.set(-14, 0.01, 0);
    group.add(sixLeft);

    const sixRight = new THREE.Mesh(
      new THREE.BoxGeometry(LINE_WIDTH, 0.02, 12),
      material
    );
    sixRight.position.set(14, 0.01, 0);
    group.add(sixRight);

    return group;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
        <meshStandardMaterial color="#1a5c2e" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[COURT_LENGTH + 0.2, COURT_WIDTH + 0.2]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>

      <primitive object={lines} />

      <Goal side="left" />
      <Goal side="right" />
    </group>
  );
}

function Goal({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? -20 : 20;
  const color = "#e5e5e5";

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1, -1.5]} castShadow>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1, 1.5]} castShadow>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[side === "left" ? -0.3 : 0.3, 1, 0]}>
        <boxGeometry args={[0.5, 2, 3]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.25} wireframe />
      </mesh>
    </group>
  );
}
