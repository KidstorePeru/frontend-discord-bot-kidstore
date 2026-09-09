// v3: cachea ÚNICAMENTE recursos ESTÁTICOS propios (JS/CSS/imágenes/fuentes
// del build) — nunca respuestas de la API. Antes se cacheaba CUALQUIER GET
// exitoso sin distinción, lo que incluía datos privados (perfil, pedidos,
// comprobantes de pago, listados de admin) en el Cache Storage del
// navegador, sin limpiarlos al cerrar sesión. Con varias personas usando el
// mismo dispositivo (o simplemente abriendo DevTools), esos datos quedaban
// expuestos mucho después de haber cerrado sesión.
const CACHE_NAME = 'kidstore-static-v3';

// Extensiones de archivos estáticos que sí tiene sentido cachear para uso
// offline — nunca una ruta de API, sin importar cómo esté escrita.
const STATIC_EXT = /\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot)$/i;

function isCacheableStatic(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  // Nunca cachear nada que no sea del propio origen del sitio — así una API
  // en otro dominio (o incluso bajo /api, /store, /admin del mismo dominio)
  // queda excluida por construcción, no por una lista de rutas a mantener.
  if (url.origin !== self.location.origin) return false;
  // Nunca cachear nada bajo rutas de API, sin importar el origen — defensa
  // adicional por si algún día la API se sirve desde el mismo dominio.
  if (/^\/(api|store|admin|auth)\//.test(url.pathname)) return false;
  return STATIC_EXT.test(url.pathname);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: borra TODOS los caches previos (incluye cualquier dato privado
// que versiones anteriores del service worker hayan guardado por error).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Fetch: solo intercepta y sirve desde cache los recursos estáticos propios
// listados arriba. Todo lo demás (y en particular cualquier llamada a la
// API) pasa directo a la red, sin pasar nunca por el Cache Storage.
self.addEventListener('fetch', (event) => {
  if (!isCacheableStatic(event.request)) return; // deja que el navegador maneje el fetch normalmente

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Permite que la app pida limpiar todo el cache explícitamente (se usa al
// cerrar sesión) — defensa adicional por si una pestaña vieja sigue
// corriendo una versión anterior del service worker mientras se actualiza.
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});
