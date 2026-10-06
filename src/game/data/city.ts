/**
 * Dados da cidade destruída (Fase V3, PRD RM-04/RM-05) — TS puro, sem THREE,
 * sem React. Fonte de verdade do layout urbano: cascos de prédios, props
 * reais (glTF), entulho e decals. Consumido por src/game/world/**.
 *
 * Regras do PRD:
 * - Geometria de cenário é autorada (silhuetas reais, buracos, vergalhões) —
 *   nada de caixas pintadas.
 * - Colliders por manifesto: cada peça declara suas AABBs aqui (puras), e o
 *   Level só as consome via getLevelColliders().
 */

import type { BoxCollider } from "../world/ValidationScene";
import { heightAt } from "../world/terrainField";

// ---------- prédios destruídos (cascos autorados) ----------

export type RuinMaterial = "brick" | "worn-brick" | "plaster" | "block";

export interface RuinSpec {
  x: number;
  z: number;
  /** largura (x local) e profundidade (z local) da planta */
  w: number;
  d: number;
  h: number;
  seed: number;
  material: RuinMaterial;
  /** 0 = facade danificada; 1 = casco quase nivelado */
  damage: number;
  /** lajes parciais visíveis nos buracos */
  slab?: boolean;
  /** vergalhões expostos nas bordas quebradas */
  rebar?: boolean;
  /** chapas de zinco caídas/apoiadas */
  roofSheets?: boolean;
}

/** Casco de esquina dentro do perímetro (não bloqueia rotas/objetivos). */
export const CITY_RUINS: readonly RuinSpec[] = [
  // ---- backdrop oeste (rua a oeste do muro) ----
  {
    x: -42,
    z: -6,
    w: 10,
    d: 8,
    h: 11,
    seed: 11,
    material: "brick",
    damage: 0.55,
    slab: true,
    rebar: true,
    roofSheets: true,
  },
  {
    x: -43.5,
    z: 6,
    w: 9,
    d: 7,
    h: 9,
    seed: 12,
    material: "plaster",
    damage: 0.7,
    slab: true,
    rebar: true,
  },
  {
    x: -40.5,
    z: -18,
    w: 11,
    d: 9,
    h: 10,
    seed: 13,
    material: "block",
    damage: 0.45,
    slab: true,
    roofSheets: true,
  },
  { x: -38, z: 16, w: 8, d: 6, h: 7, seed: 14, material: "worn-brick", damage: 0.75, rebar: true },
  // ---- backdrop leste ----
  {
    x: 41,
    z: 2,
    w: 10,
    d: 8,
    h: 12,
    seed: 15,
    material: "brick",
    damage: 0.5,
    slab: true,
    rebar: true,
    roofSheets: true,
  },
  {
    x: 42.5,
    z: -10,
    w: 9,
    d: 8,
    h: 8,
    seed: 16,
    material: "plaster",
    damage: 0.65,
    slab: true,
    roofSheets: true,
  },
  {
    x: 40,
    z: 14,
    w: 8,
    d: 7,
    h: 10,
    seed: 17,
    material: "block",
    damage: 0.6,
    slab: true,
    rebar: true,
  },
  {
    x: 38.5,
    z: -2,
    w: 9,
    d: 6,
    h: 6.5,
    seed: 18,
    material: "worn-brick",
    damage: 0.8,
    rebar: true,
  },
  // ---- backdrop sul (atrás do armazém) ----
  {
    x: -12,
    z: -42,
    w: 12,
    d: 9,
    h: 9,
    seed: 19,
    material: "brick",
    damage: 0.6,
    slab: true,
    roofSheets: true,
  },
  {
    x: 4,
    z: -43.5,
    w: 10,
    d: 8,
    h: 11,
    seed: 20,
    material: "plaster",
    damage: 0.55,
    slab: true,
    rebar: true,
  },
  { x: 18, z: -41.5, w: 9, d: 8, h: 9, seed: 21, material: "block", damage: 0.7, slab: true },
  // ---- fachadas bombardeadas junto ao muro (visíveis por cima) ----
  { x: 10, z: -38.5, w: 9, d: 6, h: 6, seed: 22, material: "brick", damage: 0.9, rebar: true },
  { x: -14, z: -39, w: 8, d: 6, h: 5.5, seed: 23, material: "plaster", damage: 0.9, rebar: true },
  { x: -39, z: -2, w: 8, d: 6, h: 7, seed: 24, material: "block", damage: 0.85, rebar: true },
  // ---- flancos do acesso norte (fora das rampas) ----
  {
    x: -24,
    z: 34,
    w: 10,
    d: 8,
    h: 9,
    seed: 25,
    material: "brick",
    damage: 0.6,
    slab: true,
    roofSheets: true,
  },
  {
    x: 27,
    z: 36,
    w: 9,
    d: 7,
    h: 10,
    seed: 26,
    material: "plaster",
    damage: 0.65,
    slab: true,
    rebar: true,
  },
  // ---- cascos de esquina dentro do perímetro ----
  { x: -27, z: 17, w: 8, d: 6, h: 4.5, seed: 27, material: "block", damage: 0.85, rebar: true },
  {
    x: 26.5,
    z: 16.5,
    w: 7,
    d: 5,
    h: 4,
    seed: 28,
    material: "worn-brick",
    damage: 0.9,
    rebar: true,
  },
];

