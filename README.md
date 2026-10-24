# peopleRank

Web para que un grupo de amigos clasifique, durante una llamada, a la gente de su curso por popularidad en un tablero 2D:

- **Eje Y:** popularidad en el curso.
- **Eje X:** popularidad dentro de su grupo (de la periferia al centro).
- **Grupos de amigos:** se ven como el color del anillo de cada ficha, y sirven para filtrar.

Cada sala tiene un **modo de juego**, que se elige al crearla y no cambia:

- **General:** un solo tablero que movéis todos a la vez mientras lo discutís en la llamada.
- **VS:** cada uno coloca a todos en su propio tablero. Mientras la sala está en **modo ciego**, cada uno solo ve el suyo (lo garantiza la base de datos con RLS). Cuando quien creó la sala pulsa **Revelar**, todos ven todos los tableros, el consenso y las estadísticas.

Además: grupos y subgrupos, puentes entre grupos, fotos (con importación masiva por nombre de fichero), zoom en el tablero, grafo de grupos, modo oscuro, interfaz en español o inglés, y exportar la sala como imagen, sesión JSON (para continuarla en otra sala) o informe HTML.

Stack: Vite + React + TypeScript, React Router, Zustand, Tailwind, Supabase (Postgres, Realtime, Storage y auth anónima) y Vitest.

## Arrancar en local

Requisitos: Node 22+ y, para el modo con Supabase, Docker Desktop.

```powershell
npm install
```

### Sin Supabase (demo offline)

```powershell
npm run dev
```

Sin `.env.local`, la app usa un backend en memoria guardado en `localStorage`. Todo funciona con un único participante por navegador.

### Con Supabase local

```powershell
npm run db:start          # levanta Supabase en Docker y aplica migración + seed
npx supabase status       # copia "API URL" y "Publishable key"
copy .env.example .env.local   # y rellena las dos variables
npm run dev
```

- Abre <http://localhost:5173/r/demo4bsala2026> para la sala de demo del seed (40 personas, 5 grupos y 3 participantes).
- Para probar con dos usuarios a la vez, usa una ventana de incógnito u otro navegador. Dos pestañas normales comparten la sesión y cuentan como el mismo participante.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite. |
| `npm run build` | Typecheck y build de producción en `dist/`. |
| `npm run typecheck` | Comprobación de tipos (`tsc -b`). |
| `npm run lint` | ESLint. |
| `npm run test` | Tests de Vitest (una pasada). |
| `npm run test:watch` | Tests en modo watch. |
| `npm run preview` | Sirve el build de `dist/`. |
| `npm run db:start` / `db:stop` | Arranca o para Supabase local. |
| `npm run db:reset` | Recrea la base local (migraciones + seed). |
| `npm run db:types` | Regenera `src/data/database.types.ts` desde la base local. |
| `npm run verify:rls` | Comprueba las políticas RLS y Realtime con tres usuarios anónimos (requiere Supabase local). |

## Documentación

- [docs/SPEC.md](docs/SPEC.md): especificación.
- [docs/DECISIONS.md](docs/DECISIONS.md): decisiones tomadas ante ambigüedades.
- [docs/PROGRESS.md](docs/PROGRESS.md): estado por fases y problemas conocidos.
- [docs/DEPLOY.md](docs/DEPLOY.md): despliegue en Supabase y Vercel.
