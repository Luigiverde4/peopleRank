# Presets locales

Todo lo de esta carpeta, salvo este README, está en `.gitignore` porque contiene datos de personas reales: no se sube al repositorio ni llega al despliegue de Vercel.

## Listas de nombres

Cada fichero `*.local.txt` (un nombre por línea) aparece en el panel **Personas** como un botón «Cargar lista …». Los duplicados se ignoran y se pueden seguir añadiendo personas a mano.

## Fotos de la orla

Las imágenes de `orla_fotos/` (cualquier subcarpeta; PNG, JPG o WebP), cada una con el nombre de la persona (`Ana Ruiz Argüelles.png`), aparecen como el botón «Cargar fotos de la orla». Cada foto se asigna a la persona que se llama igual, sin distinguir tildes ni mayúsculas, y se reduce a 256×256 WebP antes de subirla.

En producción, usa «Importar fotos…» y selecciona los ficheros: el emparejamiento es el mismo.

> Ojo: un `npm run build` local empaqueta estas fotos en `dist/`. No subas esa carpeta a mano; despliega siempre desde GitHub.
