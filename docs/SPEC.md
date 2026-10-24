# peopleRank — Especificación para Claude Code

## Contexto

Web para que un grupo de amigos del bachillerato clasifique, durante una llamada, a la gente de su curso por popularidad. Uso privado y pequeño: ≤10 votantes simultáneos y ≤150 personas por sala.

Repositorio (vacío): https://github.com/Luigiverde4/peopleRank

Trabaja de forma autónoma siguiendo las fases de abajo. No te detengas a preguntar. Si algo es ambiguo, toma la decisión más simple y razonable y apúntala en `docs/DECISIONS.md`.

## Modelo de ranking

- **Tablero 2D cuadrado:**
  - Eje Y: popularidad global en el curso (abajo = baja, arriba = alta).
  - Eje X: popularidad dentro de su grupo, relativa (izquierda = periferia, derecha = centro del grupo).
- **Grupos de amigos:** relación N:M (una persona puede estar en varios grupos). No son un eje.
  - Se representan como color de la ficha. Si una persona tiene varios grupos, el anillo se segmenta (p. ej. con `conic-gradient`).
  - También funcionan como filtro: se atenúa a quien no pertenece a los grupos seleccionados.
- **Un tablero por participante:** cada uno coloca a las personas en el suyo y nadie edita el tablero de otro.
- **Agregación:**
  - Posición de consenso = mediana de x y mediana de y de cada persona, entre los participantes que la han colocado.
  - Dispersión = raíz de la media de las distancias al cuadrado de cada voto al punto de consenso.
- **Modo ciego:**
  - Mientras la sala no esté revelada, cada participante solo ve sus propias colocaciones.
  - El creador de la sala pulsa "Revelar" y todos ven todo.
  - Debe aplicarse en servidor (RLS), no solo en la UI.

## Stack

- **Frontend:** Vite + React + TypeScript (strict), React Router (modo librería), Zustand para el estado de cliente y Tailwind para estilos.
- **Supabase:** Postgres, Realtime (Presence, Broadcast, Postgres Changes), Storage y auth anónima, con `@supabase/supabase-js` v2.
- **Tests:** Vitest para la lógica pura.
- **Despliegue previsto:** Vercel, como SPA estática. No necesita funciones serverless.
- Usa las versiones estables actuales de las dependencias. Antes de escribir esa parte, verifica en la documentación oficial la API vigente de supabase-js y de Supabase Realtime.

## Convenciones

- **Estilo de código:**
  - Prioriza código mantenible y legible antes que ingenioso: funciones pequeñas y nombres explícitos.
  - Identificadores y comentarios en inglés; textos de la UI en español.
- **Organización:**
  - Los componentes no llaman a Supabase directamente; todo acceso a datos pasa por `src/data/`.
  - La lógica de métricas va en `src/lib/metrics.ts`, como funciones puras y testeadas.
- **Entorno:** el desarrollador usa Windows + VSCode. Los scripts de npm deben ser multiplataforma (nada de `rm -rf`, `export VAR=`, etc.).
- **Commits:**
  - Antes de cada commit, `npm run typecheck`, `npm run test` y `npm run build` deben pasar en verde.
  - Haz un commit (o pocos) por fase, con mensajes estilo Conventional Commits.
- **CLAUDE.md:** crea uno breve con estas convenciones y un puntero a este documento.
- **Límites:**
  - No despliegues, no crees recursos en la nube y no pidas credenciales.
  - Lo que requiera la cuenta del usuario (Supabase, Vercel) se documenta en `docs/DEPLOY.md`.

## Modelo de datos (Postgres)

Coordenadas normalizadas en [0, 1], independientes del tamaño de pantalla, con y = 1 arriba.

- `rooms`: id uuid pk, slug text unique (nanoid ≥ 12 caracteres), name text, created_by uuid (auth.uid), revealed boolean default false, created_at.
- `participants`: id uuid pk, room_id fk, user_id uuid (auth.uid), display_name text, person_id uuid null fk → people, created_at. Restricción unique(room_id, user_id).
  - `person_id` indica qué persona de la lista es este participante; se usa para la autopercepción.
- `people`: id uuid pk, room_id fk, name text, photo_path text null, created_at.
- `groups`: id uuid pk, room_id fk, name text, color text (hex), created_at.
- `person_groups`: person_id fk, group_id fk, room_id fk, pk(person_id, group_id).
  - `room_id` es redundante; está para poder filtrar en Realtime.
- `placements`: participant_id fk, person_id fk, room_id fk, x real, y real (check 0..1), updated_at, pk(participant_id, person_id).
- Todas las fk con `on delete cascade` e índices por `room_id`.

## Seguridad (RLS)

Activa RLS en todas las tablas.

