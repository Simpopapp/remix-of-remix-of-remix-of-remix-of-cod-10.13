/**
 * Pré-carga do soldado skinned (Fase V4) — fila P1 com fallback: se o GLB
 * falhar, o inimigo usa o corpo composto de blocos (código da Fase 4).
 */

import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { loadGLB } from "./AssetLoader";

export const SOLDIER_URL = "/game-assets/models/soldier.glb";

let loaded: GLTF | null = null;

export function preloadSoldier(onProgress: (fraction: number) => void): Promise<void> {
  return loadGLB(SOLDIER_URL, onProgress)
    .then((gltf) => {
      loaded = gltf;
    })
    .catch((err: unknown) => {
      // P1: falha → enemy skinned omitido, jogo continua com o fallback
      console.warn(`[assets] P1 omitido por falha: ${SOLDIER_URL}`, err);
    });
}

/** GLB já resolvido (após preload) ou null se falhou/ainda não carregado. */
export function getSoldierGltf(): GLTF | null {
  return loaded;
}
