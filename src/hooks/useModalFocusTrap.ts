import { useEffect, useRef, type RefObject } from 'react';

function focusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

// useModalFocusTrap cubre lo mínimo que necesita un modal para ser
// accesible por teclado: mueve el foco adentro al abrirse, lo mantiene
// encerrado (Tab/Shift+Tab nunca se escapan hacia el resto de la página
// detrás del overlay), cierra con Escape, y devuelve el foco al elemento
// que estaba enfocado justo antes de abrirse (normalmente el control que lo
// disparó) al cerrarse.
//
// onEscape se guarda en un ref (en vez de ir en las dependencias del efecto
// principal) para que pasar una arrow function nueva en cada render del
// componente que lo usa no reinicie el trampolín de foco en cada uno de
// esos renders — solo `active` debe hacerlo.
export function useModalFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onEscape: () => void,
) {
  const openerRef = useRef<Element | null>(null);
  const onEscapeRef = useRef(onEscape);
  useEffect(() => { onEscapeRef.current = onEscape; }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    openerRef.current = document.activeElement;
    initialFocusRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = focusableElements(containerRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inModal = containerRef.current?.contains(document.activeElement);
      if (e.shiftKey) {
        if (!inModal || document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (!inModal || document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (openerRef.current instanceof HTMLElement) {
        openerRef.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
