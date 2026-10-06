# Avaliação — Stage V3

**Data:** 2026-10-05
**Veredito:** concluída
**Confiança da avaliação:** alta

## Resumo executivo
A Fase V3 (cidade destruída, PRD v2 RM-03/RM-04) está materialmente entregue no código: cascos destruídos autorados com aberturas reais e dano determinístico, 14 modelos glTF CC0 pré-carregados como P1 com fallback, entulho instanciado, decals, colliders por manifesto e auditoria de BoxGeometry zerada. Os gates declarados (build, vitest 38/38, lint, traverse, screenshots) têm evidência no disco. As divergências encontradas são adaptações documentáveis ou subcontagens a favor do builder, nenhuma bloqueante para a V4.

## Cobertura de requisitos
- Atendido: kit de prédios destruídos (`src/game/world/BuildingKit.ts` + `src/game/data/city.ts` `CITY_RUINS`, seeds 11–28 = 18 cascos, não 12): paredes por `ExtrudeGeometry` com buracos reais de janela/porta, topo demolido por seed, lajes parciais, vergalhões (`CylinderGeometry` fina, não caixa), chapas corrugadas com relevo senoidal; materiais PBR fotográficos (brick/worn-brick/plaster/block + scuffed_cement + rusty_corrugated_iron), todos com 4 mapas presentes em `public/game-assets/textures/`.
- Atendido: armazém danificado — paredes `buildPlainWall` + telhado corrugado rasgado em 3 segmentos (`buildWarehouseRoof`) + pilares; colliders de pilares e muros em `Level.getLevelColliders()`.
- Atendido: props/veículos PBR — 14 tipos glTF em `public/game-assets/models/*.glb` (confere com `PROP_MODEL_URLS`), 26 posicionamentos em `CITY_PROPS` + caixotes/barreiras/barris via `addProp`; pré-carga P1 com `preloadCityAssets` em `GameCanvas.tsx:109` (falha → omitido, `addProp` retorna null — PRD §4.4).
- Atendido: entulho instanciado (`Debris.ts`, 17 clusters em `DEBRIS_CLUSTERS`, `InstancedMesh` por cluster, base em `heightAt`) e decals (`Decals.ts`, `SCORCH_SPECS` + `POCK_SPECS`, `polygonOffset`, `heightAt` no chão).
- Atendido: colliders por manifesto — `getCityRuinColliders()` (4 AABBs de parede por casco, base em `heightAt`, conservador sem descontar janelas) + `getCityPropColliders()` + muros/pilares/barreiras/barris em `getLevelColliders()` (`Level.ts:57-96`); contrato `getValidationColliders()` mantido.
- Atendido: zero BoxGeometry de cenário renderizado — `Level.ts` não instancia nenhum `BoxGeometry` (grep: só a linha da auditoria); `ValidationScene.ts` mantém caixas mas só `getValidationColliders()` é importado, `buildValidationScene` não é chamado pelo `Level`.
- Atendido: gates de evidência — `build OK` (última entrada `/tmp/observability/build-errors.log` 2026-10-05T20:12:14Z), screenshots em `/tmp/browser/v3-audit/` (12 arquivos: menu, intro, 4 vistas + teleporte), CREDITS.md com as 6 texturas + 14 modelos + HDRI, `report.json` 41,32 MB / 120 MB (primeiro frame 18,03 / 40 MB).
- Parcial: veículos — RM-04 pedia 2–3 carros + 1 caminhão/blindado; entregue 1 modelo (`covered_car`) instanciado 2× como cobertura com collider. Silhueta e material cumprem o anti-objetivo (nada de blocos), mas variedade de frota fica abaixo do texto do PRD.
- Parcial: testes — 38/38 sem regressão, mas nenhum teste novo da V3 (sem cobertura para `ruinColliders`, `normalizeProp`, `heightAt` dos cascos). Consistente com o código (só 4 arquivos `.test.ts`), mas o gate "vitest verde" mede não-regressão, não cobertura da fase.

## Qualidade do código
Pontos fortes:
- Separação correta: `city.ts` TS puro (dados + AABBs puras, `heightAt` como única dependência de terreno); `BuildingKit/Props/Debris/Decals` browser-only consumidos só pelo `Level` (client-only); sem `window` em module scope (decals usam `document` dentro de função chamada em runtime, não no import).
- Determinismo: `mulberry32(seed)` por casco/parede/cluster — dano reproduzível; `mkHoles`/`topProfile` com seeds derivadas por parede (`seed + i*7`).
- Física e visual na mesma fonte: cascos posicionados em `heightAt`, colliders de ruína com `baseY = heightAt` — atende a recomendação nº 3 do eval V2 para peças novas.
- `normalizeProp`: base realinhada a y=0, escala uniforme por eixo declarado, sombras ligadas, `heightAt` como y padrão — convenção limpa para props futuros.
Pontos de atenção:
- `cityAssets.ts:59-92` — `normalizeProp` muta o `gltf.scene` compartilhado (scale/position) e depois clona; na prática converge (2ª chamada mede o já-normalizado e escala ~1), mas é frágil: um `size` diferente para o mesmo `id` no futuro normaliza sobre o já-escalado. Clonar antes de normalizar seria robusto.
- `Debris.ts:35-40` — `debrisMat` em module scope com `map: null` e `initDebrisMaterial` com early-return se já carregado; textura carregada via `TextureLoader` fora do `AssetLoader` (sem cache/controle de erro) — se o jpg faltar, material fica cinza sólido silencioso.
- `Decals.ts:87-98` — um `Material` novo por pockmark (12 materiais para 12 marcas) em vez de compartilhar por textura como faz o scorch; desperdício pequeno, mas vira padrão ruim se a lista crescer.
- Colliders de barreiras/barris (`Level.ts:64-84`) ainda usam `minY: 0` fixo — débito herdado do eval V2 nº 3, intacto; hoje todos estão dentro do complexo plano, sem impacto.

