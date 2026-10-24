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

Problemas conocidos:

- Con más de ~100 fichas el tablero se satura visualmente; la búsqueda y el filtro ayudan a encontrar a alguien.
