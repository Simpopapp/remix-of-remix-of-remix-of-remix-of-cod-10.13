import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pbrMaterial } from "@/game/assets/AssetLoader";
import type { RuinMaterial, RuinSpec } from "@/game/data/city";

/**
 * Kit modular de prédios destruídos (Fase V3, PRD RM-04/RM-05) — browser-only
 * (THREE). Nada de BoxGeometry em cenário: paredes são Shapes extrudados com
 * aberturas reais (janelas/portas) e topos irregulares de demolição; lajes
 * parciais, vergalhões expostos e chapas de zinco completam o casco.
 *
 * Materiais: PBR fotográfico (Poly Haven) via AssetLoader.pbrMaterial.
 */

// ---------- utilidades ----------

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

/** Ciclos de textura por metro (escala física aproximada de cada PBR). */
const MAT_REPEAT: Record<RuinMaterial, number> = {
  brick: 0.4,
  "worn-brick": 0.4,
  plaster: 0.28,
  block: 0.34,
};

const WALL_T = 0.32;

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function disposeBuildingKit(): void {
  materialCache.forEach((m) => m.dispose());
  materialCache.clear();
}

function kitMaterial(m: RuinMaterial): THREE.MeshStandardMaterial {
  const hit = materialCache.get(m);
  if (hit) return hit;
  const ids: Record<RuinMaterial, string> = {
    brick: "brick_wall_02",
    "worn-brick": "worn_brick_wall",
    plaster: "damaged_plaster",
    block: "concrete_block_wall_03",
  };
  const mat = pbrMaterial(ids[m]!, MAT_REPEAT[m]!);
  mat.roughness = Math.min(1, mat.roughness + 0.05);
  materialCache.set(m, mat);
  return mat;
}

function concreteSlabMaterial(): THREE.MeshStandardMaterial {
  const hit = materialCache.get("slab");
  if (hit) return hit;
  const mat = pbrMaterial("scuffed_cement", 0.28);
  materialCache.set("slab", mat);
  return mat;
}

function corrugatedIronMaterial(repeat = 0.5): THREE.MeshStandardMaterial {
  const key = `corrugated-${repeat}`;
  const hit = materialCache.get(key);
  if (hit) return hit;
  const mat = pbrMaterial("rusty_corrugated_iron", repeat);
  mat.side = THREE.DoubleSide;
  materialCache.set(key, mat);
  return mat;
}

function rebarMaterial(): THREE.MeshStandardMaterial {
  const hit = materialCache.get("rebar");
  if (hit) return hit;
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.82, metalness: 0.55 });
  materialCache.set("rebar", mat);
  return mat;
}

// ---------- chapas corrugadas (perfil real, não textura pintada) ----------

/**
 * Chapa corrugada: plano deslocado por seno (relevo 3D real). No frame
 * canónico o plano fica no XY com o relevo ao longo do Z, ondulando em X.
 */
export function corrugatedSheet(
  length: number,
  height: number,
  opts: { waves?: number; amp?: number; segs?: number; segsY?: number } = {},
): THREE.BufferGeometry {
  const waves = opts.waves ?? Math.max(4, Math.round(length / 0.3));
  const amp = opts.amp ?? 0.035;
  const segs = opts.segs ?? Math.max(8, Math.round(length / 0.18));
  const segsY = opts.segsY ?? 3;
  const geo = new THREE.PlaneGeometry(length, height, segs, segsY);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)!;
    const z = Math.sin((x / length) * waves * Math.PI * 2) * amp;
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ---------- perfil de topo demolido ----------

interface TopProfile {
  points: Array<[number, number]>;
  minY: number;
  breaches: Array<{ x: number; w: number; top: number }>;
}

