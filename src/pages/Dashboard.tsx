import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getMyOrders, getMyRecharges } from '../services/api';
import { KCBadge, StatusBadge, PageLoader } from '../components/UI';
import type { Order } from '../types';
import { Package, Zap, ArrowRight, Gamepad2, ShoppingBag, TrendingUp, Clock, Coins, CreditCard, ChevronLeft, ChevronRight, Wallet, DollarSign, Copy } from 'lucide-react';

type DashTab = 'orders' | 'recharges' | 'purchases';
const PER_PAGE = 10;

export default function Dashboard() {
  const { customer, refresh } = useAuth();
  const { t, lang } = useLang();
  const es = lang === 'es';
  const [tab, setTab] = useState<DashTab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [recharges, setRecharges] = useState<{ id: string; amount_kc: number; amount_soles: number | null; method: string; created_at: string }[]>([]);
  const [payments, setPayments] = useState<{ id: string; gateway: string; payment_type: string; product_name: string; amount_pen: number; kc_amount: number; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [rechargePage, setRechargePage] = useState(1);
  const [purchasePage, setPurchasePage] = useState(1);

  useEffect(() => {
    Promise.all([
      refresh(),
      getMyOrders(1, 100).then(r => setOrders(r.orders)).catch(() => []),
      getMyRecharges().then(r => { setRecharges(r.recharges); setPayments(r.payments); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading || !customer) return <PageLoader />;

  // ── Separate payments by type ──
  const productPurchases = payments.filter(p => p.payment_type === 'product_purchase');
  const kcPayments = payments.filter(p => p.payment_type === 'kc_recharge');

  // ── Order stats ──
  const sentOrders    = orders.filter(o => o.status === 'sent').length;
  const totalSpent    = orders.reduce((a, o) => a + o.price_kc, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  // ── Recharge stats ──
  const totalKCRecharged = recharges.reduce((a, r) => a + r.amount_kc, 0);
  const totalPENRechargedGateway = kcPayments.reduce((a, p) => a + p.amount_pen, 0);
  const pendingRecharges = kcPayments.filter(p => p.status === 'pending').length;

  // ── Purchase stats ──
  const totalPENProducts = productPurchases.reduce((a, p) => a + p.amount_pen, 0);
  const approvedPurchases = productPurchases.filter(p => p.status === 'approved').length;
  const pendingPurchases = productPurchases.filter(p => p.status === 'pending').length;

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
  const purchasePages = Math.ceil(productPurchases.length / PER_PAGE) || 1;
  const pagedPurchases = productPurchases.slice((purchasePage - 1) * PER_PAGE, purchasePage * PER_PAGE);

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
      <div className="dash-tabs">
        <button className={`dash-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          <Package size={16}/> {es ? 'Mis Pedidos' : 'My Orders'}
        </button>
        <button className={`dash-tab ${tab === 'recharges' ? 'active' : ''}`} onClick={() => setTab('recharges')}>
          <Coins size={16}/> {es ? 'Historial de Recargas' : 'Recharge History'}
        </button>
        <button className={`dash-tab ${tab === 'purchases' ? 'active' : ''}`} onClick={() => setTab('purchases')}>
          <CreditCard size={16}/> {es ? 'Mis Compras' : 'My Purchases'}
        </button>
      </div>

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

      {/* ══════════ TAB: MIS COMPRAS ══════════ */}
      {tab === 'purchases' && <>
        <div className="dash-stats">
          <div className="dash-stat" style={{'--sc':'#7c3aed','--sg':'rgba(124,58,237,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><CreditCard size={20} /></div>
            <div className="dash-stat-val">{productPurchases.length}</div>
            <div className="dash-stat-lbl">{es ? 'Compras totales' : 'Total purchases'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#22c55e','--sg':'rgba(34,197,94,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Package size={20} /></div>
            <div className="dash-stat-val">{approvedPurchases}</div>
            <div className="dash-stat-lbl">{es ? 'Aprobadas' : 'Approved'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#f59e0b','--sg':'rgba(245,158,11,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><DollarSign size={20} /></div>
            <div className="dash-stat-val">S/ {totalPENProducts.toFixed(0)}</div>
            <div className="dash-stat-lbl">{es ? 'Total gastado' : 'Total spent'}</div>
          </div>
          <div className="dash-stat" style={{'--sc':'#06b6d4','--sg':'rgba(6,182,212,0.12)'} as React.CSSProperties}>
            <div className="dash-stat-icon"><Clock size={20} /></div>
            <div className="dash-stat-val">{pendingPurchases}</div>
            <div className="dash-stat-lbl">{es ? 'Pendientes' : 'Pending'}</div>
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-head">
            <h2><CreditCard size={18} /> {es ? 'Compras de productos' : 'Product purchases'}</h2>
            <Link to="/store" className="btn btn-ghost btn-sm">{es ? 'Ir a la tienda' : 'Go to store'} <ArrowRight size={14} /></Link>
          </div>

          {productPurchases.length === 0 ? (
            <div className="dash-empty">
              <CreditCard size={48} strokeWidth={1} />
              <p>{es ? 'Aun no tienes compras de productos' : 'No product purchases yet'}</p>
              <Link to="/store" className="btn btn-primary btn-sm">{es ? 'Ver productos' : 'Browse products'}</Link>
            </div>
          ) : (
            <>
              <div className="dash-orders">
                {pagedPurchases.map(p => (
                  <div className="dash-order-row" key={p.id}>
                    <div className="dash-order-img">
                      <div className="dash-order-placeholder" style={{
                        background: p.status === 'approved' ? 'rgba(34,197,94,0.1)' : p.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(220,38,38,0.1)',
                        color: p.status === 'approved' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#dc2626',
                      }}>
                        <CreditCard size={18} />
                      </div>
                    </div>
                    <div className="dash-order-info">
                      <strong>{p.product_name}</strong>
                      <span>{p.gateway} — {new Date(p.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                      {/* eslint-disable @typescript-eslint/no-explicit-any */}
                      {(p as any).activation_code && (
                        <div className="dash-activation-code">
                          <span className="dash-code-label">{es ? 'Codigo:' : 'Code:'}</span>
                          <code className="dash-code-value">{(p as any).activation_code}</code>
                          <button className="dash-code-copy" onClick={() => { navigator.clipboard.writeText((p as any).activation_code); }} title={es ? 'Copiar' : 'Copy'}>
                            <Copy size={11}/>
                          </button>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--accent)' }}>S/ {p.amount_pen.toFixed(2)}</span>
                    <span className="status-badge" style={{ '--badge-color': p.status === 'approved' ? '#22c55e' : p.status === 'pending' ? '#f59e0b' : '#dc2626' } as React.CSSProperties}>
                      {p.status === 'approved' ? (es ? 'Aprobado' : 'Approved') : p.status === 'pending' ? (es ? 'Pendiente' : 'Pending') : (es ? 'Fallido' : 'Failed')}
                    </span>
                  </div>
                ))}
              </div>
              <Pagination page={purchasePage} total={purchasePages} setPage={setPurchasePage} />
            </>
          )}
        </div>
      </>}
    </div>
  );
}
