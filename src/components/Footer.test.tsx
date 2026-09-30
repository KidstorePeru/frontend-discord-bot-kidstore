import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LangProvider } from '../context/LangContext';
import { AuthProvider } from '../context/AuthContext';
import Footer from './Footer';

// El footer es uno solo para todo el sitio (también la portada): sus enlaces deben
// apuntar a rutas vigentes, con los mismos nombres del menú, incluir el Libro de
// Reclamaciones (obligatorio en Perú) y mostrar en "Cuenta" lo que corresponde
// según haya sesión iniciada o no.

function renderFooter() {
  return render(
    <MemoryRouter>
      <LangProvider>
        <AuthProvider>
          <Footer />
        </AuthProvider>
      </LangProvider>
    </MemoryRouter>,
  );
}
const hrefOf = (name: string) => screen.getByRole('link', { name }).getAttribute('href');

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('kc_lang', 'es');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Footer', () => {
  it('sin sesión: tienda, crear cuenta / ingresar, soporte y todos los enlaces legales', () => {
    renderFooter();
    expect(hrefOf('Tienda de objetos')).toBe('/store');
    expect(hrefOf('Recargar KC')).toBe('/recharge');
    expect(hrefOf('Bots')).toBe('/bots');
    expect(hrefOf('Crear cuenta')).toBe('/register');
    expect(hrefOf('Ingresar')).toBe('/login');
    expect(screen.queryByRole('link', { name: 'Mis Pedidos' })).toBeNull();
    expect(hrefOf('Preguntas frecuentes')).toBe('/faq');
    expect(hrefOf('Contacto')).toBe('/contact');
    expect(hrefOf('Términos y Condiciones')).toBe('/terms');
    expect(hrefOf('Política de Privacidad')).toBe('/privacy');
    expect(hrefOf('Política de Reembolsos')).toBe('/refunds');
    expect(hrefOf('Libro de Reclamaciones')).toBe('/libro-de-reclamaciones');
  });

  it('con sesión: muestra Mis Pedidos y Mi Cuenta en vez de crear cuenta / ingresar', async () => {
    localStorage.setItem('kc_token', 'tok');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      success: true, customer: { id: 'c1', epic_username: 'demo', email: 'demo@example.com', kc_balance: 0, is_verified: true },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))));
    renderFooter();
    await waitFor(() => expect(hrefOf('Mis Pedidos')).toBe('/dashboard'));
    expect(hrefOf('Mi Cuenta')).toBe('/account');
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ingresar' })).toBeNull();
  });
});
