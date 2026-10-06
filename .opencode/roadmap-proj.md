# Roadmap v2 — PROJECT1 Salto Visual AAA
> Derivado de `.opencode/prd-project1.md`. Ordem por dependência. Marcar [x] + linha de Gates.

## Fase V1 — Pipeline de assets e iluminação física ✅
- [x] AssetLoader: texturas PBR + HDRI com cache; GLTF/Draco local + progresso agregado (P0/P1)
- [x] CREDITS.md criado; script/manifest (`scripts/assets/`, report: 4,04 MB total / 3,02 MB primeiro frame)
- [x] HDRI + PMREM feito; LUT, GTAO, SMAA, presets de qualidade (Baixo–Ultra, persistidos, UI de pausa)
- [x] Chão com material PBR fotográfico (asphalt_02, Poly Haven)
- Gates: build OK + vitest 28/28 + assets OK + lint OK + Playwright /play (0 erros de consola, screenshots antes/depois) — ver docs/planning/stages/stage-V1-status.md e reports/stage-V1-eval.md (veredito: concluída)

## Fase V2 — Terreno com relevo
- [x] Terrain.ts heightmap + splat 4 camadas (`terrainField.ts` puro + `Terrain.ts` browser-only; asfalto/terra/cascalho/lama Poly Haven CC0)
- [x] heightAt() no Player (testes de rampa/cratera) e na IA (spawn, moveToward, LOS por relevo, cobertura)
- Gates: build OK (exit 0) + vitest 38/38 + assets OK (12,69 MB/120; primeiro frame 3,02/40); lint OK (`eslint src`: 0 erros, 6 warnings shadcn) + Playwright /play OK (0 erros de console, screenshots /tmp/browser/v2-phase2) — status em `docs/planning/stages/stage-V2-status.md`

## Fase V3 — Cidade destruída ✅
- [x] Kit modular de prédios destruídos + armazém danificado
- [x] Props e veículos queimados PBR; entulho instanciado; decals
- [x] Colliders por manifesto; zero BoxGeometry de cenário
- Gates: build OK + lint OK (0 erros após --fix) + vitest 38/38 + auditoria traverse (auditBoxes=0/215 malhas) + screenshots /tmp/browser/v3-audit — status em `docs/planning/stages/stage-V3-status.md`

## Fase V4 — Inimigos skinned ✅
- [x] EnemyVisual com mixer/blend por velocidade, mira no spine
- [x] Hitboxes por bone, arma no bone, clips de morte
- Gates: build OK (tsc 0) + lint OK (0 erros) + vitest 47/47 + Playwright estados de animação OK (0 erros de console; 40 hit meshes; morte verificada) — ver docs/planning/stages/stage-V4-status.md e reports/stage-V4-eval.md. Fix: convenção de nomes de bone (`boneNameVariants`).

## Fase V5 — Armas e mãos FPS
- [ ] ViewmodelV2 glTF com braços, câmera de viewmodel
- [ ] Recarga/troca animadas, flash flipbook, cápsulas
- Gates: build + lint + vitest + close-up ADS

## Fase V6 — VFX, helicóptero, atmosfera
- [ ] Fumaça, fogo, poeira, impactos por material
- [ ] Helicóptero realista com rotor e spline (ou corte D-03)
- Gates: build + lint + vitest + screenshot sem HUD

## Fase V7 — Otimização e polish
- [ ] LOD, instancing, auditoria draw calls, presets calibrados
- [ ] Remoção do código v1, créditos na UI, áudio samples (opcional)
- Gates: build + lint + vitest + métricas NFR-01 em desktop real

> Nota: assets do jogo ficam em public/game-assets/ — /assets/ pertence ao proxy do OpenCode.
