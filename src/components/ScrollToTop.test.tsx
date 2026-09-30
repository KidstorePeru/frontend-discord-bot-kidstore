import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

// Regresión: al hacer clic en un enlace del footer, la página nueva se abría con
// el scroll donde estaba (se veía su footer) en vez de empezar desde arriba.

function Links() {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/faq">faq</Link>
      <Link to="/store">store</Link>
      <Link to="/dashboard/orders">orders</Link>
      <Link to="/dashboard/history">history</Link>
      <Link to="/terms#pagos">ancla</Link>
      <button onClick={() => navigate(-1)}>atras</button>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={['/', path]} initialIndex={1}>
      <ScrollToTop />
      <Routes><Route path="*" element={<Links />} /></Routes>
    </MemoryRouter>,
  );
}

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const toTop = () => scrollTo.mock.calls.filter(([opts]) => opts?.top === 0).length;

describe('ScrollToTop', () => {
  it('un enlace a otra página empieza desde arriba', () => {
    renderAt('/store');
    const before = toTop();
    fireEvent.click(screen.getByText('faq'));
    expect(toTop()).toBe(before + 1);
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ top: 0, behavior: 'instant' }));
  });

  it('un enlace a la misma página en la que estás también sube', () => {
    renderAt('/store');
    const before = toTop();
    fireEvent.click(screen.getByText('store'));
    expect(toTop()).toBe(before + 1);
  });

  it('cambiar de pestaña dentro de la misma página no salta arriba', () => {
    renderAt('/dashboard/orders');
    const before = toTop();
    fireEvent.click(screen.getByText('history'));
    expect(toTop()).toBe(before);
  });

  it('Atrás del navegador y los enlaces con #ancla no fuerzan el scroll', () => {
    renderAt('/store');
    const before = toTop();
    fireEvent.click(screen.getByText('atras'));
    fireEvent.click(screen.getByText('ancla'));
    expect(toTop()).toBe(before);
  });
});
