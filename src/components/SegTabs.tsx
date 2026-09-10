import { Link } from 'react-router-dom';
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface SegTabItem {
  key: string;
  label: ReactNode;
  /** Si se pasa, el item se renderiza como <Link> (navegación por ruta). */
  to?: string;
}

/**
 * Control segmentado con indicador deslizante. Mantiene la misma forma de
 * píldora del sitio y anima una sola "pastilla" entre opciones con una curva
 * de rebote. Sirve tanto para pestañas de ruta (`to`) como de estado
 * (`onSelect`). Solo presentación — no cambia datos.
 */
export default function SegTabs({
  items,
  activeKey,
  onSelect,
  variant = 'accent',
  size = 'md',
  className = '',
  ariaLabel,
}: {
  items: SegTabItem[];
  activeKey: string;
  onSelect?: (key: string) => void;
  variant?: 'accent' | 'surface';
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const move = () => {
      const active = list.querySelector<HTMLElement>('[data-seg-active="true"]');
      setThumb(active ? { x: active.offsetLeft, w: active.offsetWidth } : null);
    };
    move();
    const ro = new ResizeObserver(move);
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeKey, items]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = items.findIndex((it) => it.key === activeKey);
    const next = e.key === 'ArrowRight' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    const target = items[next];
    const el = listRef.current?.querySelectorAll<HTMLElement>('.segtabs-btn')[next];
    el?.focus();
    if (target.to) el?.click();
    else onSelect?.(target.key);
  }

  return (
    <div
      ref={listRef}
      className={`segtabs segtabs-${variant} segtabs-${size} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <span
        className="segtabs-thumb"
        aria-hidden="true"
        style={
          thumb
            ? { transform: `translateX(${thumb.x}px)`, width: `${thumb.w}px`, opacity: 1 }
            : { opacity: 0 }
        }
      />
      {items.map((it) => {
        const active = it.key === activeKey;
        const shared = {
          className: 'segtabs-btn',
          role: 'tab' as const,
          'aria-selected': active,
          'data-seg-active': active ? 'true' : 'false',
          tabIndex: active ? 0 : -1,
        };
        return it.to ? (
          <Link key={it.key} to={it.to} {...shared}>
            {it.label}
          </Link>
        ) : (
          <button key={it.key} type="button" {...shared} onClick={() => onSelect?.(it.key)}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
