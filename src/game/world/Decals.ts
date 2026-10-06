import * as THREE from "three";
import { POCK_SPECS, SCORCH_SPECS } from "@/game/data/city";
import { heightAt } from "./terrainField";

/**
 * Decals de combate (Fase V3) — marcas de fuligem no chão e pockmarks nas
 * paredes, texturas canvas (aditivas ao PBR, sem custo de rede).
 */

let sootTex: THREE.Texture | null = null;

function makeSootTexture(intensity: number): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  const a = 0.25 + intensity * 0.6;
  g.addColorStop(0, `rgba(8, 7, 6, ${a})`);
  g.addColorStop(0.45, `rgba(14, 12, 10, ${a * 0.7})`);
  g.addColorStop(1, "rgba(14, 12, 10, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let pockTex: THREE.Texture | null = null;

function makePockTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(6, 5, 4, 0.95)");
  g.addColorStop(0.4, "rgba(20, 16, 12, 0.6)");
  g.addColorStop(1, "rgba(20, 16, 12, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface DecalBuild {
  meshes: THREE.Mesh[];
  materials: THREE.Material[];
}

export function buildDecals(): DecalBuild {
  const meshes: THREE.Mesh[] = [];
  const materials: THREE.Material[] = [];
  const geo = new THREE.CircleGeometry(1, 24);

  // fuligem no chão
  const scorchMats = new Map<number, THREE.MeshBasicMaterial>();
  for (const s of SCORCH_SPECS) {
    const intensity = s.intensity ?? 0.7;
    let mat = scorchMats.get(Math.round(intensity * 10));
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: makeSootTexture(intensity),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        toneMapped: false,
      });
      scorchMats.set(Math.round(intensity * 10), mat);
      materials.push(mat);
    }
    const mesh = new THREE.Mesh(geo, mat!);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = s.rot ?? 0;
    mesh.position.set(s.x, heightAt(s.x, s.z) + 0.03, s.z);
    mesh.scale.setScalar(s.r);
    mesh.renderOrder = 1;
    scene_add(meshes, mesh);
  }

  // marcas de bala nas paredes
  for (const p of POCK_SPECS) {
    if (!pockTex) pockTex = makePockTexture();
    const mat = new THREE.MeshBasicMaterial({
      map: pockTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      toneMapped: false,
    });
    materials.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    const normal = new THREE.Vector3(p.nx, p.ny, p.nz).normalize();
    mesh.position.set(p.x + normal.x * 0.02, p.y + normal.y * 0.02, p.z + normal.z * 0.02);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.scale.setScalar(p.r);
    mesh.renderOrder = 2;
    scene_add(meshes, mesh);
  }
  return { meshes, materials };
}

function scene_add(list: THREE.Mesh[], mesh: THREE.Mesh): void {
  list.push(mesh);
}

export function disposeDecals(build: DecalBuild): void {
  build.materials.forEach((m) => m.dispose());
  if (pockTex) {
    pockTex.dispose();
    pockTex = null;
  }
  sootTex = null;
}