const WALL_T = 0.32;

/**
 * Colliders por manifesto das paredes de um casco. Conservador (caixa cheia,
 * sem descontar buracos de janela — o jogador não atravessa paredes).
 */
export function ruinColliders(spec: RuinSpec): BoxCollider[] {
  const baseY = heightAt(spec.x, spec.z);
  const hw = spec.w / 2;
  const hd = spec.d / 2;
  const t = WALL_T;
  const out: BoxCollider[] = [
    // norte/sul (z local ±hd)
    {
      minX: spec.x - hw,
      maxX: spec.x + hw,
      minY: baseY,
      maxY: baseY + spec.h,
      minZ: spec.z - hd,
      maxZ: spec.z - hd + t,
    },
    {
      minX: spec.x - hw,
      maxX: spec.x + hw,
      minY: baseY,
      maxY: baseY + spec.h,
      minZ: spec.z + hd - t,
      maxZ: spec.z + hd,
    },
    // leste/oeste (x local ±hw)
    {
      minX: spec.x - hw,
      maxX: spec.x - hw + t,
      minY: baseY,
      maxY: baseY + spec.h,
      minZ: spec.z - hd,
      maxZ: spec.z + hd,
    },
    {
      minX: spec.x + hw - t,
      maxX: spec.x + hw,
      minY: baseY,
      maxY: baseY + spec.h,
      minZ: spec.z - hd,
      maxZ: spec.z + hd,
    },
  ];
  return out;
}

/** Colliders de todos os cascos (consumidos por getLevelColliders). */
export function getCityRuinColliders(): BoxCollider[] {
  const out: BoxCollider[] = [];
  for (const r of CITY_RUINS) out.push(...ruinColliders(r));
  return out;
}

// ---------- props reais (glTF CC0) ----------

export type PropModelId =
  | "covered_car"
  | "concrete_road_barrier_02"
  | "Barrel_01"
  | "barrel_03"
  | "old_military_crate"
  | "ammo_box"
  | "metal_jerrycan_green"
  | "plastic_crate_01"
  | "cardboard_box_01"
  | "old_tyre"
  | "exterior_aircon_unit"
  | "rollershutter_door"
  | "modular_chainlink_fence"
  | "utility_box_01";

export interface PropSpec {
  id: PropModelId;
  x: number;
  z: number;
  /** rotação em yaw (rad) */
  rot: number;
  /** y absoluto (padrão: altura do terreno) */
  y?: number;
  /** normalização: escala uniforme para esta dimensão (m) */
  size: number;
  /** eixo de normalização */
  sizeAxis?: "height" | "maxdim";
  /** gera collider de caixa (half-depth aproximado pela própria bbox) */
  collider?: { hw: number; hd: number; h: number };
}

