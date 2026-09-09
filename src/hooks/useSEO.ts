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

function setMeta(selector: string, attr: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
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
  el.setAttribute(attr, content);
}

// useSEO actualiza el <title>, la meta description, las etiquetas Open
// Graph/Twitter, el <link rel="canonical"> y la meta robots según la ruta
// actual — antes TODA la app (siendo un SPA) compartía el único <title> y
// las meta tags fijas de index.html, así que cada página (tienda, FAQ,
// contacto, privacidad, etc.) se veía idéntica en la pestaña del
// navegador y en los resultados de búsqueda/vistas previas de redes
// sociales, sin importar cuál fuera. Se restaura el valor de index.html al
// desmontar, para no dejar "pegado" el título de una página tras navegar
// a una ruta que todavía no usa este hook.
export function useSEO({ title, description, path, noindex }: SEOOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = title.includes('KidStorePeru') ? title : `${title} — KidStorePeru`;
    document.title = fullTitle;

    const url = `${SITE}${path ?? window.location.pathname}`;
    setMeta('link[rel="canonical"]', 'href', url);

    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[name="twitter:description"]', 'content', description);
    }
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:image"]', 'content', DEFAULT_IMAGE);
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);

    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    } else if (robots) {
      robots.remove();
    }

    return () => { document.title = prevTitle; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex]);
}
