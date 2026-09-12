import { useEffect } from 'react';

const SITE = 'https://www.kidstoreperu.net';
const DEFAULT_IMAGE = `${SITE}/isotipo-kidstore.png`;

interface SEOOptions {
  title: string;
  description?: string;
  /** Ruta canónica, ej. "/store" — se combina con SITE. Por defecto usa
   *  location.pathname, así que solo hace falta pasarla si querés que una
   *  ruta con variantes (ej. con :tab) apunte todas a la misma canónica. */
  path?: string;
  /** true en páginas que no deberían indexarse (privadas o con
   *  parámetros únicos por usuario, como /payment/return). */
  noindex?: boolean;
}

// setMeta escribe un atributo en un <meta>/<link> (creándolo si no existe) y
// devuelve una función que revierte EXACTAMENTE ese cambio: si el elemento
// no existía, lo quita; si ya existía con otro valor, se lo restaura. Antes
// el cleanup de useSEO solo restauraba document.title, así que el
// canonical/descripción/robots que dejaba puestos una página se quedaban
// "pegados" al navegar a cualquier ruta que no llamara a este hook (ej. la
// portada) — la portada terminaba mostrando la descripción y el noindex de
// la última página visitada en vez de los suyos propios.
function setMeta(selector: string, attr: string, content: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  const existed = !!el;
  const prevValue = el ? el.getAttribute(attr) : null;
  if (!el) {
    const tag = selector.startsWith('link') ? 'link' : 'meta';
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    if (tag === 'meta') {
      const match = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (match) el.setAttribute(match[1], match[2]);
    } else {
      el.setAttribute('rel', 'canonical');
    }
    document.head.appendChild(el);
  }
  const target = el;
  target.setAttribute(attr, content);
  return () => {
    if (!existed) {
      target.remove();
    } else if (prevValue !== null) {
      target.setAttribute(attr, prevValue);
    }
  };
}

// useSEO actualiza el <title>, la meta description, las etiquetas Open
// Graph/Twitter, el <link rel="canonical"> y la meta robots según la ruta
// actual — antes TODA la app (siendo un SPA) compartía el único <title> y
// las meta tags fijas de index.html, así que cada página (tienda, FAQ,
// contacto, privacidad, etc.) se veía idéntica en la pestaña del
// navegador y en los resultados de búsqueda/vistas previas de redes
// sociales, sin importar cuál fuera.
//
// El cleanup restaura TODO lo que este hook tocó (título, canonical,
// descripción, Open Graph, robots) a como estaba antes de que esta llamada
// empezara — no solo el título — así que aunque la siguiente página no use
// este hook (o lo use sin `noindex`/`description`), nunca hereda por
// accidente el canonical, el noindex o la descripción de la página anterior.
export function useSEO({ title, description, path, noindex }: SEOOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = title.includes('KidStorePeru') ? title : `${title} — KidStorePeru`;
    document.title = fullTitle;

    const url = `${SITE}${path ?? window.location.pathname}`;
    const restores: Array<() => void> = [];
    restores.push(setMeta('link[rel="canonical"]', 'href', url));

    if (description) {
      restores.push(setMeta('meta[name="description"]', 'content', description));
      restores.push(setMeta('meta[property="og:description"]', 'content', description));
      restores.push(setMeta('meta[name="twitter:description"]', 'content', description));
    }
    restores.push(setMeta('meta[property="og:title"]', 'content', fullTitle));
    restores.push(setMeta('meta[property="og:url"]', 'content', url));
    restores.push(setMeta('meta[property="og:image"]', 'content', DEFAULT_IMAGE));
    restores.push(setMeta('meta[name="twitter:title"]', 'content', fullTitle));

    if (noindex) {
      restores.push(setMeta('meta[name="robots"]', 'content', 'noindex, nofollow'));
    }

    return () => {
      document.title = prevTitle;
      for (const restore of restores) restore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex]);
}