/** Props novos (veículos queimados, latas, caixas, pneus, unidades de AC...). */
export const CITY_PROPS: readonly PropSpec[] = [
  // veículos queimados como cobertura (fora das rotas de patrulha)
  {
    id: "covered_car",
    x: 2.5,
    z: 16.5,
    rot: 0.35,
    size: 4.6,
    sizeAxis: "maxdim",
    collider: { hw: 2.3, hd: 1.05, h: 1.5 },
  },
  {
    id: "covered_car",
    x: -19,
    z: -17.5,
    rot: 2.2,
    size: 4.6,
    sizeAxis: "maxdim",
    collider: { hw: 2.3, hd: 1.05, h: 1.5 },
  },
  // caixas de munição junto aos caixotes existentes
  { id: "ammo_box", x: 4.4, z: 1.2, rot: 0.7, size: 0.55, sizeAxis: "maxdim" },
  { id: "ammo_box", x: -5.6, z: -7.4, rot: 2.9, size: 0.55, sizeAxis: "maxdim" },
  { id: "ammo_box", x: -12.4, z: 7.6, rot: 1.1, size: 0.55, sizeAxis: "maxdim" },
  // latinas / jerricans
  { id: "metal_jerrycan_green", x: 5.9, z: 2.6, rot: 0.2, size: 0.55, sizeAxis: "maxdim" },
  { id: "metal_jerrycan_green", x: 6.4, z: 2.2, rot: 0.9, size: 0.55, sizeAxis: "maxdim" },
  { id: "metal_jerrycan_green", x: -8.6, z: -8.9, rot: 2.4, size: 0.55, sizeAxis: "maxdim" },
  // caixotes de plástico e papelão no armazém (objetivo C)
  { id: "plastic_crate_01", x: -4.2, z: -24.2, rot: 0.4, size: 0.7, sizeAxis: "maxdim" },
  { id: "plastic_crate_01", x: -4.9, z: -23.7, rot: 1.3, size: 0.7, sizeAxis: "maxdim" },
  { id: "plastic_crate_01", x: 4.6, z: -25.6, rot: 2.2, size: 0.7, sizeAxis: "maxdim" },
  { id: "cardboard_box_01", x: -3.4, z: -29.5, rot: 0.9, size: 0.6, sizeAxis: "maxdim" },
  { id: "cardboard_box_01", x: -4.1, z: -30.1, rot: 0.2, size: 0.6, sizeAxis: "maxdim" },
  { id: "cardboard_box_01", x: 5.2, z: -28.8, rot: 1.8, size: 0.6, sizeAxis: "maxdim" },
  // pneus espalhados
  { id: "old_tyre", x: 7.2, z: 2.2, rot: 0.3, size: 0.75, sizeAxis: "maxdim" },
  { id: "old_tyre", x: -9.4, z: 3.2, rot: 1.1, size: 0.75, sizeAxis: "maxdim" },
  { id: "old_tyre", x: 13.2, z: -4.6, rot: 2.0, size: 0.75, sizeAxis: "maxdim" },
  { id: "old_tyre", x: -3.2, z: 14.2, rot: 0.8, size: 0.75, sizeAxis: "maxdim" },
  { id: "old_tyre", x: 11.4, z: -15.4, rot: 2.7, size: 0.75, sizeAxis: "maxdim" },
  // unidades de AC penduradas no armazém (visual)
  {
    id: "exterior_aircon_unit",
    x: 13.4,
    z: -24,
    rot: -Math.PI / 2,
    y: 2.5,
    size: 0.9,
    sizeAxis: "maxdim",
  },
  {
    id: "exterior_aircon_unit",
    x: -13.4,
    z: -26.5,
    rot: Math.PI / 2,
    y: 2.5,
    size: 0.9,
    sizeAxis: "maxdim",
  },
  // porta de enrolar caída encostada na parede leste do armazém
  { id: "rollershutter_door", x: 12.5, z: -29.5, rot: 0.25, y: 0, size: 3.2, sizeAxis: "maxdim" },
  // cercas de arame junto ao portão (visual; rotas livres)
  { id: "modular_chainlink_fence", x: -8.5, z: 21.5, rot: 0, size: 3.6, sizeAxis: "maxdim" },
  { id: "modular_chainlink_fence", x: 7.5, z: 21, rot: 0.1, size: 3.6, sizeAxis: "maxdim" },
  // caixas de utilidade junto ao muro
  { id: "utility_box_01", x: 30.5, z: 10.5, rot: -Math.PI / 2, size: 1.4, sizeAxis: "maxdim" },
  { id: "utility_box_01", x: -30.5, z: -19.5, rot: Math.PI / 2, size: 1.4, sizeAxis: "maxdim" },
];

/** Collider do veículo queimado (caixa orientada conservadora). */
export function getCityPropColliders(): BoxCollider[] {
  const out: BoxCollider[] = [];
  for (const p of CITY_PROPS) {
    if (!p.collider) continue;
    const c = Math.abs(Math.cos(p.rot));
    const s = Math.abs(Math.sin(p.rot));
    const ex = c * p.collider.hw + s * p.collider.hd;
    const ez = s * p.collider.hw + c * p.collider.hd;
    const baseY = p.y ?? heightAt(p.x, p.z);
    out.push({
      minX: p.x - ex,
      maxX: p.x + ex,
      minY: baseY,
      maxY: baseY + p.collider.h,
      minZ: p.z - ez,
      maxZ: p.z + ez,
    });
  }
  return out;
}

// ---------- entulho instanciado ----------

export interface DebrisCluster {
  x: number;
  z: number;
  /** raio de dispersão */
  r: number;
  count: number;
  /** tamanho máximo dos blocos (m) */
  maxSize: number;
  seed: number;
}

