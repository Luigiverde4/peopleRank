# Listas de nombres locales

Cada fichero `*.local.txt` de esta carpeta (un nombre por línea) aparece en el panel **Personas** como un botón «Cargar lista …» que añade todos sus nombres de golpe. Los duplicados se ignoran, y se pueden seguir añadiendo más personas pegándolas a mano.

Estos ficheros están en `.gitignore` porque contienen nombres de personas reales: no se suben al repositorio ni llegan al despliegue de Vercel. En producción basta con pegar la lista una vez en la sala; queda guardada en Supabase.
