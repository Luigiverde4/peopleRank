# Despliegue (Supabase + Vercel)

Pasos para Windows (PowerShell o la terminal de VSCode), desde la carpeta del proyecto. Nada de esto se ha ejecutado: requiere tus cuentas.

> ⚠️ **Los proyectos gratuitos de Supabase se pausan tras una semana sin actividad.** Antes de cada uso (por ejemplo, el día de la llamada), entra en el [dashboard de Supabase](https://supabase.com/dashboard) y pulsa **Restore project** si aparece en pausa. Tarda unos minutos.

## 1. Crear el proyecto en Supabase

1. Entra en <https://supabase.com/dashboard> y crea un proyecto nuevo (plan gratuito). Elige una región cercana (p. ej. `West EU`).
2. Guarda la contraseña de la base de datos: la pedirá el paso 2.
3. En **Project Settings → API Keys** copia:
   - la **Project URL** (`https://<ref>.supabase.co`);
   - la **Publishable key** (`sb_publishable_...`). En proyectos antiguos se llama *anon key*; también sirve.

## 2. Aplicar la migración

```powershell
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

- `<ref>` es el identificador del proyecto (el subdominio de la Project URL).
- `db push` aplica todas las migraciones de `supabase/migrations/` que falten: tablas, RLS, funciones RPC, publicación de Realtime, el bucket `photos` y los modos de juego. Cuando se añada una migración nueva, basta con volver a ejecutarlo.
- El seed de demo (`supabase/seed.sql`) **no** se aplica en remoto; solo se usa en local.

## 3. Activar la auth anónima y comprobar el bucket

1. **Authentication → Sign In / Providers → Anonymous sign-ins**: actívalo.
2. **Storage**: comprueba que existe el bucket `photos` y que es público. Si no aparece, vuelve a ejecutar `npx supabase db push`.
3. (Opcional) **Authentication → Rate limits**: el límite de altas anónimas por hora e IP (30 por defecto) sobra para un grupo pequeño.

## 4. Desplegar en Vercel

1. Entra en <https://vercel.com/new> e importa el repositorio `Luigiverde4/peopleRank`.
2. Vercel detecta Vite automáticamente (build: `npm run build`, salida: `dist`).
3. En **Environment Variables** añade:
   - `VITE_SUPABASE_URL` = la Project URL;
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la publishable key.
4. Pulsa **Deploy**. `vercel.json` ya redirige todas las rutas a `index.html`, así que los enlaces `/r/<slug>` funcionan al recargar.
5. En Supabase, **Authentication → URL Configuration**: pon la URL de Vercel como *Site URL*. No es imprescindible con auth anónima, pero evita avisos.

## 5. Uso

1. Abre la URL de Vercel, crea una sala y comparte el enlace con el botón **Copiar enlace**.
2. La primera vez, pega la lista de nombres en **Personas** (queda guardada en Supabase).
3. Cuando todos hayan colocado, quien creó la sala pulsa **Revelar**.

## Notas

- La publishable key es pública por diseño: la seguridad la ponen las políticas RLS de la migración.
- La sesión anónima vive en el navegador: si alguien borra los datos del sitio o cambia de dispositivo, entrará como un participante nuevo.
- Las listas de `presets/*.local.txt` no se suben a git, así que no aparecen en Vercel.
