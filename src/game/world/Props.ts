import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CITY_PROPS, type PropSpec } from "@/game/data/city";
import { heightAt } from "./terrainField";
import { getLoadedGltf, normalizeProp } from "@/game/assets/cityAssets";

/**
 * Colocação dos props glTF (Fase V3) — cada instância é um clone normalizado
 * do modelo pré-carregado, com sombras e raycast (hitMeshes). Props cujo GLB
 * falhou são omitidos (P1, PRD §4.4).
 */

export type PropSpecInput = PropSpec;

export function placeProps(
  scene: THREE.Scene,
  hitMeshes?: THREE.Mesh[],
): { placed: number; missing: number; meshes: THREE.Mesh[] } {
  let placed = 0;
  let missing = 0;
  const meshes: THREE.Mesh[] = [];
  for (const spec of CITY_PROPS) {
    const result = addProp(scene, spec, hitMeshes);
    if (result) {
      placed++;
      meshes.push(...result);
    } else {
      missing++;
    }
  }
  return { placed, missing, meshes };
}

/** Coloca um prop; devolve as malhas criadas ou null se o GLB não carregou. */
export function addProp(
  scene: THREE.Scene,
  spec: PropSpec,
  hitMeshes?: THREE.Mesh[],
): THREE.Mesh[] | null {
  const gltf = getLoadedGltf(spec.id);
  if (!gltf) return null;
  const norm = normalizeProp(gltf, spec.size, spec.sizeAxis ?? "maxdim");
  if (!norm) return null;
  const holder = new THREE.Group();
  holder.add(norm.object.clone(true));
  holder.position.set(spec.x, spec.y ?? heightAt(spec.x, spec.z), spec.z);
  holder.rotation.y = spec.rot;
  scene.add(holder);
  const meshes: THREE.Mesh[] = [];
  holder.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      hitMeshes?.push(mesh);
      meshes.push(mesh);
    }
  });
  return meshes;
}

/** Conta quantos props do manifesto têm modelo carregado. */
export function availableProps(): number {
  return [...new Set(CITY_PROPS.map((p) => p.id))].filter((id) => getLoadedGltf(id) !== null)
    .length;
}
