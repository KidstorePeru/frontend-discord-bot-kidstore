import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getMyOrders, getMyRecharges, getMyOrderStats, getMyRechargeStats } from '../services/api';
import type { RechargeHistoryItem } from '../services/api';
import { KCBadge, StatusBadge, PageLoader } from '../components/UI';
import SegTabs from '../components/SegTabs';
import type { Order } from '../types';
import { Package, Zap, ArrowRight, Gamepad2, ShoppingBag, TrendingUp, Clock, Coins, CreditCard, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Wallet, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { usePaginatedHistory } from '../hooks/usePaginatedHistory';

// buildPageList arma la lista compacta de páginas a mostrar (primera,
// última, la actual y `siblingCount` vecinas a cada lado, con "…" para el
// resto) — antes se listaban TODAS las páginas en una sola fila, lo que con
// más de 2000 operaciones (201 páginas a 10 por página) desbordaba el
// ancho disponible tanto en escritorio como en móvil.
function buildPageList(current: number, total: number, siblingCount = 1): (number | '…')[] {
  const totalPageNumbers = siblingCount * 2 + 5; // 1 + última + actual + 2 vecinos + 2 posibles "…"
  if (total <= totalPageNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, total);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 1;

  const pages: (number | '…')[] = [1];

  if (showLeftDots) {
    pages.push('…');
  } else {
    for (let p = 2; p < leftSibling; p++) pages.push(p);
  }

  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p !== 1 && p !== total) pages.push(p);
  }

  if (showRightDots) {
    pages.push('…');
  } else {
    for (let p = rightSibling + 1; p < total; p++) pages.push(p);
  }

  pages.push(total);
  return pages;
}

type DashTab = 'orders' | 'recharges';
const DASH_TABS: DashTab[] = ['orders', 'recharges'];
const PER_PAGE = 10;

// paymentStatusColor/paymentStatusLabel centralizan cómo se muestra el
// status de un pago por pasarela — antes cualquier status que no fuera
// 'approved'/'pending' se mostraba como "Fallido" en rojo, lo que incluía a
// 'review' (un pago que el backend nunca pudo confirmar NI descartar, ver
// reconcileDeadLetterAfter en el backend) — mostrarlo como "fallido" es
// justo la afirmación que NO se puede hacer ahí.
function paymentStatusColor(status: string): string {
  switch (status) {
    case 'approved': case 'fulfilled': return '#22c55e';
    case 'pending': return '#f59e0b';
    case 'review': return '#f59e0b';
    default: return '#dc2626'; // failed, expired
  }
}
function paymentStatusLabel(status: string, es: boolean): string {
  switch (status) {
    case 'approved': return es ? 'Aprobado' : 'Approved';
    case 'fulfilled': return es ? 'Entregado' : 'Delivered';
    case 'pending': return es ? 'Pendiente' : 'Pending';
    case 'review': return es ? 'Verificando' : 'Verifying';
    default: return es ? 'Fallido' : 'Failed';
  }
}
// formatCharged muestra el monto en la divisa REAL cobrada (charged_amount/
// charged_currency, calculados en el backend) en vez de asumir siempre
// soles — PayPal y NOWPayments cobran en USD, dLocal Go en la divisa real
// del cliente. Sin esa información (registro antiguo) no se inventa nada.
function formatCharged(p: { amount_pen: number; charged_amount?: number; charged_currency?: string }, lang?: string): string {
  if (p.charged_amount == null || !p.charged_currency) return lang === 'en' ? 'Amount unavailable' : 'Monto no disponible';
  try {
    return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-PE', { style: 'currency', currency: p.charged_currency }).format(p.charged_amount);
  } catch {
    return `${p.charged_currency} ${p.charged_amount.toFixed(2)}`;
  }
}

