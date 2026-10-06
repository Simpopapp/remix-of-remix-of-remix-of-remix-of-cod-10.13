import * as THREE from "three";
import { DEBRIS_CLUSTERS } from "@/game/data/city";
import { heightAt } from "./terrainField";

/**
 * Entulho instanciado (Fase V3, PRD RM-05) — blocos irregulares (icosaedro
 * deformado por semente), um InstancedMesh por cluster, material PBR de
 * cimento. Sem colisão (altura ≤ 0.8 m, decorativo e atravessável por tiros).
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chunkGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const rng = mulberry32(seed);
  for (let i = 0; i < pos.count; i++) {
    const f = 0.55 + rng() * 0.9;
    pos.setXYZ(i, pos.getX(i)! * f, pos.getY(i)! * (0.35 + rng() * 0.6), pos.getZ(i)! * f);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

const debrisMat = new THREE.MeshStandardMaterial({
  map: null,
  roughness: 0.95,
  metalness: 0.02,
  color: 0x8d8a83,
});

/** Carrega o albedo/normal do cimento no material compartilhado (uma vez). */
export function initDebrisMaterial(load: (url: string, srgb: boolean) => THREE.Texture): void {
  if (debrisMat.map) return;
  debrisMat.map = load("/game-assets/textures/scuffed_cement/Diffuse.jpg", true);
  debrisMat.normalMap = load("/game-assets/textures/scuffed_cement/nor_gl.jpg", false);
  debrisMat.normalScale = new THREE.Vector2(1.1, 1.1);
  debrisMat.needsUpdate = true;
}

export interface DebrisBuild {
  meshes: THREE.InstancedMesh[];
  geometry: THREE.BufferGeometry;
}

export function buildDebris(): DebrisBuild {
  const meshes: THREE.InstancedMesh[] = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (const cluster of DEBRIS_CLUSTERS) {
    const rng = mulberry32(cluster.seed);
    const geo = chunkGeometry(cluster.seed);
    const mesh = new THREE.InstancedMesh(geo, debrisMat, cluster.count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    let i = 0;
    while (i < cluster.count) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * cluster.r;
      const x = cluster.x + Math.sin(a) * r;
      const z = cluster.z + Math.cos(a) * r;
      const size = 0.12 + Math.pow(rng(), 1.6) * cluster.maxSize;
      p.set(x, heightAt(x, z) + size * 0.28, z);
      e.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      q.setFromEuler(e);
      s.set(size * (0.8 + rng() * 0.8), size * (0.4 + rng() * 0.5), size * (0.8 + rng() * 0.8));
      m4.compose(p, q, s);
      mesh.setMatrixAt(i, m4);
      i++;
    }
    mesh.instanceMatrix.needsUpdate = true;
    meshes.push(mesh);
  }
  return { meshes, geometry: meshes[0]?.geometry ?? new THREE.BufferGeometry() };
}

export function disposeDebris(build: DebrisBuild): void {
  for (const m of build.meshes) m.geometry.dispose();
}
