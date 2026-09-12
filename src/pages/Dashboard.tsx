import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getMyOrders, getMyRecharges, getMyOrderStats, getMyRechargeStats } from '../services/api';
import { KCBadge, StatusBadge, PageLoader } from '../components/UI';
import SegTabs from '../components/SegTabs';
import type { Order } from '../types';
import { Package, Zap, ArrowRight, Gamepad2, ShoppingBag, TrendingUp, Clock, Coins, CreditCard, ChevronLeft, ChevronRight, Wallet, DollarSign } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

type DashTab = 'orders' | 'recharges';
const DASH_TABS: DashTab[] = ['orders', 'recharges'];
const PER_PAGE = 10;

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
  const [recharges, setRecharges] = useState<{ id: string; amount_kc: number; amount_soles: number | null; method: string; created_at: string }[]>([]);
  const [payments, setPayments] = useState<{ id: string; gateway: string; payment_type: string; product_name: string; amount_pen: number; kc_amount: number; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [rechargePage, setRechargePage] = useState(1);
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
        getMyRecharges().then(r => { if (!cancelled) { setRecharges(r.recharges); setPayments(r.payments); } }).catch(() => {}),
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

  // ── KC recharge payments only (product_purchase payments no longer exist) ──
  const kcPayments = payments.filter(p => p.payment_type === 'kc_recharge');

  // ── Order stats (calculados en el servidor sobre todo el historial) ──
  const sentOrders    = orderStats.sent_orders;
  const totalSpent     = orderStats.total_spent_kc;
  const pendingOrders = orderStats.pending_orders;

  // ── Recharge stats (idem — total_pen_recharged ya excluye pagos
  // pendientes/fallidos, nunca los suma como si fueran plata cobrada) ──
  const totalKCRecharged = rechargeStats.total_kc_recharged;
  const totalPENRechargedGateway = rechargeStats.total_pen_recharged;
  const pendingRecharges = rechargeStats.pending_payments;

  // ── Recharge items: manual KC + gateway KC ──
  const allRechargeItemsFiltered = [
    ...recharges.map(r => ({ ...r, _type: 'kc' as const })),
    ...kcPayments.map(p => ({ ...p, _type: 'pay' as const })),
  ];
  allRechargeItemsFiltered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Pagination ──
  const orderPages = Math.ceil(orders.length / PER_PAGE) || 1;
  const pagedOrders = orders.slice((orderPage - 1) * PER_PAGE, orderPage * PER_PAGE);
  const rechargePages = Math.ceil(allRechargeItemsFiltered.length / PER_PAGE) || 1;
  const pagedRecharges = allRechargeItemsFiltered.slice((rechargePage - 1) * PER_PAGE, rechargePage * PER_PAGE);

  function Pagination({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
    if (total <= 1) return null;
    return (
      <div className="dash-pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14}/></button>
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
        ))}
        <button disabled={page >= total} onClick={() => setPage(page + 1)}><ChevronRight size={14}/></button>
      </div>
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
            <div className="dash-stat-val">{recharges.length + kcPayments.length}</div>
            <div className="dash-stat-lbl">{es ? 'Total transacciones' : 'Total transactions'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#f59e0b','--sg':'rgba(245,158,11,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><DollarSign size={20} /></div>
            <div className="dash-stat-val">S/ {totalPENRechargedGateway.toFixed(0)}</div>
            <div className="dash-stat-lbl">{es ? 'Pagado via pasarela' : 'Paid via gateway'}</div>
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

          {allRechargeItemsFiltered.length === 0 ? (
            <div className="dash-empty">
              <Coins size={48} strokeWidth={1} />
              <p>{es ? 'Aun no tienes recargas registradas' : 'No recharges registered yet'}</p>
              <Link to="/recharge" className="btn btn-primary btn-sm">{es ? 'Recargar KC' : 'Recharge KC'}</Link>
            </div>
          ) : (
            <>
              <div className="dash-orders">
                {pagedRecharges.map(item => {
                  if (item._type === 'kc') {
                    const r = item as typeof recharges[0] & { _type: 'kc' };
                    return (
                      <div className="dash-order-row" key={`kc-${r.id}`}>
                        <div className="dash-order-img">
                          <div className="dash-order-placeholder" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}><Coins size={18} /></div>
                        </div>
                        <div className="dash-order-info">
                          <strong>+{r.amount_kc.toLocaleString()} KC</strong>
                          <span>{r.method === 'manual' ? (es ? 'Recarga manual' : 'Manual recharge') : r.method} — {new Date(r.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                        </div>
                        <KCBadge amount={r.amount_kc} size="sm" />
                        <span className="status-badge" style={{ '--badge-color': '#22c55e' } as React.CSSProperties}>{es ? 'Acreditado' : 'Credited'}</span>
                        <Link to={`/dashboard/comprobantes/recarga/${r.id}`} className="dash-voucher-link">{es ? 'Comprobante' : 'Receipt'}</Link>
                      </div>
                    );
                  } else {
                    const p = item as typeof payments[0] & { _type: 'pay' };
                    return (
                      <div className="dash-order-row" key={`pay-${p.id}`}>
                        <div className="dash-order-img">
                          <div className="dash-order-placeholder" style={{
                            background: p.status === 'approved' ? 'rgba(34,197,94,0.1)' : p.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(220,38,38,0.1)',
                            color: p.status === 'approved' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#dc2626',
                          }}>
                            <CreditCard size={18} />
                          </div>
                        </div>
                        <div className="dash-order-info">
                          <strong>{p.product_name}{p.kc_amount > 0 ? ` (+${p.kc_amount} KC)` : ''}</strong>
                          <span>{p.gateway} — {new Date(p.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                        </div>
                        <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--accent)' }}>S/ {p.amount_pen.toFixed(2)}</span>
                        <span className="status-badge" style={{ '--badge-color': p.status === 'approved' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#dc2626' } as React.CSSProperties}>
                          {p.status === 'approved' ? (es ? 'Aprobado' : 'Approved') : p.status === 'pending' ? (es ? 'Pendiente' : 'Pending') : (es ? 'Fallido' : 'Failed')}
                        </span>
                        {(p.status === 'approved' || p.status === 'fulfilled') && (
                          <Link to={`/dashboard/comprobantes/pago/${p.id}`} className="dash-voucher-link">{es ? 'Comprobante' : 'Receipt'}</Link>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
              <Pagination page={rechargePage} total={rechargePages} setPage={setRechargePage} />
            </>
          )}
        </div>
      </>}
    </div>
  );
}
