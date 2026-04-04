import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider, useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { createOrder } from './services/api';
import { useLang } from './context/LangContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
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
import ChatBot from './components/ChatBot';
import { useState } from 'react';
import { ShoppingCart, X, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Toast } from './components/UI';

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

  const es = lang === 'es';
  const hasBalance = customer ? customer.kc_balance >= cartTotal : false;

  async function handleConfirmPurchase() {
    if (!customer || cart.length === 0) return;
    if (!hasBalance) { setToast({ msg: es ? 'KC insuficientes — ¡Recarga!' : 'Insufficient KC — Recharge!', type: 'error' }); return; }
    setConfirming(true);
    try {
      const firstItem = cart[0];
      await createOrder({
        item_offer_id: firstItem.offerId,
        item_name:     firstItem.name,
        item_image:    firstItem.featuredImg || firstItem.albumArt || firstItem.renderImg,
        price_kc:      firstItem.price_kc,
        price_vbucks:  firstItem.finalPrice,
      });
      const errors: string[] = [];
      for (const item of cart.slice(1)) {
        try {
          await createOrder({
            item_offer_id: item.offerId,
            item_name:     item.name,
            item_image:    item.featuredImg || item.albumArt || item.renderImg,
            price_kc:      item.price_kc,
            price_vbucks:  item.finalPrice,
          });
        } catch { errors.push(item.name); }
      }
      await refresh();
      setConfirming(false);
      setShowConfirm(false);
      setCartOpen(false);
      clearCart();
      setToast({
        msg: errors.length === 0
          ? (es ? `¡Compra completada! ${cartCount} item${cartCount > 1 ? 's' : ''} pedido${cartCount > 1 ? 's' : ''}` : `Purchase complete! ${cartCount} item${cartCount > 1 ? 's' : ''} ordered`)
          : (es ? `Algunos items fallaron: ${errors.join(', ')}` : `Some items failed: ${errors.join(', ')}`),
        type: errors.length === 0 ? 'success' : 'error',
      });
    } catch (err: unknown) {
      setConfirming(false);
      const msg = err instanceof Error ? err.message : (es ? 'Error al procesar la compra' : 'Purchase error');
      const isOffline = msg.includes('horario') || msg.includes('schedule') || msg.includes('BOTS_OFFLINE') || msg.includes('offline');
      setToast({
        msg: isOffline
          ? (es ? '🤖 Los bots están fuera de horario. Intenta durante el horario de operación.' : '🤖 Bots are offline. Please try during operating hours.')
          : msg,
        type: 'error',
      });
    }
  }

  if (!cartOpen) return <>{toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}</>;

  return (
    <>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

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
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <GlobalCart />
              <ChatBot />
              <main className="main-content">
                <Routes>
                  <Route path="/"               element={<Landing />} />
                  <Route path="/register"       element={<Register />} />
                  <Route path="/login"          element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email"   element={<VerifyEmail />} />
                  <Route path="/store"          element={<StorePage />} />
                  <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                  <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/recharge"       element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
                  <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/bots"           element={<ProtectedRoute><Bots /></ProtectedRoute>} />
                  <Route path="/terms"          element={<Terms />} />
                  <Route path="/privacy"        element={<Privacy />} />
                  <Route path="/refunds"        element={<Refunds />} />
                  <Route path="/faq"            element={<FAQPage />} />
                  <Route path="/contact"        element={<Contact />} />
                  <Route path="/payment/return" element={<PaymentReturn />} />
                </Routes>
              </main>
              <GlobalFooter />
            </CartProvider>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
