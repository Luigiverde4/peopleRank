# peopleRank

Especificación completa: [docs/SPEC.md](docs/SPEC.md). Decisiones tomadas: [docs/DECISIONS.md](docs/DECISIONS.md). Estado: [docs/PROGRESS.md](docs/PROGRESS.md).

## Convenciones

- Código mantenible antes que ingenioso: funciones pequeñas, nombres explícitos.
- Identificadores y comentarios en inglés. La UI está en español e inglés: ningún texto visible va escrito en un componente; se añade a `src/i18n/es.ts` y `src/i18n/en.ts` (el tipo `Messages` obliga a tener los dos) y se lee con `useT()`.
- Los errores que puede ver el usuario se lanzan como `AppError` con un código (`src/lib/appError.ts`) y la UI los traduce con `describeError`.
- Los componentes no llaman a Supabase: todo acceso a datos pasa por `src/data/` (interfaz `DataBackend`), y los componentes usan los stores de `src/store/`.
- Las métricas van en `src/lib/metrics.ts` como funciones puras con tests (Vitest).
- Scripts de npm multiplataforma (el desarrollador usa Windows + VSCode): nada de `rm -rf` ni `export VAR=`.
- Antes de cada commit: `npm run typecheck`, `npm run test` y `npm run build` en verde (y `npm run lint`).
- Commits estilo Conventional Commits, uno o pocos por fase.
- No desplegar, no crear recursos en la nube, no pedir credenciales. Lo que requiera cuentas va en `docs/DEPLOY.md`.

## Notas técnicas

- TypeScript fijado a `~6.0` porque `typescript-eslint` aún no soporta TS 7.
- Coordenadas del tablero normalizadas en [0, 1] con y = 1 arriba (`src/lib/geometry.ts`).