/** Linha irregular do topo (demolição) + brechas profundas. */
function topProfile(len: number, h: number, damage: number, rng: () => number): TopProfile {
  const pts: Array<[number, number]> = [];
  const minY = Math.max(1.1, h * (1 - damage * 0.62));
  const step = 0.85;
  const breaches: TopProfile["breaches"] = [];
  if (damage > 0.45 && rng() < 0.8) {
    const bw = 1.5 + rng() * 2.2;
    breaches.push({ x: -len / 2 + 1.5 + rng() * (len - 3 - bw), w: bw, top: 0.7 + rng() * 1.1 });
    if (damage > 0.75 && rng() < 0.6) {
      const bx = -len / 2 + 2 + rng() * (len - 4 - bw);
      breaches.push({ x: bx, w: bw * 0.7, top: 0.8 + rng() * 1.0 });
    }
  }
  const yAt = (x: number): number => {
    let y = h * (1 - damage * (0.08 + 0.42 * Math.abs(Math.sin(x * 1.7 + rng() * 6))));
    for (const b of breaches) {
      if (x > b.x && x < b.x + b.w) {
        const t = Math.min(x - b.x, b.x + b.w - x) / (b.w / 2);
        y = Math.min(y, b.top + (1 - t) * (h - b.top) * 0.55);
      }
    }
    return Math.max(minY * 0.9, y + (rng() - 0.5) * 0.18);
  };
  for (let x = -len / 2; x < len / 2; x += step) pts.push([x, yAt(x)]);
  pts.push([len / 2, yAt(len / 2)]);
  return { points: pts, minY, breaches };
}

// ---------- geometria de parede com aberturas ----------

interface WallHoles {
  /** retângulos [x0, y0, w, h] no plano local da parede */
  rects: Array<[number, number, number, number]>;
}

function wallShape(
  len: number,
  h: number,
  damage: number,
  rng: () => number,
  holes: WallHoles,
): THREE.Shape {
  const prof = topProfile(len, h, damage, rng);
  const shape = new THREE.Shape();
  shape.moveTo(-len / 2, -1.4); // saia enterrada (relevo do terreno)
  shape.lineTo(len / 2, -1.4);
  shape.lineTo(len / 2, prof.points[prof.points.length - 1]![1]!);
  for (let i = prof.points.length - 1; i >= 0; i--) {
    const [x, y] = prof.points[i]!;
    shape.lineTo(x, y);
  }
  shape.lineTo(-len / 2, prof.points[0]![1]!);
  shape.closePath();
  for (const [hx, hy, hw, hh] of holes.rects) {
    const path = new THREE.Path();
    const j = () => (rng() - 0.5) * 0.06;
    path.moveTo(hx + j(), hy + j());
    path.lineTo(hx + j(), hy + hh + j());
    path.lineTo(hx + hw + j(), hy + hh + j());
    path.lineTo(hx + hw + j(), hy + j());
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

/** Geometria extrudada da parede, no plano local XY (comprimento em X). */
function wallGeometry(
  len: number,
  h: number,
  damage: number,
  rng: () => number,
  holes: WallHoles,
): THREE.BufferGeometry {
  const shape = wallShape(len, h, damage, rng, holes);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false });
  return geo;
}

// ---------- lajes parciais e vergalhões ----------

function slabGeometry(w: number, d: number, rng: () => number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const step = 0.7;
  const edge = (from: [number, number], to: [number, number], mid: boolean) => {
    if (!mid) {
      shape.lineTo(to[0]!, to[1]!);
      return;
    }
    const n = Math.max(2, Math.round(Math.hypot(to[0]! - from[0]!, to[1]! - from[1]!) / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = from[0]! + (to[0]! - from[0]!) * t;
      const y = from[1]! + (to[1]! - from[1]!) * t;
      const chew = i === n ? 0 : (rng() - 0.3) * 0.5;
      const dx = -(to[1]! - from[1]!);
      const dy = to[0]! - from[0]!;
      const len = Math.hypot(dx, dy) || 1;
      shape.lineTo(x + (dx / len) * chew, y + (dy / len) * chew);
    }
  };
  shape.moveTo(-w / 2, -d / 2);
  edge([-w / 2, -d / 2], [w / 2, -d / 2], true);
  edge([w / 2, -d / 2], [w / 2, d / 2], true);
  edge([w / 2, d / 2], [-w / 2, d / 2], true);
  edge([-w / 2, d / 2], [-w / 2, -d / 2], false);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false });
}