- **Función de pertenencia:** `is_room_member(room uuid) returns boolean`, `security definer` y con `search_path` fijado. Devuelve true si existe un participante con ese room_id y user_id = auth.uid().
- **`rooms`:**
  - Select solo para miembros.
  - Sin insert/update directo, salvo `revealed`, que solo puede cambiar `created_by`.
- **Altas mediante RPC `security definer`** (así una sala no se puede listar sin conocer el slug):
  - `create_room(name text, display_name text)`: crea la sala y el participante creador, y devuelve el slug.
  - `join_room(slug text, display_name text)`: crea el participante (o lo devuelve si ya existe) y devuelve la sala.
- **`people`, `groups`, `person_groups`:** select, insert, update y delete para miembros de la sala.
- **`participants`:** select para miembros; update solo de la propia fila (display_name, person_id).
- **`placements`:**
  - Insert, update y delete solo si el participante pertenece a auth.uid().
  - Select de las propias siempre; las de otros, solo si `rooms.revealed = true`.
- **Auth anónima de Supabase:** habilitada, también en `supabase/config.toml` para local.
- **Storage:**
  - Bucket `photos` público (uso privado; se prima la simplicidad sobre las URLs firmadas).
  - Rutas `{room_id}/{uuid}.webp`.
  - Escritura solo para miembros de la sala, comprobando el `room_id` de la primera carpeta de la ruta.

## Tiempo real

Un canal por sala: `room:{room_id}`.

- **Presence:** `{ participant_id, display_name }`, para mostrar la lista de conectados en la UI.
- **Broadcast `drag`:**
  - Envía `{ participant_id, person_id, x, y }` durante el arrastre, limitado a unas 15 actualizaciones por segundo.
  - Solo se emite si la sala está revelada; en modo ciego no se emite nada.
  - Los demás clientes lo muestran como posición provisional en las vistas que enseñan el tablero de ese participante.
- **Al soltar:** upsert en `placements` con actualización optimista local.
- **Postgres Changes:**
  - Escucha `placements`, `people`, `groups`, `person_groups`, `participants` y `rooms`, filtrando por `room_id` donde sea posible.
  - Al recibir cualquier evento de una tabla, vuelve a pedir (con debounce de ~200 ms) esa tabla completa para la sala. El volumen es pequeño y así se evitan los problemas con eventos DELETE sin filtrar y con estados parciales.
  - Añade las tablas a la publicación `supabase_realtime` en la migración.
- **Al revelar:** cuando `revealed` pasa a true, cada cliente vuelve a pedir `placements`.
- **Reconexión:** al recuperar la conexión del canal, refetch completo.

## UI

### Rutas

- `/`: crear sala (nombre de la sala + tu nombre) o unirse pegando un enlace o slug.
- `/r/:slug`: la sala. Si no eres participante, pide un nombre y llama a `join_room`. La sesión anónima la persiste supabase-js.

### Layout de la sala

Diseño pensado primero para escritorio pero usable en móvil, con Pointer Events para ratón y pantalla táctil.

- **Cabecera:**
  - Nombre de la sala y botón para copiar el enlace.
  - Participantes conectados (Presence).
  - Estado ciego/revelado y botón "Revelar" (solo para el creador).
  - Selector "¿Quién eres en la lista?", que fija el `person_id` del participante.
- **Panel izquierdo, con pestañas:**
  - **Personas:**
    - Añadir pegando nombres, uno por línea; ignora líneas vacías y duplicados según el nombre normalizado.
    - Renombrar, borrar y asignar grupos con multiselección.
    - Foto (fase 4).
  - **Grupos:**
    - Crear, renombrar, cambiar color y borrar.
    - Atajo: pegar `Grupo: nombre1, nombre2, ...` para crear y asignar en bloque.
- **Centro: tablero cuadrado** con ejes rotulados y cuadrícula suave.
  - Cada ficha es un círculo con iniciales (o foto) y el anillo de color de sus grupos; el nombre aparece en tooltip o etiqueta.
  - Junto al tablero hay una bandeja de personas "sin colocar". Se arrastra desde ahí al tablero, y arrastrar una ficha fuera del tablero la devuelve a la bandeja y borra su colocación.
- **Selector de vista:**
  - "Mi tablero": editable.
  - "Consenso": solo lectura. Cada ficha lleva un halo con radio proporcional a su dispersión y muestra su número de votos.
  - "Tablero de X": solo lectura, y solo disponible si la sala está revelada.
- **Navegación:** filtro por grupos (atenúa al resto) y búsqueda por nombre que resalta la ficha.
- **Panel derecho:** estadísticas (fase 3).

### Arrastre

Implementación propia con Pointer Events y `setPointerCapture`, sin librería de drag-and-drop. Las coordenadas se convierten a [0, 1] relativas al tablero.

## Métricas (`src/lib/metrics.ts`, todas con tests)

Entradas: personas, grupos, membresías, participantes y colocaciones.