export const DEBRIS_CLUSTERS: readonly DebrisCluster[] = [
  // pés dos cascos externos
  { x: -42, z: -6, r: 6, count: 90, maxSize: 0.7, seed: 31 },
  { x: 41, z: 2, r: 6, count: 90, maxSize: 0.7, seed: 32 },
  { x: -12, z: -42, r: 7, count: 110, maxSize: 0.8, seed: 33 },
  { x: 4, z: -43.5, r: 6, count: 90, maxSize: 0.7, seed: 34 },
  { x: 18, z: -41.5, r: 5.5, count: 80, maxSize: 0.7, seed: 35 },
  { x: -24, z: 34, r: 6, count: 90, maxSize: 0.7, seed: 36 },
  { x: 27, z: 36, r: 5.5, count: 80, maxSize: 0.7, seed: 37 },
  // esquinas internas
  { x: -27, z: 17, r: 5, count: 90, maxSize: 0.55, seed: 38 },
  { x: 26.5, z: 16.5, r: 4.5, count: 80, maxSize: 0.55, seed: 39 },
  // pátio e armazém
  { x: 0, z: -19.5, r: 3.5, count: 60, maxSize: 0.5, seed: 40 },
  { x: 8, z: -34.5, r: 4, count: 70, maxSize: 0.6, seed: 41 },
  { x: -9, z: -35, r: 4, count: 70, maxSize: 0.6, seed: 42 },
  { x: -18, z: 9, r: 4, count: 60, maxSize: 0.5, seed: 43 },
  { x: 17.5, z: -6, r: 4, count: 60, maxSize: 0.5, seed: 44 },
  // crateras de morteiro (bordas cheias de escombros)
  { x: -14, z: 33, r: 5.5, count: 110, maxSize: 0.7, seed: 45 },
  { x: 20, z: 31, r: 5, count: 90, maxSize: 0.7, seed: 46 },
  { x: -24, z: 36, r: 6, count: 100, maxSize: 0.7, seed: 47 },
];

// ---------- decals (fuligem / marcas de bala) ----------

export interface ScorchSpec {
  x: number;
  z: number;
  r: number;
  /** rotação no plano (rad) */
  rot?: number;
  /** 0 = fuligem nova; 1 = queimado profundo */
  intensity?: number;
}

export const SCORCH_SPECS: readonly ScorchSpec[] = [
  // sob os veículos
  { x: 2.5, z: 16.5, r: 2.6, rot: 0.35, intensity: 0.9 },
  { x: -19, z: -17.5, r: 2.4, rot: 2.2, intensity: 0.85 },
  // entrada do armazém e interior
  { x: 0, z: -19.8, r: 3.4, intensity: 0.8 },
  { x: 0, z: -25, r: 2.6, intensity: 0.6 },
  // crateras
  { x: -14, z: 33, r: 5, intensity: 0.9 },
  { x: 20, z: 31, r: 4.2, intensity: 0.85 },
  { x: -24, z: 36, r: 5.2, intensity: 0.9 },
  // pátio
  { x: -10.5, z: 4.5, r: 1.8, intensity: 0.5 },
  { x: 9, z: -6.5, r: 1.6, intensity: 0.5 },
  { x: -16, z: -10.5, r: 1.6, intensity: 0.5 },
  { x: 0, z: -16.5, r: 1.6, intensity: 0.5 },
];

export interface PockSpec {
  /** posição no mundo */
  x: number;
  y: number;
  z: number;
  /** normal do decal (aponta para fora da parede) */
  nx: number;
  ny: number;
  nz: number;
  r: number;
}

/** Marcas de bala/estilhaços nas paredes do perímetro e do armazém. */
export const POCK_SPECS: readonly PockSpec[] = [
  { x: -6, y: 2.2, z: 25.6, nx: 0, ny: 0, nz: -1, r: 0.28 },
  { x: -4.2, y: 1.5, z: 25.6, nx: 0, ny: 0, nz: -1, r: 0.2 },
  { x: 5.4, y: 2.8, z: 25.6, nx: 0, ny: 0, nz: -1, r: 0.32 },
  { x: 7.8, y: 1.8, z: 25.6, nx: 0, ny: 0, nz: -1, r: 0.22 },
  { x: -33.6, y: 2.4, z: -4, nx: 1, ny: 0, nz: 0, r: 0.3 },
  { x: -33.6, y: 3.6, z: 2, nx: 1, ny: 0, nz: 0, r: 0.24 },
  { x: 33.6, y: 2.6, z: -8, nx: -1, ny: 0, nz: 0, r: 0.28 },
  { x: 33.6, y: 1.6, z: -14, nx: -1, ny: 0, nz: 0, r: 0.22 },
  { x: -12, y: 1.9, z: -20.8, nx: 0, ny: 0, nz: 1, r: 0.26 },
  { x: 11.5, y: 2.5, z: -20.8, nx: 0, ny: 0, nz: 1, r: 0.3 },
  { x: 0.8, y: 5.4, z: -32.8, nx: 0, ny: 0, nz: 1, r: 0.34 },
  { x: -6.4, y: 4.2, z: -32.8, nx: 0, ny: 0, nz: 1, r: 0.26 },
];