function rebarGeometries(spec: RuinSpec, rng: () => number): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = [];
  const sides: Array<[number, number, number]> = [
    [spec.w, 0, -spec.d / 2],
    [spec.w, 0, spec.d / 2],
    [spec.d, Math.PI / 2, -spec.w / 2],
    [spec.d, Math.PI / 2, spec.w / 2],
  ];
  for (const [len, rotY, off] of sides) {
    const prof = topProfile(len, spec.h, spec.damage, mulberry32(spec.seed + rotY * 100 + off));
    const count = Math.round(prof.breaches.length * 3 + spec.damage * 5);
    for (let i = 0; i < count; i++) {
      const b = prof.breaches[i % Math.max(1, prof.breaches.length)];
      const x = b ? b.x + rng() * b.w : (rng() - 0.5) * len * 0.8;
      const y0 = b ? b.top : spec.h * (1 - spec.damage * 0.4);
      const l = 0.35 + rng() * 0.55;
      const g = new THREE.CylinderGeometry(0.013, 0.013, l, 5);
      const m = new THREE.Matrix4();
      const tiltX = (rng() - 0.5) * 1.6;
      const tiltZ = (rng() - 0.5) * 1.2;
      m.makeRotationFromEuler(new THREE.Euler(tiltX, rng() * Math.PI, tiltZ));
      m.setPosition(x, y0 + l / 2, off + (rng() - 0.5) * 0.2);
      g.applyMatrix4(m);
      geos.push(g);
    }
  }
  return geos;
}

// ---------- casco completo ----------

export interface RuinBuild {
  group: THREE.Group;
  /** malhas sólidas (para raycast de armas) */
  meshes: THREE.Mesh[];
}

/**
 * Constrói o casco destruído de um RuinSpec. A base fica em y=0 local
 * (saia enterrada cobre o relevo); posicionar em heightAt(x, z).
 */
export function buildRuin(spec: RuinSpec): RuinBuild {
  const rng = mulberry32(spec.seed);
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const wallGeos: THREE.BufferGeometry[] = [];

  const mkHoles = (len: number, h: number, withDoor: boolean): WallHoles => {
    const rects: WallHoles["rects"] = [];
    const rows = Math.max(0, Math.floor((h - 2.2) / 2.9));
    const cols = Math.max(0, Math.floor((len - 1.8) / 3.1));
    for (let r = 0; r < rows; r++) {
      const y0 = 1.05 + r * 2.9;
      for (let c = 0; c < cols; c++) {
        if (rng() < 0.22) continue; // janela tapada/obstruída
        const x0 = -len / 2 + 1.2 + c * 3.1;
        const blown = rng() < spec.damage * 0.7;
        const w = (blown ? 1.15 : 0.9) + rng() * 0.2;
        const hh = (blown ? 1.7 : 1.25) + rng() * 0.3;
        if (y0 + hh > h - 0.35) continue;
        rects.push([x0, y0, w, hh]);
      }
    }
    if (withDoor) rects.push([-len / 2 + 1.4 + rng() * (len - 2.8 - 1.4), 0, 1.4, 2.25]);
    return { rects };
  };

  // paredes: norte (z-), sul (z+), oeste (x-), leste (x+)
  const sides: Array<{ len: number; rotY: number; pos: [number, number] }> = [
    { len: spec.w, rotY: 0, pos: [0, -spec.d / 2] },
    { len: spec.w, rotY: Math.PI, pos: [0, spec.d / 2] },
    { len: spec.d, rotY: Math.PI / 2, pos: [-spec.w / 2, 0] },
    { len: spec.d, rotY: -Math.PI / 2, pos: [spec.w / 2, 0] },
  ];
  sides.forEach((side, i) => {
    const geo = wallGeometry(
      side.len,
      spec.h,
      spec.damage,
      mulberry32(spec.seed + i * 7),
      mkHoles(side.len, spec.h, i === 0),
    );
    const m = new THREE.Matrix4().makeRotationY(side.rotY);
    m.setPosition(side.pos[0]!, 0, side.pos[1]!);
    geo.applyMatrix4(m);
    wallGeos.push(geo);
  });

  const wallMat = kitMaterial(spec.material);
  const merged = mergeGeometries(wallGeos, false)!;
  wallGeos.forEach((g) => g.dispose());
  const wallMesh = new THREE.Mesh(merged, wallMat);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);
  meshes.push(wallMesh);

  // lajes parciais nos pisos intermédios
  if (spec.slab && spec.h > 5.5) {
    const slabGeos: THREE.BufferGeometry[] = [];
    const floors = Math.floor(spec.h / 3.4);
    for (let f = 1; f <= floors; f++) {
      const y = f * 3.2;
      if (y > spec.h - 0.6) break;
      const w = spec.w * (0.5 + rng() * 0.4);
      const d = spec.d * (0.45 + rng() * 0.4);
      const geo = slabGeometry(w, d, rng);
      const m = new THREE.Matrix4().makeRotationY((rng() - 0.5) * 0.4);
      m.setPosition((rng() - 0.5) * spec.w * 0.3, y, (rng() - 0.5) * spec.d * 0.3);
      geo.applyMatrix4(m);
      slabGeos.push(geo);
    }
    if (slabGeos.length > 0) {
      const mergedSlabs = mergeGeometries(slabGeos, false)!;
      slabGeos.forEach((g) => g.dispose());
      const slabMesh = new THREE.Mesh(mergedSlabs, concreteSlabMaterial());
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      group.add(slabMesh);
      meshes.push(slabMesh);
    }
  }

  // vergalhões expostos
  if (spec.rebar) {
    const geos = rebarGeometries(spec, rng);
    if (geos.length > 0) {
      const mergedRebar = mergeGeometries(geos, false)!;
      geos.forEach((g) => g.dispose());
      const rebarMesh = new THREE.Mesh(mergedRebar, rebarMaterial());
      rebarMesh.castShadow = true;
      group.add(rebarMesh);
      meshes.push(rebarMesh);
    }
  }

  // chapas de zinco caídas/apoiadas
  if (spec.roofSheets) {
    const mat = corrugatedIronMaterial(0.5);
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const len = 1.6 + rng() * 2.4;
      const geo = corrugatedSheet(len, 1.2 + rng() * 0.8, {
        waves: Math.round(len / 0.3),
        amp: 0.04,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = rng() * Math.PI * 2;
      const px = Math.sin(angle) * (Math.min(spec.w, spec.d) / 2 + 0.5);
      const pz = Math.cos(angle) * (Math.min(spec.w, spec.d) / 2 + 0.5);
      mesh.position.set(px, 0.25 + rng() * 0.4, pz);
      mesh.rotation.set(Math.PI / 2 + (rng() - 0.5) * 0.5, rng() * Math.PI, (rng() - 0.5) * 0.4);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
    }
  }

  return { group, meshes };
}

