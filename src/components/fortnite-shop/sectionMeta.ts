// Fondo de cada sección de la tienda (fortnite-api.com no lo trae).
//
// CÓMO AGREGAR UN FONDO — sin tocar código:
//   Guarda la imagen en  frontend/src/assets/secciones/  con el NOMBRE EXACTO de
//   la sección tal como sale en la tienda (jpg, png, webp o avif). Ejemplos:
//     "The Binding of Isaac.jpg"  → sección THE BINDING OF ISAAC
//     "LO MÁS VENDIDO DE HOY.jpg" → sección LO MÁS VENDIDO DE HOY
//   No importan mayúsculas, tildes ni signos ("resident evil.jpg" sirve para
//   "Resident Evil (!)"). Si la tienda en inglés usa otro nombre (p. ej.
//   "Jam Tracks" / "Pistas de improvisación"), agrega una copia con ese nombre.
//
// FONDO POR DEFECTO (secciones nuevas que aún no tienen el suyo):
//   Guarda una imagen llamada  _por-defecto.jpg  (o .png/.webp/.avif) en la
//   misma carpeta. Si no existe, se usa la textura por defecto de la tienda
//   oficial.
//
// Después de agregar imágenes hay que volver a compilar/desplegar el frontend.

const FILES = import.meta.glob('../../assets/secciones/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Clave para comparar nombres: sin tildes, sin mayúsculas, solo letras y números. */
export function sectionKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const DEFAULT_KEY = 'pordefecto';
const BY_NAME = new Map<string, string>();
for (const [path, url] of Object.entries(FILES)) {
  const file = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  BY_NAME.set(sectionKey(file), url);
}

/** Textura por defecto de la tienda oficial (se usa si no hay _por-defecto propio). */
const OFFICIAL_DEFAULT = 'https://cdn2.unrealengine.com/default-sparks-sectionbg-v1-1920x1080-9b27879ce008.jpg';

export function sectionBackground(name: string): string {
  return BY_NAME.get(sectionKey(name)) ?? BY_NAME.get(DEFAULT_KEY) ?? OFFICIAL_DEFAULT;
}