## Discrepâncias
- Status diz "12 ruínas manifesto em `CITY_RUINS`": o código tem 18 specs (seeds 11–28). Sobre-entrega, não falta — o número do status está defasado.
- Status diz "14 modelos glTF ... posicionados por manifesto (`CITY_PROPS`)": correto como 14 tipos, mas `CITY_PROPS` tem 26 posicionamentos + caixotes/barreiras/barris fora dele via `addProp` direto. Leitura cuidadosa, não divergência.
- Auditoria `auditBoxes = 0 (215 malhas)`: o loop (`Level.ts:513-516`) conta só `levelMeshes`, que exclui terreno, underlay, céu, poças, decals e os `addProp` diretos de caixotes/barreiras/barris (retorno ignorado nas linhas 241-255 e 288-314, vão só para `hitMeshes`). O veredito "zero BoxGeometry" confere por inspeção (nenhum `new BoxGeometry` no caminho de render do `Level`), mas a auditoria não cobre a cena inteira como o nome sugere.
- Kit "modular" é procedural autorado (extrusões + merge), não peças glTF externas como o PRD RM-03 descreve literalmente ("Kit modular glTF"). A intenção (silhuetas autorais, buracos atravessáveis pela luz, nada de caixas pintadas, PBR fotográfico) está cumprida; a forma (código gera geometria em vez de carregar kit) é uma adaptação não declarada no status.
- Decals usam planos `CircleGeometry` com `polygonOffset`, não `DecalGeometry` como cita o PRD. Adaptação equivalente e mais barata; sem impacto.
- Cilindros/esferas primitivos permanecem no cenário (pilares do armazém, pernas da torre, beacons, lampadas). A letra do gate ("zero BoxGeometry") permite; registrar que "zero primitivas" nunca foi o requisito.

## Riscos para as próximas etapas
1. V4 (EnemyVisual skinned) fará raycast contra `hitMeshes` agora muito maior (cascos + 26 props + debris excluído por sorte + decals incluídos?): decals e `hitMeshes?.push` em `addProp`/`buildRuin` colocam planos de decal e cada malha de prop na lista de tiro — custo de raycast por disparo sobe; revisar se decals devem entrar em `hitMeshes` antes da V4.
2. Sem testes da V3, a V4 ancora colliders/posições em dados nunca travados por teste — um ajuste de manifesto que quebre cobertura da IA passa silencioso. Um teste puro para `ruinColliders`/`getCityPropColliders` (AABBs contêm a planta, base = `heightAt`) é barato e trava regressão.
3. Shadow-camera estática (±60 m, débito V1/V2) agora cobre 18 cascos + debris; serrilhamento/vazamento de sombra tende a piorar — manter dono explícito (V7 ou medição desktop).
4. `runAssetQueue` P1 sem timeout/retry visível: se um GLB travar, o `buildLevel` atrasa (preload antes do nível). Hoje os 14 existem, mas um 404 futuro vira loading preso em vez de omissão — confirmar comportamento de erro do `loadGLB` antes da V5 (mais GLBs).

## Recomendações
1. Corrigir o status V3 para "18 cascos" (ou declarar quais 12 contam como principais) para não confundir a V7 na contagem do aceite global ("pelo menos 4 estruturas" — largamente cumprido de qualquer forma).
2. Na V4: alargar a auditoria para `scene.traverse` real (ou documentar que é amostral); incluir/excluir `hitMeshes` de decals explicitamente.
3. Adicionar 2–3 testes puros de `city.ts` (contagem de colliders por casco, AABB contém planta, prop-collider rotacionado envolve o centro) — 30 minutos, trava a base da V4.
4. Registrar como decisão a adaptação "kit procedural autorado em vez de glTF externo" (D-nova) para fechar a divergência literal com o PRD RM-03.

## Evidências consultadas
- docs/planning/stages/stage-V3-status.md
- docs/planning/stages/stage-V3-monitor-ack.md
- docs/planning/stages/stage-V1-status.md, stage-V2-status.md
- docs/planning/reports/stage-V1-eval.md (não reavaliado), stage-V2-eval.md
- .opencode/prd-project1.md (§4.4, §5 RM-03/RM-04, §8 Fase V3, §10 Gates)
- .opencode/roadmap-proj.md (Fase V3)
- docs/planning/PRD.md, docs/planning/ROADMAP.md (contexto v1, sem conflito)
- src/game/world/BuildingKit.ts (598 linhas), Level.ts (532), Props.ts (64), Debris.ts (92), Decals.ts (121)
- src/game/data/city.ts (476), src/game/assets/cityAssets.ts (93)
- src/components/game/GameCanvas.tsx:95-130 (preload P1 antes do buildLevel)
- rg BoxGeometry em src/game (só ValidationScene/validação, Viewmodel/Effects/Targets/Enemy — fora do cenário)
- public/game-assets/models/ (14 .glb), public/game-assets/textures/ (7 dirs PBR com 4 mapas), CREDITS.md (linhas 9-28), scripts/assets/report.json (41,32/120 MB)
- /tmp/browser/v3-audit/ (12 screenshots), /tmp/observability/build-errors.log (build OK 20:12:14Z)
- Gates build/vitest/lint/Playwright não re-executados pelo monitor neste turno (verificação estática + evidências em disco)
