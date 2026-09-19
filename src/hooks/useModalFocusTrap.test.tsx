import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useModalFocusTrap } from './useModalFocusTrap';

// Pruebas de regresión del punto 5 del pedido de correcciones: el modal de
// inicio de sesión no tenía ninguna de las conductas de teclado que se
// esperan de un diálogo accesible. useModalFocusTrap es la pieza reutilizable
// que ahora se lo da — estas pruebas cubren cada requisito por separado
// contra un modal de juguete, sin depender de toda la página Store.

function TestModal({ active, onEscape }: { active: boolean; onEscape: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useModalFocusTrap(active, containerRef, closeBtnRef, onEscape);
  if (!active) return null;
  return (
    <div role="dialog" aria-modal="true" ref={containerRef}>
      <button ref={closeBtnRef} aria-label="Cerrar">x</button>
      <a href="/login">Iniciar sesión</a>
      <a href="/register">Crear cuenta</a>
    </div>
  );
}

function Harness({ initialActive = true }: { initialActive?: boolean }) {
  const [active, setActive] = useState(initialActive);
  return (
    <div>
      <button data-testid="opener">Agregar al carrito</button>
      <TestModal active={active} onEscape={() => setActive(false)} />
    </div>
  );
}

afterEach(() => cleanup());

describe('useModalFocusTrap', () => {
  it('mueve el foco al primer control (el botón de cerrar) apenas se activa', () => {
    const { getByLabelText } = render(<Harness />);
    expect(document.activeElement).toBe(getByLabelText('Cerrar'));
  });

  it('Tab desde el último elemento vuelve al primero (encerrado dentro del modal)', () => {
    const { getByLabelText, getByText } = render(<Harness />);
    const last = getByText('Crear cuenta');
    act(() => { last.focus(); });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(getByLabelText('Cerrar'));
  });

  it('Shift+Tab desde el primer elemento va al último (encerrado dentro del modal)', () => {
    const { getByLabelText, getByText } = render(<Harness />);
    expect(document.activeElement).toBe(getByLabelText('Cerrar'));

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(getByText('Crear cuenta'));
  });

  it('Escape cierra el modal', () => {
    const onEscape = vi.fn();
    function Wrapper() {
      const containerRef = useRef<HTMLDivElement>(null);
      const closeBtnRef = useRef<HTMLButtonElement>(null);
      useModalFocusTrap(true, containerRef, closeBtnRef, onEscape);
      return (
        <div ref={containerRef}>
          <button ref={closeBtnRef}>x</button>
        </div>
      );
    }
    render(<Wrapper />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('cierre real vía Escape restaura el foco al control que abrió el modal', () => {
    function Real() {
      const [active, setActive] = useState(false);
      const containerRef = useRef<HTMLDivElement>(null);
      const closeBtnRef = useRef<HTMLButtonElement>(null);
      useModalFocusTrap(active, containerRef, closeBtnRef, () => setActive(false));
      return (
        <div>
          <button onClick={() => setActive(true)}>Agregar al carrito</button>
          {active && (
            <div role="dialog" ref={containerRef}>
              <button ref={closeBtnRef} aria-label="Cerrar">x</button>
            </div>
          )}
        </div>
      );
    }
    const { getByText, getByLabelText } = render(<Real />);
    const opener = getByText('Agregar al carrito');
    // jsdom, a diferencia de un navegador real, no mueve el foco al botón
    // solo por disparar un click sintético — se enfoca explícitamente para
    // simular el caso que más importa: un usuario de teclado que activa el
    // botón (Enter/Espacio), que sí lo deja enfocado.
    act(() => { opener.focus(); fireEvent.click(opener); });
    expect(document.activeElement).toBe(getByLabelText('Cerrar'));

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(document.activeElement).toBe(opener);
  });
});
