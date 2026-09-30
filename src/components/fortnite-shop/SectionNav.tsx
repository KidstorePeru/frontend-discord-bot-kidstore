import { memo, useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { ChevronIcon, FilterIcon } from './Icons';
import type { ShopCategory } from './model';
import type { ShopText } from './i18n';

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

type NavProps = {
  categories: ShopCategory[];
  activeSectionId: string | null;
  t: ShopText;
  filterCount: number;
  onToggleFilters: () => void;
  filtersOpen: boolean;
};

// Mueve el foco entre los botones de una lista con ↑/↓/Inicio/Fin.
function moveFocus(list: HTMLElement | null, e: KeyboardEvent) {
  if (!list || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const items = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
  if (!items.length) return;
  e.preventDefault();
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    e.key === 'Home' ? 0
    : e.key === 'End' ? items.length - 1
    : e.key === 'ArrowDown' ? (i + 1) % items.length
    : (i - 1 + items.length) % items.length;
  items[next].focus();
}

// Menú lateral (≥1024 px): columna de puntos que al pasar el ratón se despliega
// con el nombre de cada categoría. Con teclado, la columna de puntos es un botón
// (Intro/Espacio) que abre la lista; ↑/↓ recorren las categorías y Escape la
// cierra devolviendo el foco al botón. Antes los puntos no eran enfocables y la
// lista oculta (visibility: hidden) tampoco: el menú solo servía con ratón.
function Rail({ categories, activeSectionId, t, filterCount, onToggleFilters, filtersOpen }: NavProps) {
  const activeIndex = Math.max(0, categories.findIndex((c) => activeSectionId && c.sectionIds.includes(activeSectionId)));
  const listRef = useRef<HTMLUListElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  // Al abrir, el foco va a la categoría actual; un clic fuera cierra la lista.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    (list?.querySelector<HTMLButtonElement>('button.is-active') ?? list?.querySelector<HTMLButtonElement>('button'))?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const closeAndReturnFocus = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      closeAndReturnFocus();
      return;
    }
    if (open) moveFocus(listRef.current, e);
  };

  // Si el foco sale del menú (Tab hacia fuera), se cierra.
  const onBlur = (e: FocusEvent) => {
    if (open && !wrapRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
  };

  // Mantiene visible el elemento activo dentro de la lista desplegada.
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('.is-active');
    if (list && el) list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
  }, [activeIndex]);

  return (
    <div className="fns-rail">
      <div className="fns-rail__sticky">
        <div className="fns-rail__inner">
          <button
            type="button"
            className={`fns-rail__filter${filtersOpen ? ' is-open' : ''}`}
            onClick={onToggleFilters}
            aria-label={t.filters}
            aria-expanded={filtersOpen}
          >
            <FilterIcon />
            {filterCount > 0 && <span className="fns-rail__badge">{filterCount}</span>}
          </button>

          <div
            ref={wrapRef}
            className={`fns-rail__hover${open ? ' is-open' : ''}`}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
          >
            <button
              ref={toggleRef}
              type="button"
              className="fns-rail__dots"
              aria-label={t.sections}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
            >
              {categories.map((c, i) => (
                <span key={c.id} aria-hidden="true" className={`fns-rail__dot${i === activeIndex ? ' is-active' : ''}`} />
              ))}
            </button>
            <nav id={panelId} className="fns-rail__panel" aria-label={t.sections}>
              <ul ref={listRef}>
                {categories.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={i === activeIndex ? 'is-active' : ''}
                      aria-current={i === activeIndex ? 'location' : undefined}
                      onClick={() => {
                        scrollToSection(c.sectionIds[0]);
                        if (open) closeAndReturnFocus();
                      }}
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SectionNavRail = memo(Rail);

// Móvil (<1024 px): barra fija con la categoría actual y un desplegable.
export const MobileSectionNav = memo(function MobileSectionNav({
  categories,
  activeSectionId,
  t,
  filterCount,
  onToggleFilters,
}: NavProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const active = categories.find((c) => activeSectionId && c.sectionIds.includes(activeSectionId)) ?? categories[0];

  return (
    <div
      className="fns-mnav"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <div className="fns-mnav__bar">
        <button type="button" className="fns-mnav__filter" onClick={onToggleFilters} aria-label={t.filters}>
          <FilterIcon />
          {filterCount > 0 && <span className="fns-rail__badge">{filterCount}</span>}
        </button>
        <button
          ref={toggleRef}
          type="button"
          className="fns-mnav__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${t.sections}: ${active?.label ?? ''}`}
        >
          <span>{active?.label}</span>
          <ChevronIcon up={open} />
        </button>
      </div>
      {open && (
        <ul id={listId} className="fns-mnav__list">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={c === active ? 'is-active' : ''}
                aria-current={c === active ? 'location' : undefined}
                onClick={() => {
                  setOpen(false);
                  scrollToSection(c.sectionIds[0]);
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
