// Onda de material al hacer clic en cualquier `.btn`. Un único listener
// delegado en el documento — no toca ningún componente. Respeta
// `prefers-reduced-motion` y no hace nada si el botón está deshabilitado.

let started = false;

export function initRipple() {
  if (started || typeof document === 'undefined') return;
  started = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (reduce.matches) return;
      const target = e.target as HTMLElement | null;
      const btn = target?.closest<HTMLElement>('.btn');
      if (!btn || btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true') return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${(e as PointerEvent).clientX - rect.left - size / 2}px`;
      ripple.style.top = `${(e as PointerEvent).clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 600);
    },
    { passive: true },
  );
}
