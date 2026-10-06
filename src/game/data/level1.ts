/**
 * Dados do nível da missão 1 (Fase 5) — layout completo por dados.
 * Módulo puro (sem THREE, sem React), consumido por src/game/world/Level.ts.
 * Coordenadas compatíveis com os spawns/rotas de src/game/data/mission1.ts.
 */

export interface WallSpec {
  /** centro x */
  x: number;
  /** centro z */
  z: number;
  /** largura em x */
  w: number;
  /** profundidade em z */
  d: number;
  /** altura */
  h: number;
  /** centro em y (padrão: h / 2) */
  y?: number;
}

/** Muro perimetral (espessura 0.6, altura 5.5) com portão ao norte (z = 26). */
export const PERIMETER_WALLS: readonly WallSpec[] = [
  // norte (z = 26), portão em x -3..3
  { x: -18.5, z: 26, w: 31, d: 0.6, h: 5.5 },
  { x: 18.5, z: 26, w: 31, d: 0.6, h: 5.5 },
  // sul (z = -34)
  { x: 0, z: -34, w: 68, d: 0.6, h: 5.5 },
  // oeste (x = -34) e leste (x = 34)
  { x: -34, z: -4, w: 0.6, d: 60.6, h: 5.5 },
  { x: 34, z: -4, w: 0.6, d: 60.6, h: 5.5 },
];

/**
 * Armazém (objetivo C): casco 26 × 12 (x -13..13, z -33..-21), altura 8,
 * fachada frontal (z = -21) com portão de 6 m de largura × 4 m de altura.
 */
export const WAREHOUSE_WALLS: readonly WallSpec[] = [
  // fachada: segmentos laterais + verga sobre o portão
  { x: -8, z: -21, w: 10, d: 0.4, h: 8 },
  { x: 8, z: -21, w: 10, d: 0.4, h: 8 },
  { x: 0, z: -21, w: 6, d: 0.4, h: 4, y: 6 },
  // fundo e laterais
  { x: 0, z: -33, w: 26.4, d: 0.4, h: 8 },
  { x: -13, z: -27, w: 0.4, d: 12.4, h: 8 },
  { x: 13, z: -27, w: 0.4, d: 12.4, h: 8 },
];

/** Telhado do armazém (sem collider — fora do alcance do jogador). */
export const WAREHOUSE_ROOF = { x: 0, z: -27, w: 26.8, d: 12.8, h: 0.3, y: 8.15 };

/** Pilares internos do armazém (x, z, raio, altura). */
export const WAREHOUSE_PILLARS: ReadonlyArray<[number, number, number, number]> = [
  [-6, -24, 0.28, 8],
  [6, -24, 0.28, 8],
  [-6, -30, 0.28, 8],
  [6, -30, 0.28, 8],
];

/** Barreiras Jersey (2.4 × 0.5 × 1.0) — cobertura baixa do pátio. */
export interface BarrierSpec {
  x: number;
  z: number;
  /** "x" = comprimento ao longo de x; "z" = ao longo de z */
  axis: "x" | "z";
}

export const BARRIER_SPECS: readonly BarrierSpec[] = [
  { x: -4, z: 8, axis: "x" },
  { x: 4.5, z: 5, axis: "z" },
  { x: 10, z: -3, axis: "x" },
  { x: -11, z: -2, axis: "z" },
  { x: 0, z: -6, axis: "x" },
  { x: -15, z: 6, axis: "x" },
  { x: 14, z: 8, axis: "z" },
];

/** Tambores metálicos (raio 0.35, altura 1.1). */
export const BARREL_SPECS: ReadonlyArray<[number, number]> = [
  [2, -12],
  [2.8, -12.4],
  [-9, 10],
  [-8.2, 10.3],
  [7, -8],
  [16, -3],
  [-16, -6],
  [11, 12],
];

/** Luzes práticas quentes (x, y, z, intensidade). */
export const PRACTICAL_LIGHTS: ReadonlyArray<[number, number, number, number]> = [
  [-7.9, 2.4, 4, 45],
  [7.4, 2.4, 11.2, 38],
  [-14.5, 2.4, -9, 34],
  [-6, 6.5, -27, 90],
  [6, 6.5, -27, 90],
  [0, 4.6, -20.4, 30],
];

/** Ponto de extração (objetivo final, dentro do armazém). */
export const EXTRACTION = { x: 0, z: -27 };

/** Spawn do jogador. */
export const PLAYER_SPAWN = { x: 0, z: 20 };
