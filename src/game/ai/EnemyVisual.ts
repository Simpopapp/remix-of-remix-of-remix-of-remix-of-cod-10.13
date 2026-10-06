import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clampAimPitch, deathQuatSamples, gaitWeights } from "./enemyVisualMath";

/**
 * Visual skinned do inimigo (Fase V4, PRD RM-05) — browser-only.
 * Rig Mixamo (Soldier.glb, MIT) com AnimationMixer: blend idle/walk/run por
 * velocidade (time-scale ∝ velocidade), mira aditiva no tronco (bone Spine)
 * durante COMBAT, hitboxes invisíveis presas a bones com o contrato
 * userData { enemyId, zone } do WeaponSystem e clip de morte procedural
 * (sem ragdoll, PRD D-05). SkeletonUtils.clone por instância; o Director
 * limita a 12 skinned simultâneos.
 */

const TARGET_HEIGHT = 1.78;
const FLASH_TIME = 0.14;

export interface EnemyVisualState {
  /** velocidade de solo (m/s) */
  speed: number;
  /** mira no alvo (combat/cover) */
  aiming: boolean;
  /** pitch do alvo relativo ao olho (rad) */
  pitch: number;
  /** 0..1 (espera na cobertura) */
  crouch: number;
}

export class EnemyVisual {
  readonly object = new THREE.Group();
  /** Hitboxes por bone, raycastáveis, com userData { enemyId, zone }. */
  readonly hitMeshes: THREE.Mesh[] = [];
  /** Foco do cano ancorado na mão direita (modelo da arma entra na Fase V5). */
  readonly muzzle = new THREE.Object3D();

  private mixer: THREE.AnimationMixer;
  private model: THREE.Object3D;
  private actions: {
    idle: THREE.AnimationAction;
    walk: THREE.AnimationAction;
    run: THREE.AnimationAction;
  };
  private spine: THREE.Bone | null = null;
  private spine1: THREE.Bone | null = null;
  private materials: THREE.MeshStandardMaterial[] = [];
  private aimK = 0;
  private flash = 0;
  private dead = false;

  constructor(gltf: GLTF, enemyId: number) {
    const model = skeletonClone(gltf.scene);
    model.updateMatrixWorld(true);

    // normaliza: altura alvo, pés em y = 0, centro em x/z
    let box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0.5) model.scale.multiplyScalar(TARGET_HEIGHT / size.y);
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);

    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.object.add(model);

    // materiais clonados por instância: flash de dano + variação de tom de uniforme
    const tint = 0.88 + Math.random() * 0.24;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const clone = mat.clone();
      clone.color.setRGB(clone.color.r * tint, clone.color.g * tint, clone.color.b * tint);
      mesh.material = clone;
      this.materials.push(clone);
    });

    const bone = (name: string): THREE.Bone | null =>
      (model.getObjectByName(name) as THREE.Bone | undefined) ?? null;
    this.spine = bone("mixamorig:Spine");
    this.spine1 = bone("mixamorig:Spine1");
    const head = bone("mixamorig:Head");
    const chest = bone("mixamorig:Spine2");
    const hips = bone("mixamorig:Hips");
    const legL = bone("mixamorig:LeftUpLeg");
    const legR = bone("mixamorig:RightUpLeg");
    const rightHand = bone("mixamorig:RightHand");

    // hitboxes invisíveis presas a bones: material.visible=false não renderiza,
    // mas Raycaster não checa visibilidade — o contrato do WeaponSystem se mantém
    const invisMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = (
      parent: THREE.Bone | null,
      geo: THREE.BufferGeometry,
      offset: [number, number, number],
      zone: "head" | "body",
    ): void => {
      if (!parent) return;
      const m = new THREE.Mesh(geo, invisMat);
      m.position.set(...offset);
      m.userData = { enemyId, zone };
      parent.add(m);
      this.hitMeshes.push(m);
    };
    hitbox(head, new THREE.SphereGeometry(0.115, 8, 6), [0, 0.08, 0], "head");
    hitbox(chest, new THREE.BoxGeometry(0.36, 0.4, 0.26), [0, 0.02, 0], "body");
    hitbox(hips, new THREE.BoxGeometry(0.34, 0.3, 0.26), [0, 0, 0], "body");
    hitbox(legL, new THREE.BoxGeometry(0.15, 0.55, 0.18), [0, -0.25, 0], "body");
    hitbox(legR, new THREE.BoxGeometry(0.15, 0.55, 0.18), [0, -0.25, 0], "body");

    if (rightHand) {
      this.muzzle.position.set(0, 0.02, 0.35);
      rightHand.add(this.muzzle);
    } else {
      this.muzzle.position.set(0, 1.3, 0.4);
      this.object.add(this.muzzle);
    }

    const action = (name: string, weight: number): THREE.AnimationAction => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) throw new Error(`clip de animação ausente: ${name}`);
      const a = this.mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(weight);
      return a;
    };
    this.actions = {
      idle: action("Idle", 1),
      walk: action("Walk", 0),
      run: action("Run", 0),
    };
  }

  update(dt: number, state: EnemyVisualState): void {
    if (this.dead) {
      this.mixer.update(dt);
      return;
    }
    const w = gaitWeights(state.speed);
    this.actions.idle.setEffectiveWeight(w.idle);
    this.actions.walk.setEffectiveWeight(w.walk);
    this.actions.run.setEffectiveWeight(w.run);
    // cadência ∝ velocidade (aceite RM-05: pés coerentes com a velocidade)
    this.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(state.speed / 1.8, 0.5, 1.7));
    this.actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(state.speed / 4.5, 0.6, 1.6));
    this.mixer.update(dt);

    // mira aditiva no tronco durante COMBAT (PRD RM-05: bone Spine)
    const aimTarget = state.aiming ? 1 : 0;
    this.aimK += (aimTarget - this.aimK) * Math.min(1, dt * 8);
    const pitch = clampAimPitch(state.pitch) * this.aimK;
    if (this.spine) this.spine.rotation.x -= pitch;
    if (this.spine1) this.spine1.rotation.x -= pitch * 0.5 + state.crouch * 0.45;
    // agachar na cobertura: abaixa o corpo (sem clip de agachar no rig)
    this.object.position.y = -state.crouch * 0.32;

    this.updateFlash(dt);
  }

  /** Glow de dano (hit react leve): intensidade 0..1 sobre todos os materiais. */
  setDamageGlow(intensity: number): void {
    for (const m of this.materials) {
      m.emissive.setRGB(1, 0.19, 0.12);
      m.emissiveIntensity = intensity;
    }
  }

  /** Clip de morte procedural: queda de costas sobre a base do rig. */
  startDeath(): void {
    if (this.dead) return;
    this.dead = true;
    this.actions.idle.stop();
    this.actions.walk.stop();
    this.actions.run.stop();
    const { times, quats, duration } = deathQuatSamples(this.model.quaternion.clone(), 6);
    const clip = new THREE.AnimationClip("death", duration, [
      new THREE.QuaternionKeyframeTrack("Character.quaternion", times, quats),
    ]);
    const action = this.mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
  }

  private updateFlash(dt: number): void {
    if (this.flash <= 0) return;
    this.flash = Math.max(0, this.flash - dt);
    if (this.flash === 0) {
      this.setDamageGlow(0);
      return;
    }
    this.setDamageGlow((this.flash / FLASH_TIME) * 0.9);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.hitMeshes.length = 0;
    for (const m of this.materials) m.dispose();
  }
}