// ---------- parede reta (perímetro / armazém) ----------

/**
 * Parede reta com topo levemente irregular (estilhaços) — visual realista
 * com colliders intactos (a cobertura gameplay vem dos AABBs do manifesto).
 */
export function buildPlainWall(
  len: number,
  h: number,
  material: RuinMaterial,
  seed: number,
): { geometry: THREE.BufferGeometry; mesh: THREE.Mesh } {
  const rng = mulberry32(seed);
  const shape = new THREE.Shape();
  const step = 1.4;
  shape.moveTo(-len / 2, -0.4);
  shape.lineTo(len / 2, -0.4);
  shape.lineTo(len / 2, h);
  for (let x = len / 2; x > -len / 2; x -= step) {
    const y = h + (rng() - 0.5) * 0.16;
    shape.lineTo(Math.max(-len / 2, x - step * 0.5), y);
  }
  shape.lineTo(-len / 2, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_T, bevelEnabled: false });
  const mesh = new THREE.Mesh(geo, kitMaterial(material));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { geometry: geo, mesh };
}

// ---------- contêiner corrugado real ----------

/**
 * Contêiner com corrugação 3D real (lâminas deslocadas), batentes de canto,
 * portas duplas (abertas em variantes danificadas) e teto/floor metálicos.
 * Dimensões: 6.1 × 2.6 × 2.44, base em y=0 local.
 */
