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

## Fotos, exportar e importar

- **Importación de fotos por nombre de fichero:** cada foto va a la persona que se llama igual (sin distinguir tildes, mayúsculas ni espacios). Se redimensiona a WebP en el navegador y se sube en lotes de 4 con progreso. Las que no casan se listan.
- **Fotos de la orla como preset local:** `presets/orla_fotos/` (cualquier subcarpeta) aparece como botón «Cargar fotos de la orla». Está en `.gitignore` (personas reales); en producción se usa «Importar fotos…» con los ficheros.
- **Sesión en JSON:** formato propio versionado (`peopleRank-session`, v1) que se valida al leerlo; las filas rotas se descartan. Importar crea una sala nueva del mismo modo: en General se recupera el tablero común; en VS, solo las colocaciones de quien exportó (pasan a ser del que importa), porque las identidades anónimas de los demás no se pueden trasladar. No incluye las fotos.
- **Informe HTML:** un único fichero sin dependencias, con los tableros en SVG (fotos incrustadas como data URL) y las tablas. Respeta el tema claro u oscuro del sistema de quien lo abre. Nombres, colores y fotos se sanean antes de escribirlos.
- **Controles del tablero agrupados** en un solo bloque: vistas, zoom y exportar arriba; búsqueda, nombres y filtro de grupos debajo. Las explicaciones de las vistas pasan a ser tooltips.

## Subgrupos y puentes

- **Dos niveles:** grupo principal y subgrupos (p. ej., dentro del grupo A, las tres chicas más amigas). Lo impone un trigger en la base (`check_group_depth`) y la misma regla en el backend de memoria.
- **Herencia derivada, no guardada:** se guarda la pertenencia directa; estar en un subgrupo cuenta como estar en el grupo principal en el filtro, el tamaño, las estadísticas y el grafo (`expandMemberships`). En el selector de miembros del grupo principal, quien está por un subgrupo aparece marcado y bloqueado («por subgrupo»).
- **Anillo de la ficha:** muestra el subgrupo y no repite el grupo principal. Un subgrupo nuevo toma por defecto un tono más claro u oscuro del color de su grupo.
- **Borrar un grupo principal** no borra sus subgrupos: pasan a ser grupos principales.
- **Puentes:** el cálculo automático (personas en dos grupos) se ha quitado a petición del usuario, porque es poco común. Los puentes se marcan a mano en la pestaña Grupos: se eligen el grupo A y el grupo B, y una persona de cada uno (solo se ofrecen sus miembros, subgrupos incluidos). Tabla `bridges`.
  - Se guardan con los dos grupos en orden fijo, así A↔B y B↔A son el mismo puente y la base impide duplicarlo.
  - Si después alguien deja el grupo, el puente se mantiene; si se borra la persona o el grupo, se borra.
  - Se ven en las estadísticas, agrupados por pareja de grupos, y en el grafo como línea discontinua naranja.

## Modo oscuro

- **Selector Sistema / Claro / Oscuro** en la portada y la cabecera; se guarda en `localStorage` y un script en `index.html` lo aplica antes de pintar.
- **A nivel de paleta:** con la clase `dark` en `<html>` se invierte la escala slate y se intercambian los tonos claros y oscuros (50–300 ↔ 700–950) de los colores de acento. Los componentes no llevan variantes `dark:`; los valores salen de la paleta de Tailwind instalada.
- **`bg-surface`** sustituye a `bg-white` en paneles, tarjetas y campos. Los `hover` de los botones de color usan el tono 500, porque el 700 cambia en oscuro.
- El lienzo del grafo usa sus propios colores por tema, porque no puede leer clases de Tailwind.

## Idiomas (español e inglés)

- **Sin librería:** un diccionario por idioma en `src/i18n/` (objeto tipado; los textos con números o nombres son funciones, así cada idioma resuelve sus plurales). `en.ts` se tipa con `Messages = typeof es`, así que TypeScript avisa si falta un texto.
- **Idioma inicial:** el que se haya elegido antes (`localStorage`); si no, el primer idioma soportado del navegador; si no, español.
- **Selector ES / EN** junto al del tema, en la portada y en la cabecera de la sala. Cada persona ve la app en su idioma; no es una opción de la sala.
- **Errores:** las capas de datos lanzan `AppError` con un código, y la UI lo traduce. Las excepciones conocidas de la base de datos («Room not found», las de subgrupos) también se traducen; cualquier otro error se muestra tal cual.
- **Datos del usuario sin traducir:** nombres de personas, grupos y salas se quedan como se escribieron. El nombre por defecto de una sala nueva sí depende del idioma («Votación del 24/10» / «Vote of 24 Oct»).
- **Exportaciones:** el informe HTML y los nombres de los ficheros salen en el idioma activo al exportar. El formato de la sesión JSON no cambia.

## Zoom y desplazamiento del tablero

- **Las fichas no crecen con el zoom:** lo que se amplía es el espacio entre ellas, que es lo que desatasca un tablero lleno. Los halos del consenso sí escalan, porque son distancias del tablero.
- **Controles:** la rueda acerca hacia el cursor; arrastrar el fondo desplaza; dos dedos pellizcan; botones −, + y «Ajustar». Zoom de 100 % a 600 %; la vista nunca sale del tablero.
- **Vista personal:** cada uno tiene su zoom, tampoco en modo General se comparte. Cambiar de vista vuelve a 100 %.
- **Exportar PNG:** exporta lo que se ve (con el zoom aplicado), sin los controles.
- **Táctil:** el tablero tiene `touch-action: none` para que pellizcar y arrastrar no muevan la página; en el móvil la página se desplaza tocando fuera del tablero.

## Modos de juego

- **Fijo por sala:** se elige al crearla (por defecto, General) y no se puede cambiar.
- **Tabla propia para el tablero común** (`shared_placements`), en lugar de reutilizar `placements` con un participante ficticio: así las políticas del modo VS quedan intactas.
- **Conflictos:** gana la última persona en soltar. Mientras alguien arrastra una ficha, los demás la ven moverse con su nombre encima.
- **`updated_by`:** guarda quién movió la ficha por última vez. RLS impide firmar como otro participante.
- **Estadísticas en General:** solo grupos y puentes. La posición media de cada grupo usa el tablero común.
- **Pendiente:** el botón «Pasar a tablero común» desde una sala VS revelada, con las fichas en su posición de consenso.

## Extras (fase 4)

- **Recorte de fotos:** se recorta el cuadrado central, sin editor de encuadre.
- **Navegadores sin codificación WebP en canvas:** se muestra un error en lugar de subir PNG, porque el bucket solo acepta `image/webp`.
- **Demo offline:** las fotos se guardan como data URL en `localStorage`; con muchas fotos se puede llenar el cupo (~5 MB).
- **Grafo:** una arista por par de personas, con el color del primer grupo compartido y un grosor igual al número de grupos compartidos. La vista está disponible siempre, porque no depende de los votos.
- **Exportación:** se exporta solo el tablero (con sus ejes) o el grafo visibles, no la página entera. El nombre del fichero es `peopleRank-<slug>-<vista>.png`.

## Fase 1

- **Sala local:** en la fase 1 (sin rutas) la app crea automáticamente una sala "Mi curso" en memoria y la recuerda en `localStorage`.
- **Backend en memoria:** implementa la misma interfaz `DataBackend` que Supabase. Guarda todo en una sola clave de `localStorage` y relee antes de cada escritura, de modo que dos pestañas del mismo navegador se sincronizan mediante el evento `storage`.