1. **`consensus`:** por persona, mediana de x, mediana de y, número de votos y dispersión.
2. **`controversial`:** las 10 personas con mayor dispersión entre las que tienen al menos 2 votos.
3. **`selfPerception`:** para cada participante vinculado a una persona, compara su propia colocación con la mediana de los demás (excluyéndole) y calcula la distancia entre ambas.
4. **`ingroupBias`:** para cada participante vinculado a una persona, calcula la media de (mi y − mediana de y de los demás) sobre la gente que comparte grupo conmigo, y le resta la misma media calculada sobre la gente que no. Un valor positivo significa que favorece a su gente.
5. **`voterAffinity`:** matriz participante × participante con la distancia media entre sus colocaciones de las personas que ambos han colocado. Requiere al menos 5 personas en común (si no, null). Se muestra como similitud.
6. **`groupStats`:** por grupo, tamaño y media de x e y de consenso.
7. **`bridges`:** personas con 2 o más grupos, ordenadas por su grado en el grafo proyectado (número de personas distintas con las que comparten al menos un grupo).

Las métricas que comparan votantes solo se muestran si la sala está revelada.

## Fases

Ejecútalas en orden. Al acabar cada fase:
1. Pasa tests, typecheck y build.
2. Haz el commit.
3. Actualiza `docs/PROGRESS.md` con lo hecho, lo pendiente y los problemas conocidos.

### Fase 1 — Local, sin backend

- Scaffold de Vite + React + TS + Tailwind + Vitest + ESLint.
- `src/data/` con una implementación en memoria (persistida en localStorage) de las operaciones de personas, grupos, membresías y colocaciones de un único participante local.
- Tablero, bandeja, editor de personas y grupos, filtro y búsqueda.
- **Criterio de aceptación:** se pueden pegar 60 nombres, crear grupos, colocar a todos y recargar la página sin perder nada.

### Fase 2 — Supabase y multiusuario

- **Migraciones y datos de prueba:**
  - Ejecuta `npx supabase init`.
  - Crea la migración `supabase/migrations/<timestamp>_init.sql` con tablas, índices, RLS, funciones RPC, publicación realtime y bucket.
  - Crea `supabase/seed.sql` con una sala de demo: unos 40 nombres ficticios, 5 grupos y 3 participantes con colocaciones.
- **Verificación local:**
  - Si Docker está disponible, ejecuta `npx supabase start` y aplica las migraciones.
  - Verifica las políticas RLS con un script de prueba usando dos usuarios anónimos. Comprueba que no ven las colocaciones del otro antes de revelar, que sí las ven después y que no pueden escribir colocaciones ajenas.
  - Si Docker no está disponible, déjalo indicado en `PROGRESS.md` y continúa.
- **Capa de datos:** implementación Supabase de `src/data/`. La de memoria puede quedarse como modo demo offline, seleccionable por variable de entorno.
- **Funcionalidad:** rutas `/` y `/r/:slug`, auth anónima, crear y unirse a salas, Presence, Postgres Changes, Broadcast del arrastre y modo ciego/revelar.
- **Configuración:** `.env.example` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Es la clave pública; en proyectos antiguos se llama anon key.
- **Criterio de aceptación:**
  - Dos navegadores (uno en incógnito) en la misma sala ven en tiempo real los cambios de personas y grupos.
  - Las colocaciones ajenas solo aparecen tras revelar.

### Fase 3 — Agregación y estadísticas

- Vista de consenso, vista de tablero ajeno y panel de estadísticas con las métricas anteriores.
- **Criterio de aceptación:**
  - Con el seed, todas las métricas muestran valores coherentes.
  - Los tests cubren los casos borde: persona sin votos, un solo votante, participante sin persona vinculada y grupos vacíos.

### Fase 4 — Extras (solo si las fases 1–3 están completas y en verde)

- **Fotos:** subida con redimensionado en cliente a 256×256 en WebP (vía canvas) al bucket `photos`.
- **Vista de grafo:** personas como nodos, aristas por grupo compartido y color por grupo (`react-force-graph-2d` o similar).
- **Exportación:** el tablero visible a PNG.

## Despliegue (solo documentar, no ejecutar)

- **`vercel.json`:** rewrite de todas las rutas a `/index.html` (SPA con React Router).
- **`docs/DEPLOY.md`:** pasos para Windows:
  1. Crear el proyecto en Supabase.
  2. Ejecutar `npx supabase link` y `npx supabase db push`.
  3. Activar la auth anónima y comprobar el bucket.
  4. Importar el repo en Vercel y configurar las variables de entorno.
  5. Incluir un aviso: los proyectos gratuitos de Supabase se pausan tras una semana sin actividad, así que hay que reactivarlos desde el dashboard antes de usarlos.
- **`README.md`:** qué es, cómo arrancar en local (con y sin Supabase) y los scripts disponibles.
