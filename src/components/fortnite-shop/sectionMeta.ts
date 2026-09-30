// Fondo de cada sección de la tienda (fortnite-api.com no lo trae).
//
// CÓMO AGREGAR UN FONDO — sin tocar código:
//   Guarda la imagen en  frontend/src/assets/secciones/  con el NOMBRE EXACTO de
//   la sección tal como sale en la tienda (jpg, jpeg, png, webp o avif). Ejemplos:
//     "The Binding of Isaac.jpg"  → sección THE BINDING OF ISAAC
//     "LO MÁS VENDIDO DE HOY.jpg" → sección LO MÁS VENDIDO DE HOY
//   No importan mayúsculas, tildes ni signos ("resident evil.jpg" sirve para
//   "Resident Evil (!)"). Si la tienda en inglés usa otro nombre (p. ej.
//   "Jam Tracks" / "Pistas de improvisación"), agrega una copia con ese nombre.
//
// VARIOS FONDOS PARA UNA MISMA SECCIÓN (cambian cada día, como en la tienda oficial):
//   Agrega un espacio y un número al final del nombre:
//     "Portada.jpg", "Portada 2.jpg", "Portada 3.jpg"   (también vale "Portada (2).jpg")
//   Cada día —con el cambio de tienda, 00:00 UTC— la sección usa el siguiente de
//   la lista, en orden (sin número = 1, luego 2, 3…), y vuelve a empezar. Nunca
//   repite el mismo fondo dos días seguidos si hay más de uno. Cada sección
//   arranca en un punto distinto de su lista, así no cambian todas a la vez.
//   Si una sección se llama con número de verdad (p. ej. "Resident Evil 4") y no
//   existe "Resident Evil.jpg", el archivo "Resident Evil 4.jpg" se usa para ella.
//
// FONDO POR DEFECTO (secciones nuevas que aún no tienen el suyo):
//   Guarda una imagen llamada  _por-defecto.jpg  (o .png/.webp/.avif) en la
//   misma carpeta (también admite variantes: "_por-defecto 2.jpg"…). Si no
//   existe, se usa la textura por defecto de la tienda oficial.
//
// Después de agregar imágenes hay que volver a compilar/desplegar el frontend
// (push a main → Railway).

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

/** "Portada 2" / "Portada (2)" → base "Portada", número 2. */
const VARIANT_RE = /^(.+?)\s+\(?(\d+)\)?$/;

const DEFAULT_KEY = 'pordefecto';
/** Fondos agrupados por nombre base de sección, ordenados por número de variante. */
const GROUPS = new Map<string, { n: number; url: string }[]>();
/** Cada archivo por su nombre completo (incluido el número), para secciones con número propio. */
const EXACT = new Map<string, string>();

export function registerSectionFiles(files: Record<string, string>) {
  GROUPS.clear();
  EXACT.clear();
  for (const [path, url] of Object.entries(files)) {
    const file = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    EXACT.set(sectionKey(file), url);
    const m = file.match(VARIANT_RE);
    const base = sectionKey(m ? m[1] : file);
    const list = GROUPS.get(base) ?? [];
    list.push({ n: m ? Number(m[2]) : 1, url });
    GROUPS.set(base, list);
  }
  for (const list of GROUPS.values()) list.sort((a, b) => a.n - b.n || a.url.localeCompare(b.url));
}
registerSectionFiles(FILES);

/** Día de tienda: días UTC desde 1970 (la tienda cambia a las 00:00 UTC). */
export function shopDay(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

// Desfase estable por sección (FNV-1a), para que no roten todas al mismo tiempo.
function offsetFor(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function pick(list: { url: string }[], key: string, day: number): string {
  return list[(day + offsetFor(key)) % list.length].url;
}

/** Textura por defecto de la tienda oficial (se usa si no hay _por-defecto propio). */
const OFFICIAL_DEFAULT = 'https://cdn2.unrealengine.com/default-sparks-sectionbg-v1-1920x1080-9b27879ce008.jpg';

/** Todos los fondos disponibles para una sección, en el orden en que rotan. */
export function sectionBackgrounds(name: string): string[] {
  const key = sectionKey(name);
  const group = GROUPS.get(key);
  if (group) return group.map((v) => v.url);
  const exact = EXACT.get(key);
  return exact ? [exact] : [];
}

/** Fondo de la sección para el día de tienda indicado (por defecto, hoy). */
export function sectionBackground(name: string, day = shopDay()): string {
  const key = sectionKey(name);
  const group = GROUPS.get(key);
  if (group) return pick(group, key, day);
  const exact = EXACT.get(key);
  if (exact) return exact;
  const fallback = GROUPS.get(DEFAULT_KEY);
  return fallback ? pick(fallback, key, day) : OFFICIAL_DEFAULT;
}
