import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Regresión: al renovar la tienda se borró styles/store.css, que además de la
// tienda vieja guardaba estilos que usan OTRAS pantallas (página de Bots,
// modal de resultado de compra de App.tsx/Recharge.tsx y el modal de "inicia
// sesión para comprar"). Las clases seguían en el JSX pero ya sin estilos:
// el modal de inicio de sesión quedaba invisible. Esta prueba exige que esas
// clases compartidas sigan definidas en alguna hoja de estilos.
const stylesDir = __dirname;
const allCss = readdirSync(stylesDir)
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(join(stylesDir, f), 'utf8'))
  .join('\n');

// ".clase" seguida de algo que no continúe el nombre (espacio, {, :, ., coma…).
function defines(cls: string): boolean {
  return new RegExp('\\.' + cls + '(?![\\w-])').test(allCss);
}

describe('estilos compartidos siguen definidos', () => {
  it.each([
    'login-modal-overlay', 'login-modal', 'login-modal-close', 'login-modal-buttons',
    'pc-modal-ov', 'pc-modal',
    'bots-page', 'bots-header', 'bots-grid', 'bot-card', 'bot-copy',
  ])('.%s', (cls) => {
    expect(defines(cls)).toBe(true);
  });

  it('la comprobación no da falsos positivos por prefijo', () => {
    // "bot-card" no debe contar como definido solo porque existe ".bot-card-body".
    expect(new RegExp('\\.bot-car(?![\\w-])').test(allCss)).toBe(false);
  });
});

// Regresión: el fondo de sección de la tienda es sticky con height 100vh y
// margin-bottom -100vh; sin recortar la tienda, al llegar al final sobresalía una
// pantalla entera y tapaba el footer. Debe ser overflow: clip (no hidden, que
// rompería los sticky de la tienda).
describe('la tienda no tapa el footer', () => {
  it('.fnshop recorta lo que sobresale con overflow: clip', () => {
    const shopCss = readFileSync(join(__dirname, '../components/fortnite-shop/fortnite-shop.css'), 'utf8');
    const block = shopCss.match(/\n\.fnshop \{([^}]*)\}/)?.[1] ?? '';
    expect(block).toMatch(/overflow:\s*clip/);
    expect(block).not.toMatch(/overflow:\s*hidden/);
  });
});
