import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Al hacer clic en un enlace a otra página (por ejemplo, desde el footer), la
// página nueva empieza desde arriba. Antes el scroll se quedaba donde estaba y
// se veía el footer de la página nueva. Excepciones a propósito:
//  - Atrás/Adelante del navegador (POP): se respeta el comportamiento del navegador.
//  - Enlaces con #ancla: los maneja el propio ancla.
//  - Cambiar de pestaña dentro de la misma página (/dashboard/a → /dashboard/b)
//    no salta arriba. Un enlace a la MISMA ruta en la que ya estás sí sube.
export default function ScrollToTop() {
  const { pathname, hash, key } = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const prev = prevPath.current;
    prevPath.current = pathname;
    if (navType === 'POP' || hash) return;
    const section = (p: string) => p.split('/')[1] ?? '';
    const samePage = pathname === prev;
    if (samePage || section(pathname) !== section(prev)) {
      // "instant": html tiene scroll-behavior: smooth y no queremos animar el salto.
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
    // key cambia en cada navegación, incluso a la misma ruta.
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
