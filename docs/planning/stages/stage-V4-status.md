# Stage V4 — Inimigos skinned

Status: concluída
Date: 2026-10-06

## Entregue

- `src/game/ai/EnemyVisual.ts` — rig Mixamo (Soldier.glb, MIT) via `SkeletonUtils.clone`; mixer com blend idle/walk/run por velocidade (pesos em `enemyVisualMath.gaitWeights`), cadência ∝ velocidade (time-scale por clip).
- Mira aditiva no tronco (bones Spine/Spine1) durante COMBAT com easing (`aimK`), pitch limitado a ±0,6 rad; abaixar na cobertura desloca o corpo (−0,32 m) e curva Spine1.
- Hitboxes invisíveis presas a bones (cabeça esférica, tronco, quadril, pernas) com userData `{ enemyId, zone }`; 5 por inimigo → 40 malhas para 8 inimigos.
- Muzzle ancorado no bone `mixamorigRightHand` (foco do cano para os tiros da IA).
- Flash de dano por instância (materiais clonados + variação de tom de uniforme).
- Clip de morte procedural (`deathQuatSamples`, queda de costas com easeOutCubic, 0,8 s, clampWhenFinished) — sem ragdoll (PRD D-05).
- `Director.createVisual` com limite de 12 skinned (MAX_SKINNED) e fallback para corpo composto em qualquer falha; `Enemy` delega o visual quando presente.
- `preloadSoldier` na fila de assets com progresso agregado (GameCanvas 0.4→0.6).

## Correção nesta fase

- **Bug de nomes de bone:** o GLB em `public/game-assets/models/soldier.glb` usa a convenção `mixamorigSpine` (sem dois-pontos), enquanto o código buscava só `mixamorig:Spine`. Resultado: visual instanciava mas hitboxes/muzzle nunca ancoravam (director.hitMeshes = 0). Corrigido com `boneNameVariants()` em `enemyVisualMath.ts` (cobre as duas convenções Mixamo), com testes.

## Gates

- vitest: 47/47 ✅ (2 novos para boneNameVariants)
- tsc --noEmit: 0 erros ✅
- eslint src: 0 erros, 6 warnings (shadcn, pré-existentes) ✅
- Playwright `/play`: 0 erros de console; 8 inimigos vivos, 40 hit meshes, zonas head/body; muzzle em `mixamorigRightHand`; morte do inimigo 0 → estado `dead`, clip de morte progressão verificada no nó `Character` (rot. ~39° em captura, clip anima e clampa). Screenshots: `/tmp/browser/v4-audit/`
