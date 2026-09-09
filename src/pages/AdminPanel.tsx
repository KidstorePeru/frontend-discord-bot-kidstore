import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tryRefreshToken } from '../services/api';
import { KCBadge, StatusBadge, Toast } from '../components/UI';
import type { Customer, Order } from '../types';
import {
  Users, Package, TrendingUp, Coins, Search, Loader2,
  CheckCircle2, RefreshCw, ShieldCheck, Bot,
  Plus, Trash2, ExternalLink, Copy, Zap, X, Edit2,
  AlertTriangle, Gamepad2, Mail, Clock, Moon, Sun, ToggleLeft, ToggleRight,
  CreditCard, ClipboardList, Send
} from 'lucide-react';

type AdminTab = 'stats' | 'customers' | 'orders' | 'recharge' | 'bots' | 'schedule' | 'payments' | 'complaints';
const ADMIN_TABS: AdminTab[] = ['stats', 'customers', 'orders', 'recharge', 'bots', 'schedule', 'payments', 'complaints'];
const ADMIN_PER_PAGE = 10;

function AdminPagination({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="admin-pagination">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>&laquo;</button>
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
      ))}
      <button disabled={page >= total} onClick={() => setPage(page + 1)}>&raquo;</button>
    </div>
  );
}
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

async function adminFetch(path: string, _adminKey?: string, opts: RequestInit = {}) {
  const apiKey = _adminKey || sessionStorage.getItem('kc_admin_key') || '';
  const doFetch = () => {
    const token = localStorage.getItem('kc_token') || '';
    return fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(apiKey ? { 'X-Admin-Key': apiKey } : {}),
        ...(opts.headers as Record<string, string> || {}),
      },
    });
  };

  let res = await doFetch();
  let body = await res.json().catch(() => ({}));

  // Un token vencido (sesión de más de 1h) antes tiraba error directo acá
  // — el panel admin no tenía NINGUNA renovación automática, a diferencia
  // del resto del sitio. Se comparte la misma renovación "single-flight"
  // que usa el resto de la app (services/api.ts): si otra llamada ya está
  // renovando, esta espera el mismo resultado en vez de fallar aparte. Si
  // la petición se autenticó con X-Admin-Key (no JWT), renovar no cambia
  // nada — el reintento igual no hace daño, simplemente no ayuda.
  if (!res.ok && (res.status === 401 || body?.code === 'TOKEN_EXPIRED') && localStorage.getItem('kc_refresh_token')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch();
      body = await res.json().catch(() => ({}));
    }
  }

  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

interface BotAccount {
  id: string; display_name: string;
  remaining_gifts: number; vbucks: number;
  is_active: boolean; created_at: string;
}

interface BotSchedule {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  timezone: string;
  updated_at: string;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

// Tiempo relativo simple (ej. "hace 3 días") para no mostrar solo la fecha cruda.
function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  return `hace ${years} año${years > 1 ? 's' : ''}`;
}

