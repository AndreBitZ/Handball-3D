"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Medidas oficiais IHF (Indoor Handball)
 * Campo: 40 m × 20 m
 * Baliza (interior): 3 m × 2 m
 * Área de baliza: reta de 3 m a 6 m da linha de golo + 2 quartos de círculo r = 6 m
 * Linha de livre (9 m): concentrica, a tracejado 15 cm / 15 cm
 * Linha de 7 m: 1 m de comprimento
 * Linha do GR (4 m): 15 cm de comprimento
 * Largura das linhas: 5 cm (linha de golo entre postes: 8 cm)
 * Zona de segurança: ≥ 1 m laterais, ≥ 2 m atrás das balizas
 */
const COURT_LENGTH = 40;
const COURT_WIDTH = 20;
const LINE_W = 0.05;
const GOAL_LINE_W = 0.08;
const LINE_Y = 0.012;
const HALF_L = COURT_LENGTH / 2;
const HALF_W = COURT_WIDTH / 2;
const POST_INNER = 1.5;
const GOAL_AREA_R = 6;
const FREE_THROW_R = 9;
const PENALTY_DIST = 7;
const GK_LINE_DIST = 4;

function addBox(
  group: THREE.Group,
  material: THREE.Material,
  length: number,
  width: number,
  x: number,
  z: number,
  rotY = 0
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.018, width), material);
  mesh.position.set(x, LINE_Y, z);
  mesh.rotation.y = rotY;
  group.add(mesh);
}

function addArc(
  group: THREE.Group,
  material: THREE.Material,
  cx: number,
  cz: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  dashed = false
) {
  const steps = 48;
  const span = endAngle - startAngle;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (span * i) / steps;
    const x = cx + Math.cos(a) * radius;
    const z = cz + Math.sin(a) * radius;
    if (Math.abs(x) <= HALF_L + 0.01 && Math.abs(z) <= HALF_W + 0.01) {
      points.push(new THREE.Vector3(x, LINE_Y, z));
    }
  }

  if (dashed) {
    const dash = 0.15;
    let acc = 0;
    let draw = true;
    let seg: THREE.Vector3[] = [];
    const flush = () => {
      if (seg.length < 2) {
        seg = [];
        return;
      }
      for (let i = 0; i < seg.length - 1; i++) {
        const a = seg[i];
        const b = seg[i + 1];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const len = a.distanceTo(b);
        const angle = Math.atan2(b.z - a.z, b.x - a.x);
        addBox(group, material, len, LINE_W, mid.x, mid.z, -angle);
      }
      seg = [];
    };
    for (let i = 0; i < points.length - 1; i++) {
      const d = points[i].distanceTo(points[i + 1]);
      if (draw) seg.push(points[i], points[i + 1]);
      acc += d;
      if (acc >= dash) {
        if (draw) flush();
        draw = !draw;
        acc = 0;
      }
    }
    if (draw) flush();
    return;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const angle = Math.atan2(b.z - a.z, b.x - a.x);
    addBox(group, material, len, LINE_W, mid.x, mid.z, -angle);
  }
}

function addGoalMarkings(
  group: THREE.Group,
  material: THREE.Material,
  side: 1 | -1
) {
  const goalX = side * HALF_L;
  const inward = -side;

  addBox(group, material, LINE_W, 3, goalX + inward * GOAL_AREA_R, 0);
  if (side === -1) {
    addArc(group, material, goalX, -POST_INNER, GOAL_AREA_R, -Math.PI / 2, 0);
    addArc(group, material, goalX, POST_INNER, GOAL_AREA_R, 0, Math.PI / 2);
  } else {
    addArc(group, material, goalX, -POST_INNER, GOAL_AREA_R, Math.PI, (3 * Math.PI) / 2);
    addArc(group, material, goalX, POST_INNER, GOAL_AREA_R, Math.PI / 2, Math.PI);
  }

  const nineX = goalX + inward * FREE_THROW_R;
  for (let i = 0; i < 10; i++) {
    const z = -1.5 + 0.15 + i * 0.3;
    addBox(group, material, LINE_W, 0.15, nineX, z);
  }
  if (side === -1) {
    addArc(group, material, goalX, -POST_INNER, FREE_THROW_R, -Math.PI / 2, 0, true);
    addArc(group, material, goalX, POST_INNER, FREE_THROW_R, 0, Math.PI / 2, true);
  } else {
    addArc(group, material, goalX, -POST_INNER, FREE_THROW_R, Math.PI, (3 * Math.PI) / 2, true);
    addArc(group, material, goalX, POST_INNER, FREE_THROW_R, Math.PI / 2, Math.PI, true);
  }

  addBox(group, material, LINE_W, 1, goalX + inward * PENALTY_DIST, 0);
  addBox(group, material, LINE_W, 0.15, goalX + inward * GK_LINE_DIST, 0);
}

export default function Court() {
  const lines = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#f8fafc",
      roughness: 0.7,
    });
    const group = new THREE.Group();

    addBox(group, material, COURT_LENGTH, LINE_W, 0, HALF_W);
    addBox(group, material, COURT_LENGTH, LINE_W, 0, -HALF_W);
    addBox(group, material, GOAL_LINE_W, COURT_WIDTH, -HALF_L, 0);
    addBox(group, material, GOAL_LINE_W, COURT_WIDTH, HALF_L, 0);
    addBox(group, material, LINE_W, COURT_WIDTH, 0, 0);

    addGoalMarkings(group, material, -1);
    addGoalMarkings(group, material, 1);

    return group;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[COURT_LENGTH + 6, COURT_WIDTH + 4]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[COURT_LENGTH, COURT_WIDTH]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} />
      </mesh>

      <primitive object={lines} />

      <Goal side="left" />
      <Goal side="right" />
    </group>
  );
}

function Goal({ side }: { side: "left" | "right" }) {
  const x = side === "left" ? -HALF_L : HALF_L;
  const depth = side === "left" ? -0.55 : 0.55;
  const frame = "#f8fafc";
  const post = 0.08;

  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1, -POST_INNER]} castShadow>
        <boxGeometry args={[post, 2, post]} />
        <meshStandardMaterial color={frame} metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1, POST_INNER]} castShadow>
        <boxGeometry args={[post, 2, post]} />
        <meshStandardMaterial color={frame} metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[post, post, 3]} />
        <meshStandardMaterial color={frame} metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[depth, 1, 0]}>
        <boxGeometry args={[1.0, 2, 3]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.18} wireframe />
      </mesh>
    </group>
  );
}
