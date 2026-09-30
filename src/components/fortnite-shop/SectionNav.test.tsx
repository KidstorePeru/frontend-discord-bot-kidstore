import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SectionNavRail, MobileSectionNav } from './SectionNav';
import { SHOP_LANGS } from './i18n';
import type { ShopCategory } from './model';

// Regresión del punto 7 de la auditoría: el menú lateral de categorías de
// escritorio solo funcionaba con ratón — los puntos no eran enfocables y la
// lista oculta tampoco. Ahora hay un botón con estado accesible que la abre.

const t = SHOP_LANGS.es;
const categories: ShopCategory[] = [
  { id: 'a', label: 'Destacados', category: null, sectionIds: ['sec-a'] },
  { id: 'b', label: 'Lotes', category: null, sectionIds: ['sec-b'] },
  { id: 'c', label: 'Pistas de improvisación', category: null, sectionIds: ['sec-c'] },
];
const baseProps = { categories, activeSectionId: 'sec-b', t, filterCount: 0, onToggleFilters: () => {}, filtersOpen: false };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SectionNavRail (teclado)', () => {
  it('los puntos son un botón enfocable que abre la lista con estados accesibles', () => {
    render(<SectionNavRail {...baseProps} />);
    const toggle = screen.getByRole('button', { name: t.sections });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const panelId = toggle.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel).toBeTruthy();

    toggle.focus();
    expect(document.activeElement).toBe(toggle);
    fireEvent.click(toggle); // Intro/Espacio en un <button> disparan click
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel!.closest('.fns-rail__hover')!.classList.contains('is-open')).toBe(true);

    // El foco pasa a la categoría actual, marcada con aria-current.
    const current = screen.getByRole('button', { name: 'Lotes' });
    expect(current.getAttribute('aria-current')).toBe('location');
    expect(document.activeElement).toBe(current);
  });

  it('flechas recorren la lista y Escape la cierra devolviendo el foco al botón', () => {
    render(<SectionNavRail {...baseProps} />);
    const toggle = screen.getByRole('button', { name: t.sections });
    fireEvent.click(toggle);

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Pistas de improvisación');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(document.activeElement?.textContent).toBe('Destacados'); // vuelve al principio
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(document.activeElement?.textContent).toBe('Pistas de improvisación');

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('elegir una categoría salta a su sección y cierra el menú', () => {
    const target = document.createElement('section');
    target.id = 'sec-c';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    render(<SectionNavRail {...baseProps} />);
    const toggle = screen.getByRole('button', { name: t.sections });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Pistas de improvisación' }));
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    target.remove();
  });

  it('un clic fuera del menú lo cierra', () => {
    render(<SectionNavRail {...baseProps} />);
    const toggle = screen.getByRole('button', { name: t.sections });
    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('MobileSectionNav', () => {
  it('expone el estado del desplegable y Escape lo cierra', () => {
    render(<MobileSectionNav {...baseProps} />);
    const toggle = screen.getByRole('button', { name: `${t.sections}: Lotes` });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const list = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(list).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lotes' }).getAttribute('aria-current')).toBe('location');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Destacados' }), { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });
});
