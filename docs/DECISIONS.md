# Decisiones

Decisiones tomadas ante ambigüedades de la especificación. La más simple y razonable en cada caso.

## Generales

- **Ubicación de la especificación:** estaba en la raíz como `SPEC.md`; se ha movido a `docs/SPEC.md`, que es donde se la referencia.
- **TypeScript 6.0 en lugar de 7:** `typescript-eslint` (8.x) exige `typescript < 6.1`. Se fija `~6.0.3` (la misma que usa la plantilla oficial de Vite).
- **ESLint en lugar de oxlint:** la plantilla actual de Vite trae oxlint, pero la especificación pide ESLint. Se usa flat config con `typescript-eslint` y los plugins de React Hooks y React Refresh.
- **Confirmación de borrados:** botón de dos pasos ("¿Seguro?") en lugar de `window.confirm`, para no bloquear la página.

## Personas y grupos

- **Nombre normalizado:** sin distinguir mayúsculas, tildes ni espacios repetidos (`normalizeName`). Se usa para detectar duplicados al pegar listas y en el atajo de grupos.
- **Miembros de un grupo:** se eligen desde la pestaña Grupos con un buscador y una lista de casillas de las personas ya añadidas; marcar añade y desmarcar quita, al momento. Al crear un grupo se abre su selector. También se pueden asignar grupos desde cada persona (pestaña Personas).
- **Atajo `Grupo: nombre1, nombre2`:** queda plegado como opción avanzada. Si el grupo ya existe (por nombre normalizado) se reutiliza; si una persona no existe, se crea. Las líneas sin `:` se ignoran.
- **Nombre de la sala opcional:** una sala es una votación, no un curso. Si se deja vacío, se llama «Votación del DD/MM».
- **Colores de grupo:** paleta fija de 10 colores; un grupo nuevo toma el primero no usado.
- **Búsqueda:** coincidencia por subcadena del nombre normalizado. Las fichas que coinciden se resaltan y nunca se atenúan aunque el filtro de grupos las excluya.
- **Filtro de grupos:** con varios grupos seleccionados se muestra a quien pertenece a cualquiera de ellos (unión).

## Tablero

- **Clic sin mover:** un movimiento menor de 4 px no cuenta como arrastre y no escribe nada.
- **Soltar fuera del tablero:** si la ficha estaba colocada, se borra su colocación (vuelve a la bandeja); si venía de la bandeja, no pasa nada.
- **Nombres:** se ven al pasar el ratón, al resaltar por búsqueda o activando la casilla "Nombres".

## Lista de nombres del curso

- **Presets locales:** la lista real del curso no se guarda en el código ni en el seed, porque son nombres de personas reales y el repositorio puede ser público. Va en `presets/*.local.txt`, que está en `.gitignore`. Cada fichero aparece como un botón «Cargar lista …» en el panel de personas, y se pueden seguir añadiendo más personas a mano. En producción se pega la lista una vez y queda en Supabase.

## Base de datos y seguridad (fase 2)

- **`participants.person_id`:** la FK usa `on delete set null (person_id)` en lugar de `cascade`. Borrar a una persona de la lista no debe expulsar al participante vinculado a ella.
- **FKs compuestas `(x_id, room_id)`:** `person_groups`, `placements` y `participants.person_id` referencian `(id, room_id)`. Así es imposible mezclar filas de salas distintas, aunque `room_id` sea redundante.
- **Columnas editables:** se limitan con `GRANT UPDATE (columnas)`. En `rooms` solo `revealed`; en `participants`, `display_name` y `person_id`; en `people`, `name` y `photo_path`; en `groups`, `name` y `color`. En `placements` se concede update completo porque el upsert lo necesita, y RLS lo restringe a las filas propias.
- **Revelar es irreversible desde la UI:** la base permite al creador cambiar `revealed`, pero la UI solo ofrece revelar.
- **Slug:** 14 caracteres `[0-9a-z]` generados en el servidor con `gen_random_bytes` (`generate_slug`).
- **`created_by`:** sin FK a `auth.users`, para no depender del esquema interno de auth.
- **Fotos:** bucket público limitado a `image/webp` y 1 MB. Escritura, actualización y borrado solo para miembros de la sala de la primera carpeta de la ruta.
- **Seed:** la sala de demo `demo4bsala2026` ya está revelada, para que se vean todas las vistas y métricas. Sus 3 participantes son usuarios ficticios; quien se una será un cuarto participante.

