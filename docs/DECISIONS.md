# Decisiones

Decisiones tomadas ante ambigüedades de la especificación. La más simple y razonable en cada caso.

## Generales

- **Ubicación de la especificación:** estaba en la raíz como `SPEC.md`; se ha movido a `docs/SPEC.md`, que es donde se la referencia.
- **TypeScript 6.0 en lugar de 7:** `typescript-eslint` (8.x) exige `typescript < 6.1`. Se fija `~6.0.3` (la misma que usa la plantilla oficial de Vite).
- **ESLint en lugar de oxlint:** la plantilla actual de Vite trae oxlint, pero la especificación pide ESLint. Se usa flat config con `typescript-eslint` y los plugins de React Hooks y React Refresh.
- **Confirmación de borrados:** botón de dos pasos ("¿Seguro?") en lugar de `window.confirm`, para no bloquear la página.

## Personas y grupos

- **Nombre normalizado:** sin distinguir mayúsculas, tildes ni espacios repetidos (`normalizeName`). Se usa para detectar duplicados al pegar listas y en el atajo de grupos.
- **Atajo `Grupo: nombre1, nombre2`:** si el grupo ya existe (por nombre normalizado) se reutiliza; si una persona no existe, se crea. Las líneas sin `:` se ignoran.
- **Colores de grupo:** paleta fija de 10 colores; un grupo nuevo toma el primero no usado.
- **Búsqueda:** coincidencia por subcadena del nombre normalizado. Las fichas que coinciden se resaltan y nunca se atenúan aunque el filtro de grupos las excluya.
- **Filtro de grupos:** con varios grupos seleccionados se muestra a quien pertenece a cualquiera de ellos (unión).

## Tablero

- **Clic sin mover:** un movimiento menor de 4 px no cuenta como arrastre y no escribe nada.
- **Soltar fuera del tablero:** si la ficha estaba colocada, se borra su colocación (vuelve a la bandeja); si venía de la bandeja, no pasa nada.
- **Nombres:** se ven al pasar el ratón, al resaltar por búsqueda o activando la casilla "Nombres".

## Fase 1

- **Sala local:** en la fase 1 (sin rutas) la app crea automáticamente una sala "Mi curso" en memoria y la recuerda en `localStorage`.
- **Backend en memoria:** implementa la misma interfaz `DataBackend` que Supabase. Guarda todo en una sola clave de `localStorage` y relee antes de cada escritura, de modo que dos pestañas del mismo navegador se sincronizan mediante el evento `storage`.