export default function Dashboard() {
  const { customer, refresh } = useAuth();
  const { t, lang } = useLang();
  const { tab: tabParam } = useParams<{ tab: string }>();
  const es = lang === 'es';
  useSEO({
    title: es ? 'Mi Panel' : 'My Dashboard',
    description: es ? 'Revisa tus pedidos y tu historial de recargas de KidCoins.' : 'Check your orders and KidCoins recharge history.',
    path: '/dashboard',
    noindex: true,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  // Historial de recargas: ya viene combinado, deduplicado (recargas
  // manuales vs. la acreditación automática de un pago por pasarela — misma
  // operación, nunca las dos) y paginado desde el servidor (ver
  // GetRechargeHistoryByCustomer en el backend) — antes se traían dos
  // listas completas (una con tope fijo de 2000, la otra sin límite) y se
  // combinaban/paginaban acá mismo, lo que rompía con más de 2000 intentos
  // de pago. usePaginatedHistory centraliza el refresco periódico en
  // segundo plano, la protección contra respuestas fuera de orden y la
  // omisión del refresco mientras la consulta visible sigue pendiente (ver
  // el comentario en hooks/usePaginatedHistory.ts para el porqué).
  const {
    items: rechargeItems, total: rechargeTotalCount, page: rechargePage, setPage: setRechargePage,
    loading: rechargeLoading, error: rechargeError, retry: retryRecharges,
  } = usePaginatedHistory<RechargeHistoryItem>(getMyRecharges, PER_PAGE);
  const [loading, setLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  // Totales calculados en el servidor sobre TODO el historial — antes se
  // derivaban de sumar/filtrar los arrays ya cargados (orders tope 100,
  // payments tope 50 sin aviso), y encima totalPENRechargedGateway sumaba
  // amount_pen de TODOS los pagos sin filtrar por estado, inflando el total
  // con intentos pendientes o fallidos que nunca acreditaron nada.
  const [orderStats, setOrderStats] = useState({ total_orders: 0, sent_orders: 0, pending_orders: 0, total_spent_kc: 0 });
  const [rechargeStats, setRechargeStats] = useState({ total_kc_recharged: 0, total_pen_recharged: 0, pending_payments: 0 });

  // Refresco periódico: antes el panel solo cargaba una vez al montar, así
  // que una entrega o acreditación confirmada mientras el cliente seguía
  // mirando el panel (el worker de pedidos corre cada 30s, la reconciliación
  // de pagos cada 2 min) no se veía hasta recargar toda la página a mano.
  // Se refresca cada 20s mientras la pestaña está visible — no tiene sentido
  // seguir consultando si el cliente cambió de pestaña o minimizó la
  // ventana. Los errores de un refresco en segundo plano no borran los
  // datos ya mostrados (solo el primer load usa el loader de pantalla
  // completa); si una petición falla, simplemente se reintenta en el
  // siguiente ciclo.
  useEffect(() => {
    let cancelled = false;
    function loadAll(isFirstLoad: boolean) {
      Promise.all([
        refresh(),
        getMyOrders(1, 100).then(r => { if (!cancelled) setOrders(r.orders); }).catch(() => {}),
        getMyOrderStats().then(r => { if (!cancelled) setOrderStats(r); }).catch(() => {}),
        getMyRechargeStats().then(r => { if (!cancelled) setRechargeStats(r); }).catch(() => {}),
      ]).finally(() => { if (!cancelled && isFirstLoad) setLoading(false); });
    }
    loadAll(true);
    const REFRESH_MS = 20000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadAll(false);
    }, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !customer) return <PageLoader />;

  if (!tabParam || !DASH_TABS.includes(tabParam as DashTab)) {
    return <Navigate to="/dashboard/orders" replace />;
  }
  const tab = tabParam as DashTab;

  // ── Order stats (calculados en el servidor sobre todo el historial) ──
  const sentOrders    = orderStats.sent_orders;
  const totalSpent     = orderStats.total_spent_kc;
  const pendingOrders = orderStats.pending_orders;

  // ── Recharge stats (idem — total_pen_recharged ya excluye pagos
  // pendientes/fallidos, nunca los suma como si fueran plata cobrada) ──
  const totalKCRecharged = rechargeStats.total_kc_recharged;
  const totalPENRechargedGateway = rechargeStats.total_pen_recharged;
  const pendingRecharges = rechargeStats.pending_payments;

  // ── Pagination ──
  const orderPages = Math.ceil(orders.length / PER_PAGE) || 1;
  const pagedOrders = orders.slice((orderPage - 1) * PER_PAGE, orderPage * PER_PAGE);
  const rechargePages = Math.ceil(rechargeTotalCount / PER_PAGE) || 1;

  // Pagination compacta: primera/anterior/siguiente/última + un puñado de
  // números alrededor de la página actual, con "…" para el resto (ver
  // buildPageList) — antes listaba TODAS las páginas en una fila, lo que
  // con más de 2000 operaciones (201 páginas) desbordaba el ancho
  // disponible en escritorio y en móvil. `disabled` (usado por el
  // historial de recargas mientras hay una petición en vuelo) deshabilita
  // los botones sin ocultarlos, para que el cliente siga viendo en qué
  // página está aunque tenga que esperar a que termine de cargar.
  function Pagination({ page, total, setPage, disabled }: { page: number; total: number; setPage: (p: number) => void; disabled?: boolean }) {
    if (total <= 1) return null;
    const pages = buildPageList(page, total);
    return (
      <nav className="dash-pagination" aria-label={es ? 'Paginación' : 'Pagination'}>
        <button
          disabled={disabled || page <= 1}
          onClick={() => setPage(1)}
          aria-label={es ? 'Primera página' : 'First page'}
          title={es ? 'Primera página' : 'First page'}
        ><ChevronsLeft size={14}/></button>
        <button
          disabled={disabled || page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label={es ? 'Página anterior' : 'Previous page'}
        ><ChevronLeft size={14}/></button>
        {pages.map((p, i) => p === '…'
          ? <span key={`dots-${i}`} className="dash-pagination-dots" aria-hidden="true">…</span>
          : (
            <button
              key={p}
              className={p === page ? 'active' : ''}
              disabled={disabled}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => setPage(p)}
            >{p}</button>
          ))}
        <button
          disabled={disabled || page >= total}
          onClick={() => setPage(page + 1)}
          aria-label={es ? 'Página siguiente' : 'Next page'}
        ><ChevronRight size={14}/></button>
        <button
          disabled={disabled || page >= total}
          onClick={() => setPage(total)}
          aria-label={es ? 'Última página' : 'Last page'}
          title={es ? 'Última página' : 'Last page'}
        ><ChevronsRight size={14}/></button>
      </nav>
    );
  }

  return (
    <div className="dash-page">

      {/* ── Balance hero ── */}
      <div className="dash-balance">
        <div className="dash-balance-bg" />
        <div className="dash-balance-orb dash-balance-orb1" />
        <div className="dash-balance-orb dash-balance-orb2" />
        <div className="dash-balance-left">
          <span className="dash-balance-label">{t('dash.balance')}</span>
          <div className="dash-balance-amount">
            <img src="/kidcoin.png" alt="KC" className="dash-kc-icon" />
            <span>{customer.kc_balance.toLocaleString()}</span>
            <span className="dash-balance-unit">KC</span>
          </div>
          <div className="dash-balance-user">
            <Gamepad2 size={14} />
            <span>{customer.epic_username}</span>
          </div>
        </div>
        <div className="dash-balance-right">
          <Link to="/recharge" className="dash-recharge-btn">
            <Zap size={16} /> {t('dash.recharge')}
          </Link>
          <Link to="/store" className="dash-store-btn">
            <ShoppingBag size={16} /> {es ? 'Tienda' : 'Store'}
          </Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <SegTabs
        className="dash-tabs"
        activeKey={tab}
        ariaLabel={es ? 'Secciones del panel' : 'Dashboard sections'}
        items={[
          { key: 'orders',    to: '/dashboard/orders',    label: <><Package size={16}/> {es ? 'Mis Pedidos' : 'My Orders'}</> },
          { key: 'recharges', to: '/dashboard/recharges', label: <><Coins size={16}/> {es ? 'Historial de Recargas' : 'Recharge History'}</> },
        ]}
      />

      {/* ══════════ TAB: MIS PEDIDOS ══════════ */}
      {tab === 'orders' && <>
        <div className="dash-stats">
          <div className="dash-stat" style={{'--sc':'#7c3aed','--sg':'rgba(124,58,237,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><ShoppingBag size={20} /></div>
            <div className="dash-stat-val">{orders.length}</div>
            <div className="dash-stat-lbl">{es ? 'Pedidos totales' : 'Total orders'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#22c55e','--sg':'rgba(34,197,94,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Package size={20} /></div>
            <div className="dash-stat-val">{sentOrders}</div>
            <div className="dash-stat-lbl">{es ? 'Items recibidos' : 'Items received'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#f59e0b','--sg':'rgba(245,158,11,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><TrendingUp size={20} /></div>
            <div className="dash-stat-val">{totalSpent.toLocaleString()}</div>
            <div className="dash-stat-lbl">{es ? 'KC gastados' : 'KC spent'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#06b6d4','--sg':'rgba(6,182,212,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Clock size={20} /></div>
            <div className="dash-stat-val">{pendingOrders}</div>
            <div className="dash-stat-lbl">{es ? 'En proceso' : 'In process'}</div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head">
            <h2><Package size={18} /> {t('dash.orders')}</h2>
            <Link to="/store" className="btn btn-ghost btn-sm">{t('dash.orders.go')} <ArrowRight size={14} /></Link>
          </div>
          {orders.length === 0 ? (
            <div className="dash-empty">
              <Package size={48} strokeWidth={1} />
              <p>{t('dash.orders.empty')}</p>
              <Link to="/store" className="btn btn-primary btn-sm">{t('dash.orders.explore')}</Link>
            </div>
          ) : (
            <>
              <div className="dash-orders">
                {pagedOrders.map(o => (
                  <div className="dash-order-row" key={o.id}>
                    <div className="dash-order-img">
                      {o.item_image
                        ? <img src={o.item_image} alt={o.item_name} />
                        : <div className="dash-order-placeholder"><Gamepad2 size={18} /></div>}
                    </div>
                    <div className="dash-order-info">
                      <strong>{o.item_name}</strong>
                      <span>{new Date(o.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                    </div>
                    <KCBadge amount={o.price_kc} size="sm" />
                    <StatusBadge status={o.status} />
                    {o.status === 'sent' && (
                      <Link to={`/dashboard/comprobantes/pedido/${o.id}`} className="dash-voucher-link">
                        {es ? 'Comprobante' : 'Receipt'}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              <Pagination page={orderPage} total={orderPages} setPage={setOrderPage} />
            </>
          )}
        </div>
      </>}

      {/* ══════════ TAB: HISTORIAL DE RECARGAS ══════════ */}
      {tab === 'recharges' && <>
        <div className="dash-stats">
          <div className="dash-stat" style={{'--sc':'#22c55e','--sg':'rgba(34,197,94,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Coins size={20} /></div>
            <div className="dash-stat-val">{totalKCRecharged.toLocaleString()}</div>
            <div className="dash-stat-lbl">{es ? 'KC recargados' : 'KC recharged'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#7c3aed','--sg':'rgba(124,58,237,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Wallet size={20} /></div>
            <div className="dash-stat-val">{rechargeTotalCount}</div>
            <div className="dash-stat-lbl">{es ? 'Total transacciones' : 'Total transactions'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#f59e0b','--sg':'rgba(245,158,11,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><DollarSign size={20} /></div>
            <div className="dash-stat-val">S/ {totalPENRechargedGateway.toFixed(0)}</div>
            {/* Suma pagos en varias divisas reales (USD, MXN, etc.) a su
                equivalente en soles al momento de cada pago — un total
                referencial, no un monto realmente cobrado en soles. */}
            <div className="dash-stat-lbl">{es ? 'Pagado via pasarela (referencial)' : 'Paid via gateway (reference)'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#06b6d4','--sg':'rgba(6,182,212,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Clock size={20} /></div>
            <div className="dash-stat-val">{pendingRecharges}</div>
            <div className="dash-stat-lbl">{es ? 'Pendientes' : 'Pending'}</div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head">
            <h2><Coins size={18} /> {es ? 'Transacciones' : 'Transactions'}</h2>
            <Link to="/recharge" className="btn btn-ghost btn-sm">{es ? 'Recargar' : 'Recharge'} <ArrowRight size={14} /></Link>
          </div>

          {rechargeError ? (
            <div className="dash-empty dash-empty-error">
              <AlertCircle size={48} strokeWidth={1} />
              <p>{es ? 'No se pudo cargar el historial de recargas.' : "Couldn't load the recharge history."}</p>
              <button className="btn btn-primary btn-sm" onClick={retryRecharges}>
                {es ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          ) : rechargeLoading ? (
            <div className="dash-empty">
              <Loader2 size={40} strokeWidth={1.5} className="spin" />
              <p>{es ? 'Cargando historial…' : 'Loading history…'}</p>
            </div>
          ) : rechargeItems.length === 0 ? (
            <div className="dash-empty">
              <Coins size={48} strokeWidth={1} />
              <p>{es ? 'Aun no tienes recargas registradas' : 'No recharges registered yet'}</p>
              <Link to="/recharge" className="btn btn-primary btn-sm">{es ? 'Recargar KC' : 'Recharge KC'}</Link>
            </div>
          ) : (
              <div className="dash-orders">
                {rechargeItems.map(item => {
                  if (item.kind === 'kc') {
                    return (
                      <div className="dash-order-row" key={`kc-${item.id}`}>
                        <div className="dash-order-img">
                          <div className="dash-order-placeholder" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}><Coins size={18} /></div>
                        </div>
                        <div className="dash-order-info">
                          <strong>+{item.amount_kc.toLocaleString()} KC</strong>
                          <span>{item.method === 'manual' ? (es ? 'Recarga manual' : 'Manual recharge') : item.method} — {new Date(item.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                        </div>
                        <KCBadge amount={item.amount_kc} size="sm" />
                        <span className="status-badge" style={{ '--badge-color': '#22c55e' } as React.CSSProperties}>{es ? 'Acreditado' : 'Credited'}</span>
                        <Link to={`/dashboard/comprobantes/recarga/${item.id}`} className="dash-voucher-link">{es ? 'Comprobante' : 'Receipt'}</Link>
                      </div>
                    );
                  } else {
                    const badgeColor = paymentStatusColor(item.status);
                    return (
                      <div className="dash-order-row" key={`pay-${item.id}`}>
                        <div className="dash-order-img">
                          <div className="dash-order-placeholder" style={{ background: badgeColor + '1a', color: badgeColor }}>
                            <CreditCard size={18} />
                          </div>
                        </div>
                        <div className="dash-order-info">
                          <strong>{item.product_name}{item.kc_amount > 0 ? ` (+${item.kc_amount} KC)` : ''}</strong>
                          <span>{item.gateway} — {new Date(item.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                        </div>
                        <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--accent)' }}>{formatCharged(item, lang)}</span>
                        <span className="status-badge" style={{ '--badge-color': badgeColor } as React.CSSProperties}>
                          {paymentStatusLabel(item.status, es)}
                        </span>
                        {(item.status === 'approved' || item.status === 'fulfilled') && (
                          <Link to={`/dashboard/comprobantes/pago/${item.id}`} className="dash-voucher-link">{es ? 'Comprobante' : 'Receipt'}</Link>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
          )}
          {/* La paginación se muestra SIEMPRE que haya más de una página
              (incluso durante la carga o un error) — así el cliente nunca
              pierde de vista en qué página está ni la posibilidad de
              volver a una anterior; los botones se deshabilitan mientras
              hay una petición en vuelo (ver disabled={rechargeLoading}). */}
          <Pagination page={rechargePage} total={rechargePages} setPage={setRechargePage} disabled={rechargeLoading} />
        </div>
      </>}
    </div>
  );
}
