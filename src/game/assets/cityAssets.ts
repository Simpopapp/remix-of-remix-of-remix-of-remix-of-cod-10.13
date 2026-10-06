import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CITY_PROPS, type PropModelId } from "@/game/data/city";
import { loadGLB, runAssetQueue, type QueuedAsset } from "./AssetLoader";

/**
 * Pré-carga dos props da cidade (Fase V3) — fila de assets P1 com fallback:
 * prop que falhar é omitido, o jogo continua (PRD §4.4). Os materiais/luzes
 * do resto do nível não dependem desta fila.
 */

export const PROP_MODEL_URLS: Record<PropModelId, string> = {
  covered_car: "/game-assets/models/covered_car.glb",
  concrete_road_barrier_02: "/game-assets/models/concrete_road_barrier_02.glb",
  Barrel_01: "/game-assets/models/Barrel_01.glb",
  barrel_03: "/game-assets/models/barrel_03.glb",
  old_military_crate: "/game-assets/models/old_military_crate.glb",
  ammo_box: "/game-assets/models/ammo_box.glb",
  metal_jerrycan_green: "/game-assets/models/metal_jerrycan_green.glb",
  plastic_crate_01: "/game-assets/models/plastic_crate_01.glb",
  cardboard_box_01: "/game-assets/models/cardboard_box_01.glb",
  old_tyre: "/game-assets/models/old_tyre.glb",
  exterior_aircon_unit: "/game-assets/models/exterior_aircon_unit.glb",
  rollershutter_door: "/game-assets/models/rollershutter_door.glb",
  modular_chainlink_fence: "/game-assets/models/modular_chainlink_fence.glb",
  utility_box_01: "/game-assets/models/utility_box_01.glb",
};

const loaded = new Map<PropModelId, GLTF>();

export function preloadCityAssets(onProgress: (fraction: number) => void): Promise<void> {
  const ids = [...new Set(CITY_PROPS.map((p) => p.id))];
  const assets: QueuedAsset[] = ids.map((id) => ({
    url: PROP_MODEL_URLS[id],
    priority: "P1",
    load: async (onFile) => {
      const gltf = await loadGLB(PROP_MODEL_URLS[id]!, onFile);
      loaded.set(id, gltf);
    },
  }));
  return runAssetQueue(assets, onProgress);
}

/** GLB já resolvido (após preload) ou null se falhou/ainda não carregado. */
export function getLoadedGltf(id: PropModelId): GLTF | null {
  return loaded.get(id) ?? null;
}

export interface NormalizedProp {
  object: THREE.Object3D;
  height: number;
  maxDim: number;
}

/**
 * Normaliza um GLB: base alinhada a y=0, escala uniforme para o tamanho-alvo
 * (por altura ou por maior dimensão), materiais com sombras.
 */
export function normalizeProp(
  gltf: GLTF,
  size: number,
  sizeAxis: "height" | "maxdim",
): NormalizedProp | null {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const dims = new THREE.Vector3();
  box.getSize(dims);
  if (!isFinite(dims.x) || dims.x <= 0 || dims.y <= 0 || dims.z <= 0) return null;
  const src = sizeAxis === "height" ? dims.y : Math.max(dims.x, dims.y, dims.z);
  const scale = size / src;
  root.scale.setScalar(scale);
  // realinha a base para y=0 após escala
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;
  root.position.x -= (box2.min.x + box2.max.x) / 2;
  root.position.z -= (box2.min.z + box2.max.z) / 2;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  const box3 = new THREE.Box3().setFromObject(root);
  const dims3 = new THREE.Vector3();
  box3.getSize(dims3);
  return {
    object: root,
    height: dims3.y,
    maxDim: Math.max(dims3.x, dims3.y, dims3.z),
  };
}
