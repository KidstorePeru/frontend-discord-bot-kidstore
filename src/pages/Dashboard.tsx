import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getMyOrders } from '../services/api';
import { KCBadge, StatusBadge, PageLoader } from '../components/UI';
import type { Order } from '../types';
import { Coins, Package, Zap, ArrowRight, Gamepad2, ShoppingBag, TrendingUp, Clock } from 'lucide-react';

export default function Dashboard() {
  const { customer, refresh } = useAuth();
  const { t, lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([refresh(), getMyOrders().then(setOrders).catch(() => [])]).finally(() => setLoading(false));
  }, []);

  if (loading || !customer) return <PageLoader />;

  const sentOrders    = orders.filter(o => o.status === 'sent').length;
  const totalSpent    = orders.reduce((a, o) => a + o.price_kc, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

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
            <ShoppingBag size={16} /> {lang === 'es' ? 'Tienda' : 'Store'}
          </Link>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="dash-stats">
        <div className="dash-stat" style={{'--sc':'#7c3aed','--sg':'rgba(124,58,237,0.12)'} as React.CSSProperties}>
          <div className="dash-stat-icon"><ShoppingBag size={20} /></div>
          <div className="dash-stat-val">{orders.length}</div>
          <div className="dash-stat-lbl">{lang === 'es' ? 'Pedidos totales' : 'Total orders'}</div>
        </div>
        <div className="dash-stat" style={{'--sc':'#22c55e','--sg':'rgba(34,197,94,0.12)'} as React.CSSProperties}>
          <div className="dash-stat-icon"><Package size={20} /></div>
          <div className="dash-stat-val">{sentOrders}</div>
          <div className="dash-stat-lbl">{lang === 'es' ? 'Items recibidos' : 'Items received'}</div>
        </div>
        <div className="dash-stat" style={{'--sc':'#f59e0b','--sg':'rgba(245,158,11,0.12)'} as React.CSSProperties}>
          <div className="dash-stat-icon"><TrendingUp size={20} /></div>
          <div className="dash-stat-val">{totalSpent.toLocaleString()}</div>
          <div className="dash-stat-lbl">{lang === 'es' ? 'KC gastados' : 'KC spent'}</div>
        </div>
        <div className="dash-stat" style={{'--sc':'#06b6d4','--sg':'rgba(6,182,212,0.12)'} as React.CSSProperties}>
          <div className="dash-stat-icon"><Clock size={20} /></div>
          <div className="dash-stat-val">{pendingOrders}</div>
          <div className="dash-stat-lbl">{lang === 'es' ? 'En proceso' : 'In process'}</div>
        </div>
      </div>

      {/* ── Orders ── */}
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
          <div className="dash-orders">
            {orders.map(o => (
              <div className="dash-order-row" key={o.id}>
                <div className="dash-order-img">
                  {o.item_image
                    ? <img src={o.item_image} alt={o.item_name} />
                    : <div className="dash-order-placeholder"><Gamepad2 size={18} /></div>}
                </div>
                <div className="dash-order-info">
                  <strong>{o.item_name}</strong>
                  <span>{new Date(o.created_at).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', { day:'numeric', month:'short', year:'numeric' })}</span>
                </div>
                <KCBadge amount={o.price_kc} size="sm" />
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
