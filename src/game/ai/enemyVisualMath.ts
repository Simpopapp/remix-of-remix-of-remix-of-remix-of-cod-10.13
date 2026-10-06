import * as THREE from "three";

/**
 * Matemática pura do visual do inimigo (Fase V4) — testável sem browser.
 * Browser-only (mixer, bones, clones) fica em EnemyVisual.ts.
 */

export function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) return x < a ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Pesos idle/walk/run por velocidade de solo (m/s) — transições suaves:
 * idle até ~0,5 m/s, walk pleno em 1–2,2 m/s, run domina acima de ~3 m/s.
 */
export function gaitWeights(speed: number): { idle: number; walk: number; run: number } {
  const run = smoothstep(2.2, 3.6, speed);
  const walk = (1 - run) * smoothstep(0.25, 1.0, speed);
  const idle = Math.max(0, 1 - run - walk);
  return { idle, walk, run };
}

/** Limita o pitch de mira do tronco (±35°) — evita espaguete do rig. */
export function clampAimPitch(pitch: number): number {
  return Math.min(0.6, Math.max(-0.6, pitch));
}

export const DEATH_FALL_ANGLE = -Math.PI / 2; // queda de costas sobre o eixo X do rig

/**
 * Amostras do quat de morte (queda de costas com easeOutCubic) sobre a base
 * do rig: q(t) = slerp(base, fall * base, ease(t)). Consumido pelo clip
 * procedural de morte (PRD D-05 — sem ragdoll).
 */
export function deathQuatSamples(
  base: THREE.Quaternion,
  count: number,
  duration = 0.8,
): { times: number[]; quats: number[]; duration: number } {
  const fall = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    DEATH_FALL_ANGLE,
  );
  const target = new THREE.Quaternion().multiplyQuaternions(fall, base);
  const n = Math.max(2, count);
  const times: number[] = [];
  const quats: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const eased = 1 - Math.pow(1 - t, 3);
    const q = new THREE.Quaternion().slerpQuaternions(base, target, eased);
    times.push(t * duration);
    quats.push(q.x, q.y, q.z, q.w);
  }
  return { times, quats, duration };
}
