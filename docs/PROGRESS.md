# Progreso

## Fase 1 — Local, sin backend ✅

Hecho:

- Scaffold: Vite 8 + React 19 + TypeScript 6 (strict, `noUncheckedIndexedAccess`) + Tailwind 4 + Vitest 5 + ESLint 10.
- `src/data/`: interfaz `DataBackend` y backend en memoria persistido en `localStorage` (salas, participantes, personas, grupos, membresías y colocaciones).
- `src/store/`: store de sala (Zustand) con actualizaciones optimistas, refetch por tabla con debounce y throttle del arrastre; store de UI (vista, filtro, búsqueda).
- Tablero cuadrado con ejes rotulados y cuadrícula; fichas con iniciales y anillo de grupos segmentado (`conic-gradient`).
- Arrastre propio con Pointer Events + `setPointerCapture` (ratón y táctil) entre bandeja y tablero; soltar fuera devuelve la ficha a la bandeja.
- Panel de personas (pegar lista, renombrar, borrar, asignar grupos) y de grupos (crear, renombrar, color, borrar, atajo en bloque).
- Filtro por grupos (atenúa) y búsqueda por nombre (resalta).
- Selector "¿Quién eres en la lista?".
- Tests de la lógica pura y del backend en memoria (incluida la persistencia de 60 personas colocadas tras "recargar").

Verificado en el navegador: pegar 60 nombres (con un duplicado ignorado), crear 3 grupos con el atajo, arrastrar desde la bandeja, devolver a la bandeja, recargar con 61 personas colocadas sin perder nada.

## Fase 2 — Supabase y multiusuario ✅

Hecho:

- `npx supabase init`, con la auth anónima activada en `supabase/config.toml`.
- Migración `supabase/migrations/20261024120000_init.sql`: tablas, índices, FKs compuestas, RLS, funciones `is_room_member`, `create_room` y `join_room`, publicación `supabase_realtime` y bucket `photos` con sus políticas.
- `supabase/seed.sql`: sala `demo4bsala2026` con 40 nombres ficticios, 5 grupos y 3 participantes con colocaciones.
- Docker disponible: `supabase start` aplicó migración y seed sin errores. Los tipos se generan con `npm run db:types`.
- `scripts/verify-rls.ts` (`npm run verify:rls`): 29 comprobaciones con tres usuarios anónimos, todas en verde. Incluyen el modo ciego antes y después de revelar, escrituras ajenas rechazadas, Storage, eventos realtime (y su ausencia en modo ciego) y broadcast.
- `src/data/supabaseBackend.ts`: implementación Supabase de `DataBackend`. Se elige con `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`; sin ellas, o con `VITE_DATA_MODE=memory`, se usa la demo offline.
- Rutas `/` (crear sala / unirse con enlace o código) y `/r/:slug` (pide nombre y llama a `join_room` si no eres participante).
- Cabecera: copiar enlace, conectados (Presence), modo ciego/revelado, botón «Revelar» solo para el creador y «¿Quién eres en la lista?».
- Broadcast del arrastre (~15/s, solo con la sala revelada) y vista «Tablero de X» (solo tras revelar) con las posiciones provisionales.
- Botón «Cargar lista …» a partir de `presets/*.local.txt` (ignorado por git).
- `vercel.json`, `docs/DEPLOY.md`, `README.md` y `.env.example`.

Verificado en el navegador con dos usuarios (`localhost` y `127.0.0.1`, cada uno con su sesión anónima): crear sala, cargar los 52 nombres, unirse por enlace, Presence, grupos creados por B que A ve al instante, modo ciego (B no ve nada de A) y revelado (B ve el tablero de A sin recargar).

## Fase 3 — Agregación y estadísticas ✅

Hecho:

- `src/lib/metrics.ts`: `consensus`, `controversial`, `selfPerception`, `ingroupBias`, `voterAffinity`, `groupStats` y `bridges`, como funciones puras.
- 22 tests de métricas con los casos borde: persona sin votos, un solo votante, participante sin persona vinculada, grupos vacíos, grupos sin votos, menos de 5 personas en común y mi persona sin grupos.
- Vista «Consenso» (mediana, halo proporcional a la dispersión y número de votos) y vista «Tablero de X», ambas solo con la sala revelada.
- Panel de estadísticas: grupos y puentes siempre; controversia, autopercepción, sesgo de grupo y matriz de afinidad solo tras revelar.

Verificado con el seed (`/r/demo4bsala2026`):

- Teatro sale como el grupo más popular (70) y Gamers el menos (39).
- Hay 7 puentes (una de cada 6 personas está en 2 grupos).
- La afinidad entre los 3 votantes del seed es alta (86–91), coherente con el poco ruido del seed.
- El sesgo de grupo sale próximo a 0, coherente con un ruido aleatorio.
- Adela y Bruno tienen autopercepción.
- Un participante sin colocaciones aparece con «—».

## Problemas conocidos

- Con más de ~100 fichas el tablero se satura visualmente; la búsqueda y el filtro ayudan a encontrar a alguien.
- El arrastre en vivo entre navegadores se ha verificado con el script (llega el broadcast), no visualmente a mitad de un arrastre.
- **Sesión duplicada (corregido, sin reproducir):** durante las pruebas apareció una vez un segundo usuario anónimo en la misma pestaña. Coincidió con otra pestaña del mismo origen abierta en la sala y con un retraso de 6 s en la auth, compatible con contención del lock de supabase-js. `signIn` trataba un error de `getSession()` como «sin sesión» y creaba otro usuario anónimo. Ahora lanza el error. Al recargar no se volvió a reproducir.
- Tras una recarga en caliente (HMR) de un módulo de datos, la sala puede quedarse en «Cargando sala…» hasta recargar la página. Solo afecta a desarrollo.
- El bundle supera 500 kB sin comprimir (≈150 kB gzip), sobre todo por supabase-js. Es aceptable para el uso previsto.