## Tiempo real (fase 2)

- **DELETE sin filtro:** Postgres Changes solo puede filtrar DELETE con `replica identity full`, y aun así RLS no se aplica a los DELETE. Se escuchan INSERT y UPDATE filtrados por `room_id` (o por `id` en `rooms`) y DELETE sin filtro. Cualquier evento solo provoca un refetch con debounce de la tabla de la sala, que pasa por RLS.
- **Hueco tras `SUBSCRIBED`:** los cambios de Postgres empiezan a llegar con el mensaje de sistema "Subscribed to PostgreSQL", que llega después de `SUBSCRIBED`. En ambos momentos se hace un refetch completo.
- **Arrastres provisionales:** se descartan en cada refetch de `placements`. Un arrastre activo se reenvía en unos 66 ms.
- **Presence:** la clave es el `participant_id`. Varias pestañas del mismo participante cuentan como una.

## Métricas y estadísticas (fase 3)

- **Escala mostrada:** coordenadas, distancias y dispersiones se muestran de 0 a 100 (valor × 100).
- **Consenso:** solo incluye a personas con al menos un voto. Con un único voto la dispersión es 0.
- **Autopercepción:** se compara la colocación propia de mi persona con la mediana de los demás. La distancia es euclídea en 2D; además se indica si «se ve más/menos popular» cuando la diferencia en y es de 5 puntos o más.
- **Sesgo de grupo:** solo cuentan las personas que el participante ha colocado y que algún otro también ha colocado; se excluye a la propia persona. Si mi persona no tiene grupos, todos cuentan como «resto». Es null si uno de los dos lados está vacío.
- **Afinidad:** similitud = 1 − distancia media / √2 (√2 es la distancia máxima en el tablero unidad). La diagonal no se calcula.
- **Puentes:** se muestran los 10 primeros, ordenados por grado y, a igualdad, por nombre.
- **Vistas antes de revelar:** «Consenso» y «Tablero de X» se desactivan hasta revelar (antes, por RLS, el consenso solo contendría tus votos). En modo ciego el panel solo muestra grupos y puentes.
- **Nombres clicables:** en las listas de estadísticas, pulsar un nombre lo pone en la búsqueda y lo resalta en el tablero.

## Extras (fase 4)

- **Recorte de fotos:** se recorta el cuadrado central, sin editor de encuadre.
- **Navegadores sin codificación WebP en canvas:** se muestra un error en lugar de subir PNG, porque el bucket solo acepta `image/webp`.
- **Demo offline:** las fotos se guardan como data URL en `localStorage`; con muchas fotos se puede llenar el cupo (~5 MB).
- **Grafo:** una arista por par de personas, con el color del primer grupo compartido y un grosor igual al número de grupos compartidos. La vista está disponible siempre, porque no depende de los votos.
- **Exportación:** se exporta solo el tablero (con sus ejes) o el grafo visibles, no la página entera. El nombre del fichero es `peopleRank-<slug>-<vista>.png`.

## Fase 1

- **Sala local:** en la fase 1 (sin rutas) la app crea automáticamente una sala "Mi curso" en memoria y la recuerda en `localStorage`.
- **Backend en memoria:** implementa la misma interfaz `DataBackend` que Supabase. Guarda todo en una sola clave de `localStorage` y relee antes de cada escritura, de modo que dos pestañas del mismo navegador se sincronizan mediante el evento `storage`.
