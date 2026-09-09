import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider, useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { createOrder } from './services/api';
import { useLang } from './context/LangContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import AuthCallback from './pages/AuthCallback';
import CompleteOAuthRegistration from './pages/CompleteOAuthRegistration';
import StorePage from './pages/Store';
import Dashboard from './pages/Dashboard';
import Recharge from './pages/Recharge';
import Profile from './pages/Profile';
import Bots from './pages/Bots';
import AdminPanel from './pages/AdminPanel';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refunds from './pages/Refunds';
import FAQPage from './pages/FAQ';
import Contact from './pages/Contact';
import PaymentReturn from './pages/PaymentReturn';
import Voucher from './pages/Voucher';
import ComplaintBook from './pages/ComplaintBook';
import NotFound from './pages/NotFound';
import { useState } from 'react';
import { ShoppingCart, X, Trash2, CheckCircle, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Toast, TrustpilotCTA } from './components/UI';

function KCIcon({ s = 16 }: { s?: number }) {
  return <img src="/kidcoin.png" alt="KC" width={s} height={s} style={{ objectFit: 'contain', flexShrink: 0 }} />;
}
function VIcon({ s = 16 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="11" fill="#59c2ea" stroke="#2ba0cb" strokeWidth="1.5" /><text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="sans-serif" fill="#fff">V</text></svg>;
}

// ── Panel del carrito global — siempre montado ──
function GlobalCart() {
  const { customer, refresh } = useAuth();
  const { cart, cartOpen, setCartOpen, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const { lang } = useLang();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  // purchaseResult reemplaza al viejo purchaseSuccess (solo un número) —
  // ahora guarda el resultado de CADA producto, porque una compra de
  // varios items puede terminar parcial (algunos sí, otros no).
  const [purchaseResult, setPurchaseResult] = useState<{ name: string; ok: boolean; reason?: string }[] | null>(null);

  const es = lang === 'es';
  const hasBalance = customer ? customer.kc_balance >= cartTotal : false;

  function friendlyReason(msg: string): string {
    const isOffline = msg.includes('horario') || msg.includes('schedule') || msg.includes('BOTS_OFFLINE') || msg.includes('offline');
    if (isOffline) return es ? '🤖 Bots fuera de horario' : '🤖 Bots offline';
    return msg;
  }

  async function handleConfirmPurchase() {
    if (!customer || cart.length === 0) return;
    if (!hasBalance) { setToast({ msg: es ? 'KC insuficientes — ¡Recarga!' : 'Insufficient KC — Recharge!', type: 'error' }); return; }
    setConfirming(true);

    // Cada producto se pide POR SEPARADO y con su propio try/catch — antes,
    // si el PRIMER item fallaba, ni siquiera se intentaban los demás
    // (la excepción cortaba toda la función), y al final SIEMPRE se
    // vaciaba el carrito entero sin importar cuántos hubieran fallado. Acá
    // se intentan todos, y solo se retiran del carrito los que realmente
    // se pidieron — los que fallaron quedan para reintentar.
    const results: { offerId: string; name: string; ok: boolean; reason?: string }[] = [];
    for (const item of cart) {
      try {
        await createOrder({
          item_offer_id: item.offerId,
          item_name:     item.name,
          item_image:    item.featuredImg || item.albumArt || item.renderImg,
          price_kc:      item.price_kc,
          price_vbucks:  item.finalPrice,
        });
        results.push({ offerId: item.offerId, name: item.name, ok: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : (es ? 'Error al procesar' : 'Processing error');
        results.push({ offerId: item.offerId, name: item.name, ok: false, reason: friendlyReason(msg) });
      }
    }

    results.filter(r => r.ok).forEach(r => removeFromCart(r.offerId));
    await refresh();
    setConfirming(false);
    setShowConfirm(false);
    if (results.some(r => r.ok)) setCartOpen(false); // si TODO falló, se deja el carrito abierto para reintentar
    setPurchaseResult(results.map(({ name, ok, reason }) => ({ name, ok, reason })));
  }

  const anySucceeded = purchaseResult?.some(r => r.ok);
  const anyFailed = purchaseResult?.some(r => !r.ok);
  const successModal = purchaseResult !== null && (
    <div className="pc-modal-ov">
      <div className="pc-modal" style={{ maxWidth: 420, textAlign: 'center', padding: '40px 32px' }}>
        {anyFailed ? (
          <AlertTriangle size={48} style={{ color: anySucceeded ? '#f59e0b' : '#dc2626', marginBottom: 16 }} />
        ) : (
          <CheckCircle size={48} style={{ color: '#22c55e', marginBottom: 16 }} />
        )}
        <h3 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.1rem' }}>
          {!anyFailed
            ? (es ? '¡Compra completada!' : 'Purchase complete!')
            : anySucceeded
              ? (es ? 'Compra parcial' : 'Partial purchase')
              : (es ? 'No se pudo completar la compra' : 'Purchase could not be completed')}
        </h3>
        {/* Resultado de CADA producto — antes solo se listaban los nombres
            de los que fallaban, sin decir qué pasó con cada uno. */}
        <div style={{ textAlign: 'left', margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {purchaseResult.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.82rem' }}>
              {r.ok
                ? <CheckCircle size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                : <X size={15} style={{ color: '#dc2626', flexShrink: 0 }} />}
              <span style={{ flex: 1, color: 'var(--text-muted)' }}>{r.name}</span>
              {!r.ok && <span style={{ color: '#dc2626', fontSize: '.75rem' }}>{r.reason}</span>}
            </div>
          ))}
        </div>
        {anySucceeded && (
          <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', margin: '0 0 4px' }}>
            {es ? 'Te avisaremos por correo cuando se entregue.' : "We'll email you once it's delivered."}
          </p>
        )}
        {anyFailed && (
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', margin: '4px 0' }}>
            {es ? 'Los productos que fallaron siguen en tu carrito — puedes reintentar.' : 'The products that failed are still in your cart — you can retry.'}
          </p>
        )}
        {anySucceeded && <TrustpilotCTA />}
        <button onClick={() => setPurchaseResult(null)} className="btn btn-ghost" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
          {es ? 'Cerrar' : 'Close'}
        </button>
      </div>
    </div>
  );

  if (!cartOpen) return <>{toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}{successModal}</>;

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {successModal}

      <div className="cart-overlay" onClick={() => setCartOpen(false)} />
      <div className="cart-panel">
        <div className="cart-header">
          <h2>
            <ShoppingCart size={18} />
            {es ? 'Carrito' : 'Cart'}
            <span className="cart-count">{cartCount}</span>
          </h2>
          <button className="cart-close" onClick={() => setCartOpen(false)}><X size={18} /></button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <ShoppingCart size={36} strokeWidth={1.2} />
            <span>{es ? 'Tu carrito está vacío' : 'Your cart is empty'}</span>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => (
                <div className="cart-item" key={item.offerId}>
                  <div className="cart-item-img">
                    <img src={item.featuredImg || item.albumArt || item.renderImg} alt={item.name}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-rarity">{item.rarityText}</span>
                    <div className="cart-item-price"><KCIcon s={14} />{item.price_kc.toLocaleString()} KC</div>
                    <div className="cart-item-vbucks"><VIcon s={13} />{item.finalPrice.toLocaleString()}</div>
                  </div>
                  <button className="cart-item-remove" onClick={() => removeFromCart(item.offerId)}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>{es ? 'Total' : 'Total'}</span>
                <div className="cart-total-amount"><KCIcon s={16} />{cartTotal.toLocaleString()} KC</div>
              </div>
              {customer && !hasBalance && (
                <div className="cart-warning">
                  <AlertCircle size={14} />
                  {es ? `Saldo insuficiente. Tienes ${customer.kc_balance.toLocaleString()} KC` : `Insufficient balance. You have ${customer.kc_balance.toLocaleString()} KC`}
                </div>
              )}
              <div className="cart-actions">
                <button className="btn btn-ghost btn-sm" onClick={clearCart}>{es ? 'Vaciar' : 'Clear'}</button>
                <button className="btn btn-primary" disabled={!hasBalance || confirming} onClick={() => setShowConfirm(true)}>
                  {es ? 'Confirmar compra' : 'Confirm purchase'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="confirm-modal-overlay" onClick={() => !confirming && setShowConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <h2><ShoppingCart size={18} /> {es ? 'Confirmar compra' : 'Confirm purchase'}</h2>
              <button onClick={() => !confirming && setShowConfirm(false)} disabled={confirming}><X size={16} /></button>
            </div>
            <div className="confirm-modal-body">
              <p className="confirm-modal-sub">
                {es ? `Vas a comprar ${cartCount} item${cartCount > 1 ? 's' : ''} por un total de:` : `You're buying ${cartCount} item${cartCount > 1 ? 's' : ''} for a total of:`}
              </p>
              <div className="confirm-items">
                {cart.map(item => (
                  <div className="confirm-item" key={item.offerId}>
                    <div className="confirm-item-img">
                      <img src={item.featuredImg || item.albumArt || item.renderImg} alt={item.name}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div className="confirm-item-info">
                      <strong>{item.name}</strong>
                      <span>{item.rarityText}</span>
                    </div>
                    <div className="confirm-item-price"><KCIcon s={14} />{item.price_kc.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="confirm-summary">
                <div className="confirm-balance">
                  <span>{es ? 'Tu saldo' : 'Your balance'}</span>
                  <span>{customer?.kc_balance.toLocaleString()} KC</span>
                </div>
                <div className="confirm-total">
                  <span>{es ? 'Total a pagar' : 'Total to pay'}</span>
                  <span className="confirm-total-num">{cartTotal.toLocaleString()} KC</span>
                </div>
                <div className="confirm-remaining">
                  <span>{es ? 'Saldo restante' : 'Remaining balance'}</span>
                  <span>{((customer?.kc_balance ?? 0) - cartTotal).toLocaleString()} KC</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.07)', border: '1.5px solid rgba(34,197,94,0.25)' }}>
                <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '.83rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#16a34a', display: 'block', marginBottom: 3 }}>{es ? 'Entrega inmediata' : 'Immediate delivery'}</strong>
                  {es ? 'Si ya nos tienes agregado como amigo en Epic Games, recibirás el item de forma inmediata.' : 'If you already have us added as a friend on Epic Games, you will receive the item immediately.'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.07)', border: '1.5px solid rgba(245,158,11,0.25)' }}>
                <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '.83rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#d97706', display: 'block', marginBottom: 3 }}>{es ? '¿Sin bot agregado? Lee esto antes de comprar' : 'No bot added? Read this before buying'}</strong>
                  {es ? 'Si aún no tienes a ninguno de nuestros bots agregado en Epic Games, te recomendamos agregar primero y esperar la confirmación antes de realizar tu compra. El envío puede demorar hasta 48 horas.' : 'If you have not added any of our bots on Epic Games yet, we recommend adding them first and waiting for confirmation before purchasing. Delivery may take up to 48 hours.'}
                </p>
              </div>
            </div>
            <div className="confirm-modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)} disabled={confirming}>{es ? 'Cancelar' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleConfirmPurchase} disabled={confirming}>
                {confirming ? <><Loader2 size={15} className="spin" />{es ? 'Procesando...' : 'Processing...'}</> : <><CheckCircle size={15} />{es ? 'Confirmar' : 'Confirm'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Footer global
function GlobalFooter() {
  const location = useLocation();
  if (location.pathname === '/') return null;
  return <Footer />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LangProvider>
          <CurrencyProvider>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <GlobalCart />
              <main className="main-content">
                <Routes>
                  <Route path="/"               element={<Landing />} />
                  <Route path="/register"       element={<GuestRoute><Register /></GuestRoute>} />
                  <Route path="/login"          element={<GuestRoute><Login /></GuestRoute>} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email"   element={<VerifyEmail />} />
                  <Route path="/auth/callback"  element={<AuthCallback />} />
                  <Route path="/auth/complete"  element={<CompleteOAuthRegistration />} />
                  <Route path="/store"          element={<StorePage />} />
                  <Route path="/admin"          element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                  <Route path="/admin/:tab"     element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                  <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/:tab" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/recharge"       element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
                  <Route path="/account"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/account/:tab"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/bots"           element={<ProtectedRoute><Bots /></ProtectedRoute>} />
                  <Route path="/terms"          element={<Terms />} />
                  <Route path="/privacy"        element={<Privacy />} />
                  <Route path="/refunds"        element={<Refunds />} />
                  <Route path="/libro-de-reclamaciones" element={<ComplaintBook />} />
                  <Route path="/faq"            element={<FAQPage />} />
                  <Route path="/contact"        element={<Contact />} />
                  <Route path="/payment/return" element={<PaymentReturn />} />
                  <Route path="/dashboard/comprobantes/:kind/:id" element={<ProtectedRoute><Voucher /></ProtectedRoute>} />
                  <Route path="*"               element={<NotFound />} />
                </Routes>
              </main>
              <GlobalFooter />
            </CartProvider>
          </AuthProvider>
          </CurrencyProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
