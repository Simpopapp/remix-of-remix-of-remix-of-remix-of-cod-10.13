# Stage V3 — Cidade destruída
Status: entregue (gates fechados em 2026-10-05; aguardando avaliação do monitor)
Date: 2026-10-05

## Entregue
- Kit modular de prédios destruídos (`src/game/world/BuildingKit.ts`): cascos autorados com Shapes extrudados (paredes com aberturas irregulares, rebar, lajes rasgadas), 12 ruínas manifesto em `src/game/data/city.ts` (`CITY_RUINS`) com materiais PBR (block/brick/plaster/worn-brick), dano por seed determinístico; armazém danificado com telhado corrugado rasgado + pilares.
- Props e veículos PBR: 14 modelos glTF CC0 em `public/game-assets/models/` (carro coberto, barreiras, barris, caixotes, pneus, cercas...) posicionados por manifesto (`CITY_PROPS`), normalizados (`cityAssets.ts`), com fallback P1 (prop que falha é omitido).
- Entulho instanciado (`Debris.ts`) e decals de fuligem/impacto (`Decals.ts`).
- Colliders por manifesto: `getCityRuinColliders()` + `getCityPropColliders()` + muros/pilares derivados dos specs em `Level.getLevelColliders()`.
- Auditoria traverse embutida: `scene.userData.auditBoxes` conta BoxGeometry de cenário.

## Gates
- build: OK (exit 0 — /tmp/observability/build-errors.log)
- vitest: 38/38
- lint: OK — `eslint src`: 0 erros (288 erros de formatação prettier da V3 corrigidos com --fix; 6 warnings pré-existentes shadcn)
- auditoria traverse: auditBoxes = 0 (215 malhas; zero BoxGeometry de cenário — BoxGeometry restante só em ValidationScene.ts, colliders/validação, não renderizado)
- Playwright /play: 0 erros de console; screenshots em /tmp/browser/v3-audit/ (menu com silhuetas dos cascos, vistas leste/norte/sul/torre via teleporte do player + lookAtPoint)
- Observação: screenshots in-game plenos são limitados no ambiente headless (pointer lock sai ao capturar via CDP); evidência visual principal = menu + cena ao fundo e auditoria numérica da traverse.

## Próximo
- Fase V4 (inimigos skinned): EnemyVisual com mixer/blend por velocidade, mira no spine, hitboxes por bone, arma no bone, clips de morte.