export function buildContainer(
  seed: number,
  tint: number,
  doorOpen: boolean,
): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const L = 6.1;
  const H = 2.6;
  const W = 2.44;
  const mat = corrugatedIronMaterial(0.5).clone();
  mat.color = new THREE.Color(tint);
  materialCache.set(`container-${seed}`, mat);

  const geos: THREE.BufferGeometry[] = [];
  const place = (geo: THREE.BufferGeometry, m: THREE.Matrix4) => {
    geo.applyMatrix4(m);
    geos.push(geo);
  };
  const trs = (x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0));
    m.setPosition(x, y, z);
    return m;
  };

  // laterais (corrugação vertical, ondas ao longo do comprimento)
  for (const z of [-W / 2, W / 2]) {
    const geo = corrugatedSheet(L, H - 0.2, { waves: Math.round(L / 0.28), amp: 0.04 });
    place(geo, trs(L / 2, H / 2, z * (1 - Math.sign(z) * 0.01)));
  }
  // pontas: uma fechada, uma com portas
  const endGeo = () => corrugatedSheet(W, H - 0.2, { waves: Math.round(W / 0.28), amp: 0.04 });
  const endFar = endGeo();
  place(endFar, trs(L, H / 2, 0, 0, Math.PI / 2));
  if (doorOpen) {
    for (const s of [-1, 1]) {
      const door = endGeo();
      const m = new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(0, (s * Math.PI) / 2 + s * 0.9, 0),
      );
      m.setPosition(L * 0.92 + s * 0.35, H / 2, s * W * 0.62);
      place(door, m);
    }
  } else {
    const endNear = endGeo();
    place(endNear, trs(0, H / 2, 0, 0, Math.PI / 2));
  }
  // teto e piso (leve abaulamento)
  for (const [y, dir] of [
    [H - 0.02, 1],
    [0.02, -1],
  ] as const) {
    const geo = corrugatedSheet(L, W, { waves: Math.round(L / 0.28), amp: 0.05 * dir, segsY: 2 });
    place(geo, trs(L / 2, y, 0, -Math.PI / 2));
  }
  // batentes de canto + travessas
  const postGeo = new THREE.CylinderGeometry(0.07, 0.07, H, 8);
  for (const [x, z] of [
    [0.05, -W / 2],
    [0.05, W / 2],
    [L - 0.05, -W / 2],
    [L - 0.05, W / 2],
  ] as const) {
    place(postGeo.clone(), trs(x, H / 2, z));
  }
  for (const y of [H - 0.05, 0.05]) {
    for (const z of [-W / 2, W / 2]) {
      const rail = new THREE.CylinderGeometry(0.05, 0.05, L, 6);
      const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
      m.setPosition(L / 2, y, z);
      rail.applyMatrix4(m);
      geos.push(rail);
    }
    for (const x of [0.05, L - 0.05]) {
      const rail = new THREE.CylinderGeometry(0.05, 0.05, W, 6);
      const m = new THREE.Matrix4().makeRotationX(Math.PI / 2);
      m.setPosition(x, y, 0);
      rail.applyMatrix4(m);
      geos.push(rail);
    }
  }
  const merged = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  meshes.push(mesh);
  return { group, meshes };
}

// ---------- telhado corrugado (armazém, em segmentos rasgados) ----------

/** Segmentos de cobertura com vãos rasgados e abaulantento por dano. */
export function buildWarehouseRoof(
  totalLen: number,
  width: number,
  y: number,
  seed: number,
): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const rng = mulberry32(seed);
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const mat = corrugatedIronMaterial(0.4);
  const segments: Array<[number, number]> = [
    [-totalLen / 2, totalLen * 0.38],
    [-totalLen * 0.04, totalLen * 0.22],
    [totalLen * 0.28, totalLen * 0.22],
  ];
  for (const [x0, len] of segments) {
    const geo = corrugatedSheet(len, width, { waves: Math.round(len / 0.3), amp: -0.06, segsY: 6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = (rng() - 0.5) * 0.05;
    mesh.position.set(x0 + len / 2, y + (rng() - 0.5) * 0.08, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    meshes.push(mesh);
  }
  return { group, meshes };
}

// ---------- casinha da torre de vigia ----------

/** Cabine corrugada da torre (substitui a caixa v1). */
export function buildWatchCabin(
  w: number,
  h: number,
  d: number,
): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const mat = corrugatedIronMaterial(0.6);
  const geos: THREE.BufferGeometry[] = [];
  const trs = (x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, 0));
    m.setPosition(x, y, z);
    return m;
  };
  for (const z of [-d / 2, d / 2]) {
    geos.push(
      (() => {
        const g = corrugatedSheet(w, h, { waves: Math.round(w / 0.3), amp: 0.03 });
        return g;
      })().applyMatrix4(trs(0, h / 2, z)),
    );
  }
  for (const x of [-w / 2, w / 2]) {
    geos.push(
      corrugatedSheet(d, h, { waves: Math.round(d / 0.3), amp: 0.03 }).applyMatrix4(
        trs(x, h / 2, 0, 0, Math.PI / 2),
      ),
    );
  }
  const roof = corrugatedSheet(w, d, { waves: Math.round(w / 0.3), amp: -0.04, segsY: 2 });
  geos.push(roof.applyMatrix4(trs(0, h + 0.02, 0, -Math.PI / 2)));
  const merged = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  meshes.push(mesh);
  return { group, meshes };
}
