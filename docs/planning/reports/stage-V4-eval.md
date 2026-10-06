# Avaliação — Stage V4

**Data:** 2026-10-06
**Veredito:** concluída
**Confiança da avaliação:** alta

## Resumo executivo
A Fase V4 está implementada e verificada em runtime: os 8 inimigos da missão usam o rig skinned (Soldier.glb) com blend de animação por velocidade, mira no tronco, 5 hitboxes por inimigo ancoradas em bones, muzzle no bone da mão direita e clip de morte procedural. Durante a verificação foi descoberto e corrigido um bug que deixava a fase funcionalmente quebrada (hitboxes nunca ancoravam por causa da convenção de nomes de bone do GLB).

## Cobertura de requisitos
- Atendido:
  - EnemyVisual com mixer e blend idle/walk/run por velocidade (pesos em `enemyVisualMath.gaitWeights`, cadência ∝ velocidade) — `src/game/ai/EnemyVisual.ts`.
  - Mira no spine: rotação aditiva em `mixamorig:Spine`/`Spine1` durante COMBAT, com easing e clamp ±0,6 rad.
  - Hitboxes por bone: cabeça (esfera), tronco, quadril e pernas com `userData { enemyId, zone }`; 5 por inimigo (40 no total, zonas `head`/`body`).
  - Arma no bone: muzzle ancorado em `mixamorigRightHand` (modelo da arma em si é Fase V5).
  - Clips de morte: procedural (`deathQuatSamples`), sem ragdoll, clamp no fim.
  - Limite de 12 skinned + fallback para corpo composto em `Director.createVisual` (PRD RM-05).
- Parcial: nada.
- Ausente: nada no escopo desta fase.

## Qualidade do código
- Pontos fortes: matemática pura isolada em `enemyVisualMath.ts` (testável); contratos preservados (`userData`, `hitMeshes`, `muzzle`); fallback P1 robusto em qualquer falha de carga/instanciação; materiais clonados por instância permitem flash de dano individual.
- Ponto de atenção (resolvido nesta fase): a busca de bones aceitava apenas `mixamorig:Spine`; o GLB do projeto usa `mixamorigSpine`. Corrigido com `boneNameVariants()` (2 novas entradas de teste: 47/47).

## Discrepâncias
- O código da fase já existia no repositório antes desta sessão (artefato do remix), mas o status não estava registrado e o roadmap estava aberto. Além disso, o estado pré-correção deixava a fase **incompleta na prática**: sem hitboxes ancoradas, o WeaponSystem não acertava nenhum inimigo. A correção é o que torna a fase concluída.
- Na verificação de morte, a captura após 1,4 s mostrou rotação ~39° (não o fim do clip de 0,8 s): provável throttle de frames no browser headless/software. O clip anima e se move corretamente; o clamp final não foi observado diretamente (confiança média apenas neste ponto).

## Riscos para as próximas etapas
- Fase V5 (viewmodel/mãos FPS): o muzzle já está ancorado; o modelo da arma dos inimigos deve seguir o mesmo padrão de nomes de bone — reutilizar `boneNameVariants`.
- O cabeçalho do EnemyVisual comenta o fallback como "corpo composto de blocos (código da Fase 4)" — adequado; se a fase V7 remover o código v1, o fallback deve sobreviver (é intencional, não código v1).

## Recomendações
- Nenhuma bloqueadora. Observar o clamp final do clip de morte em desktop real quando V7 fizer os presets calibrados.

## Evidências consultadas
- `docs/planning/ROADMAP.md` (Fase V4), `docs/planning/PRD.md` (RM-05, D-05), `.opencode/prd-project1.md`
- `src/game/ai/EnemyVisual.ts`, `src/game/ai/Enemy.ts`, `src/game/ai/Director.ts`, `src/game/ai/enemyVisualMath.ts` + testes, `src/game/assets/soldierAssets.ts`
- `public/game-assets/models/soldier.glb` (567 KB, dentro do orçamento; manifest P1)
- Playwright: 0 erros de console; director com 8 vivos, 40 hit meshes, zonas head/body, muzzle em `mixamorigRightHand`; morte → estado `dead` com rotação do nó `Character` em progressão. Screenshots em `/tmp/browser/v4-audit/`.