export default function AdminPanel() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab: string }>();
  const tab: AdminTab = (tabParam && ADMIN_TABS.includes(tabParam as AdminTab)) ? (tabParam as AdminTab) : 'stats';
  const authed = isAdmin;
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search,   setSearch]   = useState('');

  const [stats, setStats] = useState<any>(null);
  const [slotPeriod, setSlotPeriod] = useState<'today' | 'week' | 'month' | 'all_time'>('all_time');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custTotal,   setCustTotal]   = useState(0);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [orderTotal,  setOrderTotal]  = useState(0);
  const [custPage,    setCustPage]    = useState(1);
  const [orderPage,   setOrderPage]   = useState(1);
  const [payments,    setPayments]    = useState<any[]>([]);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [paymentPage, setPaymentPage] = useState(1);
  const [payFilter,   setPayFilter]   = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [bots,      setBots]      = useState<BotAccount[]>([]);

  // Libro de Reclamaciones
  const [complaints,     setComplaints]     = useState<any[]>([]);
  const [complaintPage,  setComplaintPage]  = useState(1);
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [respondTarget,  setRespondTarget]  = useState<any | null>(null);
  const [respondText,    setRespondText]    = useState('');
  const [respondLoading, setRespondLoading] = useState(false);

  // Schedule
  const [schedule,        setSchedule]        = useState<BotSchedule | null>(null);
  const [schedEnabled,    setSchedEnabled]    = useState(true);
  const [schedStart,      setSchedStart]      = useState(0);
  const [schedEnd,        setSchedEnd]        = useState(9);
  const [schedTimezone,   setSchedTimezone]   = useState('America/Lima');
  const [schedLoading,    setSchedLoading]    = useState(false);
  const [schedSaved,      setSchedSaved]      = useState(false);

  // Recharge
  const [rSearch,     setRSearch]     = useState('');
  const [rSelected,   setRSelected]   = useState<Customer | null>(null);
  const [rAmount,     setRAmount]     = useState('');
  const [rSoles,      setRSoles]      = useState('');
  const [rNote,       setRNote]       = useState('');
  const [rLoading,    setRLoading]    = useState(false);
  const [rCustomers,  setRCustomers]  = useState<Customer[]>([]);
  const [rCustLoaded, setRCustLoaded] = useState(false);

  // Bot connect
  const [connectStep,    setConnectStep]    = useState<'idle'|'waiting'>('idle');
  const [connectData,    setConnectData]    = useState<{login_url:string;user_code:string;device_code:string}|null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [verifying,      setVerifying]      = useState(false);

  // Bot edit
  const [editBot,     setEditBot]     = useState<BotAccount|null>(null);
  const [editVbucks,  setEditVbucks]  = useState('');
  const [editGifts,   setEditGifts]   = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Customer edit
  const [editCustomer,    setEditCustomer]    = useState<Customer|null>(null);
  const [editEpic,        setEditEpic]        = useState('');
  const [editEmail,       setEditEmail]       = useState('');
  const [editKC,          setEditKC]          = useState('');
  const [editCustLoading, setEditCustLoading] = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState<Customer|null>(null);
  const [deleteLoading,   setDeleteLoading]   = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/dashboard');
  }, [authLoading, isAdmin, navigate]);

  // customers/orders/payments se cargan con efectos dedicados más abajo
  // (dependen de página/búsqueda/filtro, no solo del cambio de pestaña) —
  // este efecto general cubre el resto.
  useEffect(() => {
    if (!authed) return;
    if (tab === 'customers' || tab === 'orders' || tab === 'payments') return;
    loadTab(tab);
  }, [authed, tab]);

  // Antes, el panel pedía un solo lote SIN page/limit/search y paginaba (y
  // "buscaba") solo dentro de ese primer lote — con más clientes/pedidos de
  // los que entraban ahí, ninguna página ni búsqueda podía llegar a
  // encontrarlos. Ahora page/limit/search van al servidor en cada pedido,
  // que ya soporta ambos (ver db.GetAllCustomers/GetAllOrders/GetAllPaymentTransactions).
  useEffect(() => {
    if (!authed || tab !== 'customers') return;
    const h = setTimeout(() => loadTab('customers'), search ? 300 : 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab, custPage, search]);

  useEffect(() => {
    if (!authed || tab !== 'orders') return;
    const h = setTimeout(() => loadTab('orders'), search ? 300 : 0);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab, orderPage, search, orderFilter]);

  useEffect(() => {
    if (!authed || tab !== 'payments') return;
    loadTab('payments');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, tab, paymentPage, payFilter]);

  async function loadTab(t: AdminTab) {
    setLoading(true);
    try {
      if (t === 'stats')    setStats(await adminFetch('/admin/stats'));
      else if (t === 'customers') {
        const qs = new URLSearchParams({ page: String(custPage), limit: String(ADMIN_PER_PAGE), search }).toString();
        const r = await adminFetch(`/admin/customers?${qs}`);
        setCustomers(r.customers || []); setCustTotal(r.total || 0);
      }
      else if (t === 'orders') {
        const qs = new URLSearchParams({ page: String(orderPage), limit: String(ADMIN_PER_PAGE), search, status: orderFilter }).toString();
        const r = await adminFetch(`/admin/orders?${qs}`);
        setOrders(r.orders || []); setOrderTotal(r.total || 0);
      }
      else if (t === 'bots')      { const r = await adminFetch('/admin/bots'); setBots(r.accounts || []); }
      else if (t === 'recharge' && !rCustLoaded) {
        const r = await adminFetch('/admin/customers?limit=200');
        setRCustomers(r.customers || []); setRCustLoaded(true);
      }
      else if (t === 'payments') {
        const qs = new URLSearchParams({ page: String(paymentPage), limit: String(ADMIN_PER_PAGE), status: payFilter }).toString();
        const r = await adminFetch(`/admin/payments?${qs}`);
        setPayments(r.payments || []); setPaymentTotal(r.total || 0);
      }
      else if (t === 'complaints') {
        const r = await adminFetch('/admin/complaints?limit=200');
        setComplaints(r.complaints || []);
      }
      else if (t === 'schedule') {
        const r = await adminFetch('/admin/bot-schedule');
        const s: BotSchedule = r.schedule;
        setSchedule(s);
        setSchedEnabled(s.enabled);
        setSchedStart(s.start_hour);
        setSchedEnd(s.end_hour);
        setSchedTimezone(s.timezone);
      }
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message :'Error cargando datos', type: 'error' }); }
    finally { setLoading(false); }
  }

  // ── Schedule ──
  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSchedLoading(true); setSchedSaved(false);
    try {
      const res = await adminFetch('/admin/bot-schedule', undefined, {
        method: 'PUT',
        body: JSON.stringify({
          enabled:    schedEnabled,
          start_hour: schedStart,
          end_hour:   schedEnd,
          timezone:   schedTimezone,
        }),
      });
      setSchedule(res.schedule);
      setSchedSaved(true);
      setToast({ msg: `✅ Horario actualizado: ${schedEnabled ? `${pad(schedStart)}:00 — ${pad(schedEnd)}:00` : 'Deshabilitado'}`, type: 'success' });
      setTimeout(() => setSchedSaved(false), 3000);
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : 'Error guardando horario', type: 'error' });
    } finally { setSchedLoading(false); }
  }

  // ── Recharge ──
  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault(); if (!rSelected) return; setRLoading(true);
    try {
      const res = await adminFetch('/admin/recharge', undefined, {
        method: 'POST', headers: { 'X-Approved-By': 'admin-panel' },
        body: JSON.stringify({ customer_id: rSelected.id, amount_kc: parseInt(rAmount), amount_soles: rSoles ? parseFloat(rSoles) : undefined, note: rNote || undefined }),
      });
      setToast({ msg: `✅ ${res.message} — Nuevo balance: ${res.new_balance.toLocaleString()} KC`, type: 'success' });
      setRSelected(null); setRAmount(''); setRSoles(''); setRNote(''); setRSearch('');
      setRCustomers(prev => prev.map(c => c.id === rSelected.id ? {...c, kc_balance: res.new_balance} : c));
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message :'Error recargando KC', type: 'error' }); }
    finally { setRLoading(false); }
  }

  // ── Edit Customer ──
  function openEditCustomer(c: Customer) {
    setEditCustomer(c); setEditEpic(c.epic_username);
    setEditEmail(c.email ?? ''); setEditKC(String(c.kc_balance));
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault(); if (!editCustomer) return; setEditCustLoading(true);
    try {
      await adminFetch(`/admin/customers/${editCustomer.id}`, undefined, {
        method: 'PUT',
        body: JSON.stringify({
          epic_username: editEpic !== editCustomer.epic_username ? editEpic : undefined,
          email: editEmail !== editCustomer.email ? editEmail : undefined,
          kc_balance: parseInt(editKC) !== editCustomer.kc_balance ? parseInt(editKC) : undefined,
        }),
      });
      setToast({ msg: `✅ Cliente actualizado`, type: 'success' });
      setCustomers(prev => prev.map(c => c.id === editCustomer.id ? {...c, epic_username: editEpic, email: editEmail, kc_balance: parseInt(editKC)} : c));
      setRCustomers(prev => prev.map(c => c.id === editCustomer.id ? {...c, epic_username: editEpic, email: editEmail, kc_balance: parseInt(editKC)} : c));
      setEditCustomer(null);
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message :'Error actualizando cliente', type: 'error' }); }
    finally { setEditCustLoading(false); }
  }

  async function handleDeleteCustomer() {
    if (!deleteConfirm) return; setDeleteLoading(true);
    try {
      await adminFetch(`/admin/customers/${deleteConfirm.id}`, undefined, { method: 'DELETE' });
      setToast({ msg: `✅ Cliente ${deleteConfirm.epic_username} eliminado`, type: 'success' });
      setCustomers(prev => prev.filter(c => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message :'Error eliminando cliente', type: 'error' }); }
    finally { setDeleteLoading(false); }
  }

  // ── Libro de Reclamaciones ──
  async function handleRespondComplaint(e: React.FormEvent) {
    e.preventDefault(); if (!respondTarget || !respondText.trim()) return; setRespondLoading(true);
    try {
      await adminFetch(`/admin/complaints/${respondTarget.id}/respond`, undefined, {
        method: 'PUT', body: JSON.stringify({ response: respondText.trim() }),
      });
      setToast({ msg: '✅ Respuesta enviada al consumidor', type: 'success' });
      setComplaints(prev => prev.map(c => c.id === respondTarget.id ? { ...c, status: 'respondido', admin_response: respondText.trim() } : c));
      setRespondTarget(null); setRespondText('');
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message : 'Error enviando respuesta', type: 'error' }); }
    finally { setRespondLoading(false); }
  }

  async function handleCloseComplaint(id: string) {
    try {
      await adminFetch(`/admin/complaints/${id}/close`, undefined, { method: 'PUT' });
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'cerrado' } : c));
      setToast({ msg: '✅ Reclamo cerrado', type: 'success' });
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message : 'Error cerrando reclamo', type: 'error' }); }
  }

  // ── Bots ──
  async function handleStartConnect() {
    setConnectLoading(true);
    try {
      const res = await adminFetch('/admin/bots/connect', undefined, { method: 'POST' });
      setConnectData({ login_url: res.login_url, user_code: res.user_code, device_code: res.device_code });
      setConnectStep('waiting'); window.open(res.login_url, '_blank');
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message :'Error iniciando vinculación', type: 'error' }); }
    finally { setConnectLoading(false); }
  }
  async function handleFinishConnect() {
    if (!connectData) return; setConnectLoading(true);
    try {
      const res = await adminFetch('/admin/bots/finish', undefined, { method: 'POST', body: JSON.stringify({ device_code: connectData.device_code }) });
      setToast({ msg: `✅ Cuenta ${res.display_name} vinculada correctamente`, type: 'success' });
      setConnectStep('idle'); setConnectData(null); loadTab('bots');
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message :'Error. Asegúrate de haber iniciado sesión en Epic.', type: 'error' }); }
    finally { setConnectLoading(false); }
  }
  async function handleVerifyTokens() {
    setVerifying(true);
    try {
      const res = await adminFetch('/admin/bots/verify', undefined, { method: 'POST' });
      setToast({ msg: `🔍 ${res.message}`, type: 'success' });
      setTimeout(() => loadTab('bots'), 4000);
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message : 'Error', type: 'error' }); }
    finally { setVerifying(false); }
  }
  async function handleDisconnect(accountId: string, displayName: string) {
    if (!confirm(`¿Desconectar ${displayName}?`)) return;
    try {
      await adminFetch('/admin/bots/disconnect', undefined, { method: 'POST', body: JSON.stringify({ account_id: accountId }) });
      setToast({ msg: `✅ ${displayName} desconectada`, type: 'success' }); loadTab('bots');
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message : 'Error', type: 'error' }); }
  }
  function openEditBot(bot: BotAccount) { setEditBot(bot); setEditVbucks(String(bot.vbucks)); setEditGifts(String(bot.remaining_gifts)); }
  async function handleSaveBot(e: React.FormEvent) {
    e.preventDefault(); if (!editBot) return; setEditLoading(true);
    try {
      await adminFetch('/admin/bots/gifts', undefined, { method: 'POST', body: JSON.stringify({ account_id: editBot.id, remaining_gifts: parseInt(editGifts) }) });
      if (parseInt(editVbucks) !== editBot.vbucks)
        await adminFetch('/admin/bots/vbucks', undefined, { method: 'POST', body: JSON.stringify({ account_id: editBot.id, vbucks: parseInt(editVbucks) }) });
      setToast({ msg: `✅ ${editBot.display_name} actualizado`, type: 'success' });
      setEditBot(null); loadTab('bots');
    } catch (err: unknown) { setToast({ msg: err instanceof Error ? err.message : 'Error', type: 'error' }); }
    finally { setEditLoading(false); }
  }

  useEffect(() => { setCustPage(1); setOrderPage(1); }, [search]);
  useEffect(() => { setOrderPage(1); }, [orderFilter]);
  useEffect(() => { setPaymentPage(1); }, [payFilter]);

  // customers/orders/payments ya llegan paginados, buscados y filtrados
  // por el servidor (ver loadTab) — se mantienen estos alias para no tocar
  // cada punto del render de abajo, pero ya no se vuelve a filtrar ni
  // recortar nada del lado del cliente (antes SÍ, y ahí estaba el bug: solo
  // se veía lo que hubiera entrado en el primer lote sin paginar).
  const filteredCustomers = customers;
  const custTotalPages = Math.max(1, Math.ceil(custTotal / ADMIN_PER_PAGE));
  const pagedCustomers = customers;

  const displayedOrders = orders;
  const orderTotalPages = Math.max(1, Math.ceil(orderTotal / ADMIN_PER_PAGE));

  const filteredPayments = payments;
  const paymentTotalPages = Math.max(1, Math.ceil(paymentTotal / ADMIN_PER_PAGE));
  const filteredComplaints = complaintFilter === 'all' ? complaints : complaints.filter((c: any) => c.status === complaintFilter);
  const filteredRCustomers = rCustomers.filter(c =>
    c.epic_username.toLowerCase().includes(rSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(rSearch.toLowerCase())
  );

  // ── NOT ADMIN → redirect (handled by useEffect) ──
  if (!authed) return (
    <div className="admin-login-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-icon"><ShieldCheck size={28}/></div>
        <h1>Panel de Administrador</h1>
        <p className="auth-sub">Verificando permisos...</p>
        <Loader2 size={24} className="spin" style={{ margin: '16px auto', color: 'var(--accent)' }}/>
      </div>
    </div>
  );

  if (!tabParam || !ADMIN_TABS.includes(tabParam as AdminTab)) {
    return <Navigate to="/admin/stats" replace />;
  }

  return (
    <div className="admin-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      {/* ── Modal editar bot ── */}
      {editBot && (
        <div className="adm-modal-overlay" onClick={() => setEditBot(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2><Bot size={16}/> {editBot.display_name}</h2>
              <button onClick={() => setEditBot(null)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveBot} className="adm-modal-body">
              <div className="sec-field">
                <label><Zap size={13}/> Gifts restantes (máx. 5/día)</label>
                <input type="number" min="0" max="10" value={editGifts} onChange={e => setEditGifts(e.target.value)} required/>
              </div>
              <div className="sec-field">
                <label><Coins size={13}/> V-Bucks (edición manual)</label>
                <input type="number" min="0" value={editVbucks} onChange={e => setEditVbucks(e.target.value)} required/>
                <span className="sec-note" style={{padding:'6px 10px',fontSize:'0.72rem'}}>Se descuentan automáticamente con cada compra exitosa</span>
              </div>
              <div className="adm-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditBot(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? <Loader2 className="spin" size={15}/> : <CheckCircle2 size={15}/>} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal editar cliente ── */}
      {editCustomer && (
        <div className="adm-modal-overlay" onClick={() => setEditCustomer(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2><Edit2 size={16}/> Editar cliente</h2>
              <button onClick={() => setEditCustomer(null)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveCustomer} className="adm-modal-body">
              <div className="adm-modal-customer-info">
                <div className="adm-modal-avatar">{editCustomer.epic_username[0].toUpperCase()}</div>
                <div>
                  <strong>{editCustomer.epic_username}</strong>
                  <span>ID: {editCustomer.id}</span>
                </div>
              </div>
              <div className="sec-field">
                <label><Gamepad2 size={13}/> Usuario Epic</label>
                <input type="text" value={editEpic} onChange={e => setEditEpic(e.target.value)} required minLength={3}/>
              </div>
              <div className="sec-field">
                <label><Mail size={13}/> Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required/>
              </div>
              <div className="sec-field">
                <label><Coins size={13}/> Balance KC</label>
                <input type="number" min="0" value={editKC} onChange={e => setEditKC(e.target.value)} required/>
              </div>
              {parseInt(editKC) !== editCustomer.kc_balance && (
                <div className="adm-modal-preview">
                  <span>Balance anterior: <strong>{editCustomer.kc_balance.toLocaleString()} KC</strong></span>
                  <span>→ Nuevo: <strong style={{color:'var(--green-500)'}}>{parseInt(editKC||'0').toLocaleString()} KC</strong></span>
                </div>
              )}
              <div className="adm-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditCustomer(null)}>Cancelar</button>
                <button type="button" className="adm-delete-btn" onClick={() => { setEditCustomer(null); setDeleteConfirm(editCustomer); }}>
                  <Trash2 size={14}/> Eliminar
                </button>
                <button type="submit" className="btn btn-primary" disabled={editCustLoading}>
                  {editCustLoading ? <Loader2 className="spin" size={15}/> : <CheckCircle2 size={15}/>} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ── */}
      {deleteConfirm && (
        <div className="adm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="adm-modal adm-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-head adm-modal-danger-head">
              <h2><AlertTriangle size={16}/> Eliminar cliente</h2>
              <button onClick={() => setDeleteConfirm(null)}><X size={18}/></button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-delete-warning">
                <AlertTriangle size={32} style={{color:'var(--red-500)'}}/>
                <p>¿Estás seguro de eliminar a <strong>{deleteConfirm.epic_username}</strong>?</p>
                <p className="adm-delete-sub">Se eliminarán todos sus datos, pedidos y balance de <strong>{deleteConfirm.kc_balance.toLocaleString()} KC</strong>. Esta acción es irreversible.</p>
              </div>
              <div className="adm-modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                <button className="adm-delete-btn" onClick={handleDeleteCustomer} disabled={deleteLoading}>
                  {deleteLoading ? <Loader2 className="spin" size={15}/> : <Trash2 size={15}/>} Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Panel de Administrador</h1>
          <p className="admin-sub">KidStorePeru — Gestión interna</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => loadTab(tab)}><RefreshCw size={15}/> Actualizar</button>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        {([
          ['stats',    'Estadísticas', <TrendingUp size={15}/>],
          ['customers','Clientes',     <Users size={15}/>],
          ['orders',   'Pedidos',      <Package size={15}/>],
          ['recharge', 'Recargar KC',  <Coins size={15}/>],
          ['bots',     'Cuentas Bot',  <Bot size={15}/>],
          ['payments', 'Pagos',        <CreditCard size={15}/>],
          ['schedule', 'Horario Bots', <Clock size={15}/>],
          ['complaints', 'Reclamos',   <ClipboardList size={15}/>],
        ] as [AdminTab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <Link key={key} to={`/admin/${key}`} className={`admin-tab ${tab===key?'active':''}`}>
            {icon} {label}
            {key === 'complaints' && complaints.some((c: any) => c.status === 'pendiente') && (
              <span className="adm-tab-badge">{complaints.filter((c: any) => c.status === 'pendiente').length}</span>
            )}
          </Link>
        ))}
      </div>

      {loading && tab !== 'recharge' && tab !== 'bots' && tab !== 'schedule' && (
        <div className="admin-loading"><Loader2 className="spin" size={28}/></div>
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && stats && !loading && (
        <div className="admin-stats-section">
          {/* Revenue cards row */}
          <div className="admin-stats-row">
            <div className="admin-revenue-card admin-revenue-main">
              <div className="admin-revenue-header">
                <span className="admin-revenue-label">Ingresos Totales</span>
                <CreditCard size={18} style={{color:'var(--accent)'}}/>
              </div>
              <span className="admin-revenue-value">S/ {(stats.revenue_total_pen || 0).toFixed(2)}</span>
              <div className="admin-revenue-sub">
                <span>Hoy: <strong>S/ {(stats.revenue_today_pen || 0).toFixed(2)}</strong></span>
                <span>Semana: <strong>S/ {(stats.revenue_week_pen || 0).toFixed(2)}</strong></span>
                <span>Mes: <strong>S/ {(stats.revenue_month_pen || 0).toFixed(2)}</strong></span>
              </div>
            </div>
          </div>

          {/* Main metrics grid */}
          <div className="admin-stats-grid">
            {[
              { label:'Clientes',     value: stats.total_customers,  sub: `+${stats.new_customers_week || 0} esta semana`, icon:<Users size={20}/>,        color:'#6c5ce7' },
              { label:'Pedidos KC',   value: stats.total_orders,     sub: `${stats.total_sent} enviados`, icon:<Package size={20}/>,      color:'#3b82f6' },
              { label:'Pagos',        value: stats.total_payments || 0, sub: `${stats.fulfilled_payments || 0} completados`, icon:<CreditCard size={20}/>,   color:'#22c55e' },
              { label:'KC recargados', value:`${(stats.total_kc_recharged||0).toLocaleString()}`, sub: 'total histórico', icon:<Coins size={20}/>, color:'#f59e0b' },
            ].map(s => (
              <div className="admin-stat-card" key={s.label} style={{'--stat-color':s.color} as React.CSSProperties}>
                <div className="admin-stat-icon">{s.icon}</div>
                <div>
                  <span className="admin-stat-label">{s.label}</span>
                  <span className="admin-stat-value">{s.value}</span>
                  <span className="admin-stat-sub">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom row: Gateway breakdown + Recent payments */}
          <div className="admin-stats-bottom">
            {/* Gateway breakdown */}
            <div className="admin-card">
              <h4 className="admin-card-title"><CreditCard size={16}/> Pagos por pasarela</h4>
              {(stats.gateway_stats || []).length === 0 && <p className="admin-empty-text">Sin datos de pasarelas</p>}
              {(stats.gateway_stats || []).map((g: any) => (
                <div key={g.gateway} className="admin-gw-row">
                  <span className="admin-gw-name" style={{textTransform:'capitalize'}}>{g.gateway}</span>
                  <span className="admin-gw-count">{g.count} pagos</span>
                  <span className="admin-gw-total">S/ {g.total_pen.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Payment status breakdown */}
            <div className="admin-card">
              <h4 className="admin-card-title"><Package size={16}/> Estado de pagos</h4>
              {[
                { label: 'Pendientes', value: stats.pending_payments || 0, color: '#f59e0b' },
                { label: 'Aprobados', value: stats.approved_payments || 0, color: '#22c55e' },
                { label: 'Completados', value: stats.fulfilled_payments || 0, color: '#3b82f6' },
                { label: 'Expirados', value: stats.expired_payments || 0, color: '#6b7280' },
                { label: 'Fallidos', value: stats.failed_payments || 0, color: '#dc2626' },
              ].map(s => (
                <div key={s.label} className="admin-status-row">
                  <span className="admin-status-dot" style={{background:s.color}}/>
                  <span className="admin-status-label">{s.label}</span>
                  <span className="admin-status-value">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Recent payments */}
            <div className="admin-card">
              <h4 className="admin-card-title"><Clock size={16}/> Pagos recientes</h4>
              {(stats.recent_payments || []).length === 0 && <p className="admin-empty-text">Sin pagos recientes</p>}
              {(stats.recent_payments || []).map((p: any, i: number) => (
                <div key={i} className="admin-recent-row">
                  <div>
                    <span className="admin-recent-product">{p.product_name}</span>
                    <span className="admin-recent-gateway">{p.gateway}</span>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span className="admin-recent-amount">S/ {Number(p.amount_pen).toFixed(2)}</span>
                    <span className={`admin-recent-status admin-st-${p.status}`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Slot (/slot en Discord) — ganancia/pérdida de la casa */}
          {(() => {
            const periods: Record<string, any> = {
              today: stats.slot_stats?.today,
              week: stats.slot_stats?.week,
              month: stats.slot_stats?.month,
              all_time: stats.slot_stats?.all_time,
            };
            const p = periods[slotPeriod] || {};
            const plays = p.plays ?? 0;
            const wagered = p.wagered ?? 0;
            const gain = p.gain ?? 0;
            const loss = p.loss ?? 0;
            const net = p.net ?? 0;
            const winRate = p.win_rate_pct ?? 0;
            const netColor = net >= 0 ? '#22c55e' : '#dc2626';
            const periodLabels: [string, string][] = [
              ['today', 'Hoy'], ['week', 'Últimos 7 días'], ['month', 'Últimos 30 días'], ['all_time', 'Histórico total'],
            ];

            return (
              <div className="admin-card" style={{ marginTop: 20 }}>
                <h4 className="admin-card-title"><Gamepad2 size={16}/> Slot de Discord (/slot) — Cuánto te deja el juego</h4>

                <div className="admin-info-box">
                  Cada vez que un cliente <strong>pierde</strong> su apuesta, ese KC se queda contigo — eso es <strong style={{ color: '#22c55e' }}>ganancia</strong>.
                  Cada vez que <strong>gana</strong>, tienes que pagarle KC de vuelta — eso es <strong style={{ color: '#dc2626' }}>pérdida</strong>.
                  El <strong>Balance neto</strong> es la resta de ambos: si es positivo (verde), el juego te está dejando KC a favor; si es negativo (rojo), le has pagado más de lo que has ganado.
                  <div style={{ marginTop: 6, opacity: .7 }}>Probabilidad configurada: 3% de que el cliente gane, y paga 2x lo que apostó.</div>
                </div>

                {/* Selector de período */}
                <div className="admin-period-tabs">
                  {periodLabels.map(([key, label]) => (
                    <button key={key} className={`admin-period-btn ${slotPeriod === key ? 'active' : ''}`} onClick={() => setSlotPeriod(key as any)}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Balance neto — número principal */}
                <div className="admin-revenue-card" style={{ marginTop: 14, borderColor: net >= 0 ? 'rgba(34,197,94,.3)' : 'rgba(220,38,38,.3)' }}>
                  <div className="admin-revenue-header">
                    <span className="admin-revenue-label">Balance neto — {periodLabels.find(([k]) => k === slotPeriod)?.[1]}</span>
                    <Gamepad2 size={18} style={{ color: netColor }}/>
                  </div>
                  <span className="admin-revenue-value" style={{ color: netColor }}>
                    {net >= 0 ? '+' : ''}{net.toLocaleString()} KC
                  </span>
                  <div className="admin-revenue-sub">
                    <span>Ganancia: <strong style={{ color: '#22c55e' }}>+{gain.toLocaleString()} KC</strong></span>
                    <span>Pérdida: <strong style={{ color: '#dc2626' }}>-{loss.toLocaleString()} KC</strong></span>
                  </div>
                </div>

                {/* Datos de apoyo */}
                <div className="admin-stats-grid" style={{ marginTop: 14, padding: 0 }}>
                  {[
                    { label: 'Jugadas', value: plays.toLocaleString(), sub: `en este período`, icon: <Gamepad2 size={20}/>, color: '#6c5ce7' },
                    { label: 'KC apostado', value: wagered.toLocaleString(), sub: 'total apostado', icon: <Coins size={20}/>, color: '#f59e0b' },
                    { label: '% de victoria real', value: `${winRate.toFixed(1)}%`, sub: 'lo configurado es 3%', icon: <TrendingUp size={20}/>, color: '#3b82f6' },
                  ].map(s => (
                    <div className="admin-stat-card" key={s.label} style={{ '--stat-color': s.color } as React.CSSProperties}>
                      <div className="admin-stat-icon">{s.icon}</div>
                      <div>
                        <span className="admin-stat-label">{s.label}</span>
                        <span className="admin-stat-value">{s.value}</span>
                        <span className="admin-stat-sub">{s.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top ganadores */}
                {(stats.slot_stats?.top_winners || []).length > 0 && (
                  <>
                    <h4 className="admin-card-title" style={{ marginTop: 20 }}><TrendingUp size={16}/> Clientes que más te han ganado (histórico)</h4>
                    <p className="admin-empty-text" style={{ margin: '-4px 0 10px' }}>
                      Cuánto KC neto se ha llevado cada uno jugando /slot — útil para detectar rachas de suerte fuera de lo normal.
                    </p>
                    {stats.slot_stats.top_winners.map((w: any) => (
                      <div key={w.customer_id} className="admin-recent-row">
                        <div>
                          <span className="admin-recent-product">{w.epic_username}</span>
                          <span className="admin-recent-gateway">{w.plays} jugada{w.plays === 1 ? '' : 's'}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="admin-recent-amount" style={{ color: '#dc2626' }}>+{Number(w.net_kc).toLocaleString()} KC</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── CUSTOMERS ── */}
      {tab === 'customers' && !loading && (
        <div className="admin-table-section">
          <p className="admin-tab-sub">Todos los clientes registrados. Click en una fila para editar su cuenta o hacerlo administrador.</p>
          <div className="adm-section-head">
            <div className="admin-search-bar">
              <Search size={15}/>
              <input placeholder="Buscar por usuario o email..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <span className="adm-count">{custTotal.toLocaleString()} cliente{custTotal !== 1 ? 's' : ''}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Usuario Epic</th><th>Email</th><th>Balance KC</th>
                <th>Rol</th><th>Registrado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {pagedCustomers.map(c => (
                  <tr key={c.id} className="adm-customer-row" onClick={() => openEditCustomer(c)}>
                    <td><div className="adm-user-cell"><div className="adm-user-avatar">{c.epic_username[0].toUpperCase()}</div><strong>{c.epic_username}</strong></div></td>
                    <td className="text-muted">{c.email}</td>
                    <td><KCBadge amount={c.kc_balance} size="sm"/></td>
                    <td>
                      {c.is_admin
                        ? <span className="adm-role-badge adm-role-admin"><ShieldCheck size={12}/> Admin</span>
                        : <span className="adm-role-badge adm-role-user">Cliente</span>
                      }
                    </td>
                    <td className="text-muted">{new Date(c.created_at).toLocaleDateString('es-PE')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="adm-row-actions">
                        <button className="adm-action-icon edit" title="Editar" onClick={() => openEditCustomer(c)}><Edit2 size={13}/></button>
                        <button className="adm-action-btn" title={c.is_admin ? 'Quitar admin' : 'Hacer admin'}
                          style={{color: c.is_admin ? '#f59e0b' : '#6b7280'}}
                          onClick={async () => {
                            try {
                              await adminFetch(`/admin/customers/${c.id}`, undefined, {
                                method: 'PUT', body: JSON.stringify({ is_admin: !c.is_admin })
                              });
                              loadTab('customers');
                              setToast({msg: c.is_admin ? 'Admin removido' : 'Admin asignado', type:'success'});
                            } catch (e: any) { setToast({msg: e.message, type:'error'}); }
                          }}>
                          <ShieldCheck size={13}/>
                        </button>
                        <button className="adm-action-icon delete" title="Eliminar" onClick={() => setDeleteConfirm(c)}><Trash2 size={13}/></button>
                        <button className="admin-id-copy" onClick={() => { navigator.clipboard.writeText(String(c.id)); setToast({msg:'ID copiado',type:'success'}); }}><Copy size={11}/> ID</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && <tr><td colSpan={6} className="adm-empty-row">Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
          <AdminPagination page={custPage} total={custTotalPages} setPage={setCustPage}/>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === 'orders' && !loading && (
        <div className="admin-table-section">
          <p className="admin-tab-sub">Pedidos de ítems de la tienda pagados con KC. "Procesando" significa que el bot todavía está enviando el regalo en Fortnite.</p>
          <div className="adm-section-head" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="admin-search-bar">
              <Search size={15}/>
              <input placeholder="Buscar por usuario o item..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <span className="adm-count">{orderTotal.toLocaleString()} pedido{orderTotal !== 1 ? 's' : ''}</span>
            <div className="adm-filter-row">
              {['all','pending','processing','sent','failed','refunded'].map(s => (
                <button key={s} className={`adm-filter-btn ${orderFilter === s ? 'active' : ''}`} onClick={() => setOrderFilter(s)}>
                  {s === 'all' ? 'Todos' : s === 'sent' ? 'Enviados' : s === 'pending' ? 'Pendientes' :
                   s === 'processing' ? 'Procesando' : s === 'failed' ? 'Fallidos' : s === 'refunded' ? 'Reembolsados' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Usuario Epic</th><th>Item</th><th>KC</th><th>VBucks</th><th>Estado</th><th>Fecha</th>
              </tr></thead>
              <tbody>
                {displayedOrders.map(o => (
                  <tr key={o.id}>
                    <td><div className="adm-user-cell"><div className="adm-user-avatar" style={{background:'rgba(59,130,246,0.15)',color:'#3b82f6'}}>{o.epic_username[0]}</div><strong>{o.epic_username}</strong></div></td>
                    <td>{o.item_name}</td>
                    <td><KCBadge amount={o.price_kc} size="sm"/></td>
                    <td className="text-muted">{o.price_vbucks || '—'}</td>
                    <td><StatusBadge status={o.status}/></td>
                    <td className="text-muted">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
                  </tr>
                ))}
                {displayedOrders.length === 0 && <tr><td colSpan={6} className="adm-empty-row">Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
          <AdminPagination page={orderPage} total={orderTotalPages} setPage={setOrderPage}/>
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {tab === 'payments' && !loading && (
        <div className="admin-table-section">
          <p className="admin-tab-sub">Recargas de KC pagadas por pasarela automática (MercadoPago, dLocal Go, PayPal, cripto). Los pagos manuales (Yape, Plin, banco) no aparecen aquí — esos se acreditan desde la pestaña "Recargar KC".</p>
          <div className="adm-section-head" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="adm-count">{paymentTotal.toLocaleString()} transacci{paymentTotal !== 1 ? 'ones' : 'ón'}</span>
            <div className="adm-filter-row">
              {['all','pending','approved','fulfilled','expired','failed'].map(s => (
                <button key={s} className={`adm-filter-btn ${payFilter === s ? 'active' : ''}`} onClick={() => setPayFilter(s)}>
                  {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Pasarela</th><th>Producto</th><th>Monto</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
              </tr></thead>
              <tbody>
              {filteredPayments.map((p: any) => (
                  <tr key={p.id}>
                    <td><span style={{textTransform:'capitalize', fontWeight:600}}>{p.gateway}</span></td>
                    <td>{p.product_name}</td>
                    <td><strong>S/ {Number(p.amount_pen).toFixed(2)}</strong></td>
                    <td>
                      <span className="status-badge" style={{ '--badge-color':
                        p.status === 'approved' ? '#22c55e' : p.status === 'fulfilled' ? '#3b82f6' :
                        p.status === 'pending' ? '#f59e0b' : p.status === 'expired' ? '#6b7280' : '#dc2626'
                      } as React.CSSProperties}>
                        {p.status === 'approved' ? 'Aprobado' : p.status === 'pending' ? 'Pendiente' :
                         p.status === 'fulfilled' ? 'Entregado' : p.status === 'expired' ? 'Expirado' :
                         p.status === 'failed' ? 'Fallido' : p.status === 'activating' ? 'Activando' : p.status}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(p.created_at).toLocaleDateString('es-PE')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.status === 'pending' && (
                          <>
                            <button className="adm-action-btn adm-approve" title="Aprobar"
                              onClick={async () => { try { await adminFetch(`/admin/payments/${p.id}`, undefined, { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }); loadTab('payments'); setToast({ msg: 'Pago aprobado', type: 'success' }); } catch (e: any) { setToast({ msg: e.message, type: 'error' }); } }}>
                              <CheckCircle2 size={14}/>
                            </button>
                            <button className="adm-action-btn adm-cancel" title="Cancelar"
                              onClick={async () => { try { await adminFetch(`/admin/payments/${p.id}`, undefined, { method: 'PUT', body: JSON.stringify({ status: 'expired' }) }); loadTab('payments'); setToast({ msg: 'Pago cancelado', type: 'success' }); } catch (e: any) { setToast({ msg: e.message, type: 'error' }); } }}>
                              <X size={14}/>
                            </button>
                          </>
                        )}
                        <button className="adm-action-btn adm-delete" title="Eliminar"
                          onClick={async () => { if (!confirm('¿Eliminar este pago permanentemente?')) return; try { await adminFetch(`/admin/payments/${p.id}`, undefined, { method: 'DELETE' }); loadTab('payments'); setToast({ msg: 'Pago eliminado', type: 'success' }); } catch (e: any) { setToast({ msg: e.message, type: 'error' }); } }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && <tr><td colSpan={6} className="adm-empty-row">Sin transacciones</td></tr>}
              </tbody>
            </table>
          </div>
          <AdminPagination page={paymentPage} total={paymentTotalPages} setPage={setPaymentPage}/>
        </div>
      )}

      {/* ── LIBRO DE RECLAMACIONES ── */}
      {tab === 'complaints' && !loading && (
        <div className="admin-table-section">
          <p className="admin-tab-sub">Libro de Reclamaciones Virtual — requisito legal (Ley N° 29571). Debes responder cada reclamo en un plazo máximo de 30 días calendario desde su presentación.</p>
          <div className="adm-section-head" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="adm-count">{filteredComplaints.length} reclamo{filteredComplaints.length !== 1 ? 's' : ''}</span>
            <div className="adm-filter-row">
              {['all','pendiente','respondido','cerrado'].map(s => (
                <button key={s} className={`adm-filter-btn ${complaintFilter === s ? 'active' : ''}`} onClick={() => setComplaintFilter(s)}>
                  {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Código</th><th>Tipo</th><th>Consumidor</th><th>Email</th><th>Estado</th><th>Fecha</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {filteredComplaints.slice((complaintPage-1)*ADMIN_PER_PAGE, complaintPage*ADMIN_PER_PAGE).map((c: any) => (
                  <tr key={c.id}>
                    <td><strong>{c.reference}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{c.kind}</td>
                    <td>{c.full_name}</td>
                    <td className="text-muted">{c.email}</td>
                    <td>
                      <span className="status-badge" style={{ '--badge-color':
                        c.status === 'pendiente' ? '#f59e0b' : c.status === 'respondido' ? '#3b82f6' : '#6b7280'
                      } as React.CSSProperties}>
                        {c.status === 'pendiente' ? 'Pendiente' : c.status === 'respondido' ? 'Respondido' : 'Cerrado'}
                      </span>
                    </td>
                    <td className="text-muted">{new Date(c.created_at).toLocaleDateString('es-PE')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="adm-action-btn" title="Ver detalle / Responder"
                          onClick={() => { setRespondTarget(c); setRespondText(c.admin_response || ''); }}>
                          <Send size={14}/>
                        </button>
                        {c.status !== 'cerrado' && (
                          <button className="adm-action-btn adm-cancel" title="Cerrar reclamo" onClick={() => handleCloseComplaint(c.id)}>
                            <X size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredComplaints.length === 0 && <tr><td colSpan={7} className="adm-empty-row">Sin reclamos</td></tr>}
              </tbody>
            </table>
          </div>
          <AdminPagination page={complaintPage} total={Math.max(1, Math.ceil(filteredComplaints.length / ADMIN_PER_PAGE))} setPage={setComplaintPage}/>
        </div>
      )}

      {/* ── Modal: detalle / responder reclamo ── */}
      {respondTarget && (
        <div className="confirm-modal-overlay" onClick={() => !respondLoading && setRespondTarget(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="confirm-modal-header">
              <h2><ClipboardList size={18}/> Reclamo {respondTarget.reference}</h2>
              <button onClick={() => !respondLoading && setRespondTarget(null)} disabled={respondLoading}><X size={16}/></button>
            </div>
            <form onSubmit={handleRespondComplaint}>
              <div className="confirm-modal-body">
                <table className="admin-table" style={{ marginBottom: 16 }}>
                  <tbody>
                    <tr><td>Consumidor</td><td><strong>{respondTarget.full_name}</strong></td></tr>
                    <tr><td>Documento</td><td>{respondTarget.document_type} {respondTarget.document_number}</td></tr>
                    <tr><td>Email</td><td>{respondTarget.email}</td></tr>
                    {respondTarget.phone && <tr><td>Teléfono</td><td>{respondTarget.phone}</td></tr>}
                    {respondTarget.order_id && <tr><td>N° Pedido</td><td>{respondTarget.order_id}</td></tr>}
                    {respondTarget.amount_involved != null && <tr><td>Monto</td><td>S/ {Number(respondTarget.amount_involved).toFixed(2)}</td></tr>}
                    <tr><td>Bien contratado</td><td>{respondTarget.product_description}</td></tr>
                    <tr><td>Detalle</td><td style={{ whiteSpace: 'pre-wrap' }}>{respondTarget.detail}</td></tr>
                    <tr><td>Pedido del consumidor</td><td style={{ whiteSpace: 'pre-wrap' }}>{respondTarget.consumer_request}</td></tr>
                  </tbody>
                </table>
                <label className="field">
                  <span>Respuesta al consumidor</span>
                  <textarea rows={4} required value={respondText} onChange={e => setRespondText(e.target.value)}
                    placeholder="Se le enviará por correo al consumidor..." />
                </label>
              </div>
              <div className="confirm-modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setRespondTarget(null)} disabled={respondLoading}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={respondLoading || !respondText.trim()}>
                  {respondLoading ? <Loader2 size={15} className="spin"/> : <><Send size={14}/> Enviar respuesta</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECHARGE ── */}
      {tab === 'recharge' && (
        <div className="admin-recharge-layout">
          <div className="admin-recharge-customers">
            <h3><Users size={15}/> Seleccionar cliente</h3>
            <p className="admin-tab-sub" style={{ marginTop: -8 }}>
              Usa esto para acreditar KC manualmente — pagos por Yape, Plin, transferencia bancaria o cualquier otro que verifiques tú mismo.
            </p>
            <div className="admin-search-bar" style={{marginBottom:12}}>
              <Search size={15}/>
              <input placeholder="Buscar por usuario Epic o email..." value={rSearch} onChange={e => setRSearch(e.target.value)} autoFocus/>
            </div>
            {loading ? <div className="admin-loading"><Loader2 className="spin" size={22}/></div> : (
              <div className="admin-recharge-list">
                {filteredRCustomers.length === 0 && rSearch && <p style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:'0.85rem'}}>Sin resultados</p>}
                {filteredRCustomers.map(c => (
                  <button key={c.id} className={`admin-recharge-customer-row ${rSelected?.id === c.id ? 'selected' : ''}`} onClick={() => setRSelected(c)}>
                    <div className="arc-avatar">{c.epic_username[0].toUpperCase()}</div>
                    <div className="arc-info"><strong>{c.epic_username}</strong><span>{c.email}</span></div>
                    <KCBadge amount={c.kc_balance} size="sm"/>
                    {rSelected?.id === c.id && <CheckCircle2 size={15} style={{color:'var(--accent)',flexShrink:0}}/>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="admin-recharge-form-card">
            <h3><Coins size={15}/> Recargar KidCoins</h3>
            {rSelected ? (
              <>
                <div className="arc-selected-banner">
                  <div className="arc-avatar large">{rSelected.epic_username[0].toUpperCase()}</div>
                  <div><strong>{rSelected.epic_username}</strong><span>{rSelected.email}</span><KCBadge amount={rSelected.kc_balance} size="sm"/></div>
                  <button className="arc-deselect" onClick={() => setRSelected(null)}><X size={15}/></button>
                </div>
                <form onSubmit={handleRecharge} className="security-form" style={{gap:14}}>
                  <div className="sec-field">
                    <label>Cantidad KC a recargar</label>
                    <input type="number" placeholder="Ej: 2400" min="1" value={rAmount} onChange={e => setRAmount(e.target.value)} required autoFocus/>
                  </div>
                  <div className="sec-field">
                    <label>Monto pagado (S/ — opcional)</label>
                    <input type="number" step="0.01" placeholder="Ej: 36.00" value={rSoles} onChange={e => setRSoles(e.target.value)}/>
                  </div>
                  <div className="sec-field">
                    <label>Nota (opcional)</label>
                    <input type="text" placeholder="Ej: Yape #123 - pagado 21/03" value={rNote} onChange={e => setRNote(e.target.value)}/>
                  </div>
                  {rAmount && (
                    <div className="arc-preview">
                      <span>Balance actual:</span> <strong>{rSelected.kc_balance.toLocaleString()} KC</strong>
                      <span>→ Nuevo balance:</span> <strong style={{color:'var(--green-500)'}}>{(rSelected.kc_balance + parseInt(rAmount||'0')).toLocaleString()} KC</strong>
                    </div>
                  )}
                  <button className="btn btn-primary btn-full" type="submit" disabled={rLoading || !rAmount}>
                    {rLoading ? <Loader2 className="spin" size={18}/> : <Coins size={18}/>}
                    Recargar {rAmount ? `${parseInt(rAmount).toLocaleString()} KC` : 'KC'}
                  </button>
                </form>
              </>
            ) : (
              <div className="arc-no-selection"><Users size={40} strokeWidth={1}/><p>Selecciona un cliente de la lista para recargar</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── BOTS ── */}
      {tab === 'bots' && (
        <div className="admin-bots-section">
          <div className="admin-bots-list">
            <div className="admin-bots-header">
              <h2><Bot size={18}/> Cuentas Bot ({bots.length})</h2>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost btn-sm" onClick={handleVerifyTokens} disabled={verifying}>
                  {verifying ? <Loader2 className="spin" size={13}/> : <ShieldCheck size={13}/>}
                  {verifying ? 'Verificando...' : 'Verificar tokens'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => loadTab('bots')}><RefreshCw size={13}/> Actualizar</button>
              </div>
            </div>
            <p className="admin-bots-sub">
              Cuentas de Fortnite que envían los regalos a tus clientes. Cada una permite hasta 5 regalos por día — cuando una queda "Inactiva", su sesión con Epic Games expiró y hay que vincularla de nuevo.
            </p>
            {loading ? <div className="admin-loading"><Loader2 className="spin" size={24}/></div>
            : bots.length === 0 ? <div className="empty-state"><Bot size={40} strokeWidth={1}/><p>No hay cuentas bot vinculadas</p></div>
            : (
              <div className="bots-cards">
                {bots.map(bot => (
                  <div className={`bot-card-admin ${!bot.is_active ? 'inactive' : ''}`} key={bot.id}>
                    <div className="bca-header">
                      <div className="bca-avatar">{bot.display_name[0]}</div>
                      <div className="bca-info">
                        <strong>{bot.display_name}</strong>
                        <span className={`bca-status ${bot.is_active ? 'active' : 'inactive'}`}>
                          {bot.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                        {!bot.is_active && (
                          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Requiere reconexión con Epic Games</span>
                        )}
                      </div>
                      <div className="bca-actions">
                        <button className="admin-action-btn" title="Editar" onClick={() => openEditBot(bot)}><Edit2 size={13}/></button>
                        <button className="admin-action-btn danger" title="Desconectar" onClick={() => handleDisconnect(bot.id, bot.display_name)}><Trash2 size={13}/></button>
                      </div>
                    </div>
                    <div className="bca-stats">
                      <div className="bca-stat">
                        <span>Gifts restantes hoy</span>
                        <div className="bca-gifts">
                          {Array.from({length:5}).map((_,i) => <div key={i} className={`bca-gift-dot ${i < bot.remaining_gifts ? 'filled' : ''}`}/>)}
                          <strong>{bot.remaining_gifts}/5</strong>
                        </div>
                      </div>
                      <div className="bca-stat">
                        <span>V-Bucks (Pavos)</span>
                        <strong className="bca-vbucks">
                          <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#59c2ea" stroke="#2ba0cb" strokeWidth="1.5"/><text x="12" y="16.5" textAnchor="middle" fontSize="13" fontWeight="900" fontFamily="sans-serif" fill="#fff">V</text></svg>
                          {bot.vbucks.toLocaleString()}
                        </strong>
                      </div>
                      <div className="bca-stat">
                        <span>Vinculada</span>
                        <strong title={new Date(bot.created_at).toLocaleString('es-PE')}>{timeAgo(bot.created_at)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="admin-connect-card">
            <h2><Plus size={18}/> Vincular nueva cuenta bot</h2>
            {connectStep === 'idle' && (
              <>
                <div className="connect-guide">
                  <div className="connect-step-item"><span className="connect-num">1</span><span>Haz clic en "Iniciar vinculación"</span></div>
                  <div className="connect-step-item"><span className="connect-num">2</span><span>Se abrirá la página de Epic Games en una nueva pestaña</span></div>
                  <div className="connect-step-item"><span className="connect-num">3</span><span>Inicia sesión con la cuenta bot de Fortnite</span></div>
                  <div className="connect-step-item"><span className="connect-num">4</span><span>Regresa aquí y haz clic en "Ya inicié sesión"</span></div>
                </div>
                <button className="btn btn-primary" onClick={handleStartConnect} disabled={connectLoading}>
                  {connectLoading ? <Loader2 className="spin" size={16}/> : <ExternalLink size={16}/>} Iniciar vinculación
                </button>
              </>
            )}
            {connectStep === 'waiting' && connectData && (
              <>
                <div className="connect-waiting">
                  <p>Ingresa este código en la página de Epic Games:</p>
                  <div className="connect-code">
                    <strong>{connectData.user_code}</strong>
                    <button className="btn-copy-sm" onClick={() => { navigator.clipboard.writeText(connectData.user_code); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>
                      {copied ? <CheckCircle2 size={13}/> : <Copy size={13}/>}
                    </button>
                  </div>
                  <a href={connectData.login_url} target="_blank" rel="noopener noreferrer" className="connect-reopen"><ExternalLink size={13}/> Reabrir página de Epic Games</a>
                </div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <button className="btn btn-primary" onClick={handleFinishConnect} disabled={connectLoading}>
                    {connectLoading ? <Loader2 className="spin" size={16}/> : <CheckCircle2 size={16}/>} Ya inicié sesión
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setConnectStep('idle'); setConnectData(null); }}>Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HORARIO BOTS ── */}
      {tab === 'schedule' && (
        <div className="admin-bots-section">
          <div className="admin-bots-list">
            <div className="admin-bots-header">
              <h2><Clock size={18}/> Horario de operación de bots</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => loadTab('schedule')}>
                <RefreshCw size={13}/> Actualizar
              </button>
            </div>
            <p className="admin-tab-sub">
              Define en qué horas del día tus bots entregan pedidos. Fuera de ese horario, un cliente puede seguir navegando la tienda, pero al intentar comprar le sale un aviso de que debe esperar a que abras de nuevo.
            </p>

            {loading ? <div className="admin-loading"><Loader2 className="spin" size={24}/></div> : (
              <form onSubmit={handleSaveSchedule} style={{display:'flex',flexDirection:'column',gap:24}}>

                {/* Estado actual */}
                {schedule && (
                  <div style={{
                    display:'flex', alignItems:'center', gap:12, padding:'14px 18px',
                    borderRadius:14, border:'1.5px solid',
                    background: schedule.enabled
                      ? 'rgba(34,197,94,0.07)' : 'rgba(59,130,246,0.07)',
                    borderColor: schedule.enabled
                      ? 'rgba(34,197,94,0.25)' : 'rgba(59,130,246,0.25)',
                  }}>
                    {schedule.enabled
                      ? <Sun size={18} style={{color:'var(--green-500)',flexShrink:0}}/>
                      : <Moon size={18} style={{color:'var(--blue-500)',flexShrink:0}}/>}
                    <div style={{flex:1}}>
                      <strong style={{display:'block',fontSize:'0.9rem',color:'var(--text-primary)'}}>
                        {schedule.enabled
                          ? `Activo — ${pad(schedule.start_hour)}:00 a ${pad(schedule.end_hour)}:00 (${schedule.timezone})`
                          : 'Deshabilitado — los bots no procesan pedidos'}
                      </strong>
                      <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>
                        Última actualización: {new Date(schedule.updated_at).toLocaleString('es-PE')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Toggle enabled */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'16px 20px',borderRadius:14,background:'var(--bg-surface-2)',
                  border:'1.5px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    {schedEnabled
                      ? <Sun size={18} style={{color:'var(--green-500)'}}/>
                      : <Moon size={18} style={{color:'var(--blue-500)'}}/>}
                    <div>
                      <strong style={{display:'block',fontSize:'0.9rem',color:'var(--text-primary)'}}>
                        {schedEnabled ? 'Bots habilitados' : 'Bots deshabilitados'}
                      </strong>
                      <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>
                        {schedEnabled ? 'Procesan pedidos dentro del horario' : 'No procesan ningún pedido'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSchedEnabled(!schedEnabled)}
                    style={{background:'none',border:'none',cursor:'pointer',padding:4}}
                  >
                    {schedEnabled
                      ? <ToggleRight size={36} style={{color:'var(--green-500)'}}/>
                      : <ToggleLeft size={36} style={{color:'var(--text-muted)'}}/>}
                  </button>
                </div>

                {/* Horas */}
                {schedEnabled && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    <div className="sec-field">
                      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',fontWeight:700,color:'var(--text-secondary)'}}>
                        <Sun size={13}/> Hora de inicio
                      </label>
                      <select
                        value={schedStart}
                        onChange={e => setSchedStart(parseInt(e.target.value))}
                        style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid var(--border)',
                          background:'var(--bg-surface-2)',color:'var(--text-primary)',fontSize:'0.9rem',outline:'none'}}
                      >
                        {Array.from({length:24},(_,i)=>(
                          <option key={i} value={i}>{pad(i)}:00</option>
                        ))}
                      </select>
                    </div>
                    <div className="sec-field">
                      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',fontWeight:700,color:'var(--text-secondary)'}}>
                        <Moon size={13}/> Hora de fin
                      </label>
                      <select
                        value={schedEnd}
                        onChange={e => setSchedEnd(parseInt(e.target.value))}
                        style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid var(--border)',
                          background:'var(--bg-surface-2)',color:'var(--text-primary)',fontSize:'0.9rem',outline:'none'}}
                      >
                        {Array.from({length:24},(_,i)=>(
                          <option key={i} value={i}>{pad(i)}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Zona horaria */}
                {schedEnabled && (
                  <div className="sec-field">
                    <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',fontWeight:700,color:'var(--text-secondary)'}}>
                      <Clock size={13}/> Zona horaria
                    </label>
                    <select
                      value={schedTimezone}
                      onChange={e => setSchedTimezone(e.target.value)}
                      style={{padding:'10px 14px',borderRadius:10,border:'1.5px solid var(--border)',
                        background:'var(--bg-surface-2)',color:'var(--text-primary)',fontSize:'0.9rem',outline:'none'}}
                    >
                      <option value="America/Lima">América/Lima (UTC-5) — Perú</option>
                      <option value="America/Bogota">América/Bogotá (UTC-5) — Colombia</option>
                      <option value="America/Mexico_City">América/Ciudad de México (UTC-6)</option>
                      <option value="America/New_York">América/Nueva York (UTC-5/-4)</option>
                      <option value="America/Los_Angeles">América/Los Ángeles (UTC-8/-7)</option>
                      <option value="Europe/Madrid">Europa/Madrid (UTC+1/+2)</option>
                      <option value="UTC">UTC</option>
                    </select>
                    <span style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:4}}>
                      Las horas de inicio y fin se calculan según la zona horaria que elijas aquí — no según la tuya.
                    </span>
                  </div>
                )}

                {/* Preview */}
                {schedEnabled && (
                  <div style={{
                    padding:'12px 16px',borderRadius:12,
                    background:'rgba(108,92,231,0.07)',
                    border:'1px solid rgba(108,92,231,0.18)',
                    fontSize:'0.84rem',color:'var(--text-secondary)',
                  }}>
                    <strong style={{color:'var(--text-primary)',display:'block',marginBottom:4}}>
                      Resumen del horario
                    </strong>
                    Los bots procesarán pedidos de <strong>{pad(schedStart)}:00</strong> a <strong>{pad(schedEnd)}:00</strong> hora <strong>{schedTimezone.split('/')[1] || schedTimezone}</strong>, todos los días.
                    {schedStart === schedEnd && (
                      <span style={{color:'var(--red-500)',display:'block',marginTop:4}}>
                        ⚠️ Inicio y fin son iguales — los bots no procesarán ningún pedido.
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={schedLoading}
                  style={{alignSelf:'flex-start',minWidth:180}}
                >
                  {schedLoading
                    ? <><Loader2 className="spin" size={15}/> Guardando...</>
                    : schedSaved
                    ? <><CheckCircle2 size={15}/> Guardado</>
                    : <><CheckCircle2 size={15}/> Guardar horario</>}
                </button>
              </form>
            )}
          </div>

          {/* Info — cómo editar manualmente */}
          <div className="admin-connect-card">
            <h2><AlertTriangle size={18}/> Edición manual directa en DB</h2>
            <p style={{fontSize:'0.85rem',color:'var(--text-secondary)',lineHeight:1.6}}>
              Si prefieres editar el horario directamente en la base de datos PostgreSQL, ejecuta:
            </p>
            <div className="connect-code" style={{flexDirection:'column',alignItems:'flex-start',gap:8}}>
              <code style={{fontSize:'0.78rem',color:'var(--accent)',fontFamily:'monospace',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
                {`-- Cambiar horario (00:00 a 09:00 Lima)\nUPDATE bot_schedule\nSET enabled=true, start_hour=0, end_hour=9, timezone='America/Lima'\nWHERE id=1;\n\n-- Deshabilitar completamente\nUPDATE bot_schedule SET enabled=false WHERE id=1;`}
              </code>
            </div>
            <p style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:4}}>
              Los cambios en DB son efectivos de inmediato en el próximo tick del worker (cada 30s).
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
