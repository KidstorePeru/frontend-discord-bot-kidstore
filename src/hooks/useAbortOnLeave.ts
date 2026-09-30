import { useCallback, useEffect, useRef } from 'react';

/** Señal que se aborta al salir de la pantalla (desmontar el componente).
 *  Se usa para cancelar un intento de inicio de sesión en vuelo: si el usuario
 *  se va (p. ej. a "¿Olvidaste tu contraseña?"), la respuesta que llegue después
 *  no inicia sesión ni lo saca de donde está. Compatible con React StrictMode:
 *  cada montaje crea su propio controlador. */
export function useAbortOnLeave(): () => AbortSignal {
  const ref = useRef<AbortController | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    ref.current = ctrl;
    return () => ctrl.abort();
  }, []);
  return useCallback(() => {
    if (!ref.current) ref.current = new AbortController();
    return ref.current.signal;
  }, []);
}
