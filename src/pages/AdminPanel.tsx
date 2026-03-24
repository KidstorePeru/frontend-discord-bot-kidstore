import { useState, useEffect } from 'react';
import { KCBadge, StatusBadge, Toast } from '../components/UI';
import type { Customer, Order } from '../types';
import {
  Users, Package, TrendingUp, Coins, Search, Loader2,
  CheckCircle2, RefreshCw, ShieldCheck, LogIn, Bot,
  Plus, Trash2, ExternalLink, Copy, Zap, X, Edit2,
  AlertTriangle, Gamepad2, Mail, Clock, Moon, Sun, ToggleLeft, ToggleRight
} from 'lucide-react';

type AdminTab = 'stats' | 'customers' | 'orders' | 'recharge' | 'bots' | 'schedule';
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

async function adminFetch(path: string, adminKey: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
      ...(opts.headers as Record<string, string> || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
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

export default function AdminPanel() {
  const [apiKey,   setApiKey]   = useState(() => sessionStorage.getItem('kc_admin_key') || '');
  const [authed,   setAuthed]   = useState(!!sessionStorage.getItem('kc_admin_key'));
  const [keyInput, setKeyInput] = useState('');
  const [authErr,  setAuthErr]  = useState('');
  const [tab,      setTab]      = useState<AdminTab>('stats');
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search,   setSearch]   = useState('');

  const [stats,     setStats]     = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [bots,      setBots]      = useState<BotAccount[]>([]);

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

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setAuthErr('');
    try {
      await adminFetch('/admin/stats', keyInput);
      sessionStorage.setItem('kc_admin_key', keyInput);
      setApiKey(keyInput); setAuthed(true);
    } catch { setAuthErr('API Key incorrecta'); }
  }

  useEffect(() => { if (authed) loadTab(tab); }, [authed, tab]);

  async function loadTab(t: AdminTab) {
    setLoading(true);
    try {
      if (t === 'stats')    setStats(await adminFetch('/admin/stats', apiKey));
      else if (t === 'customers') { const r = await adminFetch('/admin/customers', apiKey); setCustomers(r.customers || []); }
      else if (t === 'orders')    { const r = await adminFetch('/admin/orders', apiKey); setOrders(r.orders || []); }
      else if (t === 'bots')      { const r = await adminFetch('/admin/bots', apiKey); setBots(r.accounts || []); }
      else if (t === 'recharge' && !rCustLoaded) {
        const r = await adminFetch('/admin/customers', apiKey);
        setRCustomers(r.customers || []); setRCustLoaded(true);
      }
      else if (t === 'schedule') {
        const r = await adminFetch('/admin/bot-schedule', apiKey);
        const s: BotSchedule = r.schedule;
        setSchedule(s);
        setSchedEnabled(s.enabled);
        setSchedStart(s.start_hour);
        setSchedEnd(s.end_hour);
        setSchedTimezone(s.timezone);
      }
    } catch (err: any) { setToast({ msg: err.message || 'Error cargando datos', type: 'error' }); }
    finally { setLoading(false); }
  }

  // ── Schedule ──
  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSchedLoading(true); setSchedSaved(false);
    try {
      const res = await adminFetch('/admin/bot-schedule', apiKey, {
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
    } catch (err: any) {
      setToast({ msg: err.message || 'Error guardando horario', type: 'error' });
    } finally { setSchedLoading(false); }
  }

  // ── Recharge ──
  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault(); if (!rSelected) return; setRLoading(true);
    try {
      const res = await adminFetch('/admin/recharge', apiKey, {
        method: 'POST', headers: { 'X-Approved-By': 'admin-panel' },
        body: JSON.stringify({ customer_id: rSelected.id, amount_kc: parseInt(rAmount), amount_soles: rSoles ? parseFloat(rSoles) : undefined, note: rNote || undefined }),
      });
      setToast({ msg: `✅ ${res.message} — Nuevo balance: ${res.new_balance.toLocaleString()} KC`, type: 'success' });
      setRSelected(null); setRAmount(''); setRSoles(''); setRNote(''); setRSearch('');
      setRCustomers(prev => prev.map(c => c.id === rSelected.id ? {...c, kc_balance: res.new_balance} : c));
    } catch (err: any) { setToast({ msg: err.message || 'Error recargando KC', type: 'error' }); }
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
      await adminFetch(`/admin/customers/${editCustomer.id}`, apiKey, {
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
    } catch (err: any) { setToast({ msg: err.message || 'Error actualizando cliente', type: 'error' }); }
    finally { setEditCustLoading(false); }
  }

  async function handleDeleteCustomer() {
    if (!deleteConfirm) return; setDeleteLoading(true);
    try {
      await adminFetch(`/admin/customers/${deleteConfirm.id}`, apiKey, { method: 'DELETE' });
      setToast({ msg: `✅ Cliente ${deleteConfirm.epic_username} eliminado`, type: 'success' });
      setCustomers(prev => prev.filter(c => c.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err: any) { setToast({ msg: err.message || 'Error eliminando cliente', type: 'error' }); }
    finally { setDeleteLoading(false); }
  }

  // ── Bots ──
  async function handleStartConnect() {
    setConnectLoading(true);
    try {
      const res = await adminFetch('/admin/bots/connect', apiKey, { method: 'POST' });
      setConnectData({ login_url: res.login_url, user_code: res.user_code, device_code: res.device_code });
      setConnectStep('waiting'); window.open(res.login_url, '_blank');
    } catch (err: any) { setToast({ msg: err.message || 'Error iniciando vinculación', type: 'error' }); }
    finally { setConnectLoading(false); }
  }
  async function handleFinishConnect() {
    if (!connectData) return; setConnectLoading(true);
    try {
      const res = await adminFetch('/admin/bots/finish', apiKey, { method: 'POST', body: JSON.stringify({ device_code: connectData.device_code }) });
      setToast({ msg: `✅ Cuenta ${res.display_name} vinculada correctamente`, type: 'success' });
      setConnectStep('idle'); setConnectData(null); loadTab('bots');
    } catch (err: any) { setToast({ msg: err.message || 'Error. Asegúrate de haber iniciado sesión en Epic.', type: 'error' }); }
    finally { setConnectLoading(false); }
  }
  async function handleVerifyTokens() {
    setVerifying(true);
    try {
      const res = await adminFetch('/admin/bots/verify', apiKey, { method: 'POST' });
      setToast({ msg: `🔍 ${res.message}`, type: 'success' });
      setTimeout(() => loadTab('bots'), 4000);
    } catch (err: any) { setToast({ msg: err.message, type: 'error' }); }
    finally { setVerifying(false); }
  }
  async function handleDisconnect(accountId: string, displayName: string) {
    if (!confirm(`¿Desconectar ${displayName}?`)) return;
    try {
      await adminFetch('/admin/bots/disconnect', apiKey, { method: 'POST', body: JSON.stringify({ account_id: accountId }) });
      setToast({ msg: `✅ ${displayName} desconectada`, type: 'success' }); loadTab('bots');
    } catch (err: any) { setToast({ msg: err.message, type: 'error' }); }
  }
  function openEditBot(bot: BotAccount) { setEditBot(bot); setEditVbucks(String(bot.vbucks)); setEditGifts(String(bot.remaining_gifts)); }
  async function handleSaveBot(e: React.FormEvent) {
    e.preventDefault(); if (!editBot) return; setEditLoading(true);
    try {
      await adminFetch('/admin/bots/gifts', apiKey, { method: 'POST', body: JSON.stringify({ account_id: editBot.id, remaining_gifts: parseInt(editGifts) }) });
      if (parseInt(editVbucks) !== editBot.vbucks)
        await adminFetch('/admin/bots/vbucks', apiKey, { method: 'POST', body: JSON.stringify({ account_id: editBot.id, vbucks: parseInt(editVbucks) }) });
      setToast({ msg: `✅ ${editBot.display_name} actualizado`, type: 'success' });
      setEditBot(null); loadTab('bots');
    } catch (err: any) { setToast({ msg: err.message, type: 'error' }); }
    finally { setEditLoading(false); }
  }

  const filteredCustomers = customers.filter(c =>
    c.epic_username.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredOrders = orders.filter(o =>
    o.epic_username.toLowerCase().includes(search.toLowerCase()) ||
    o.item_name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRCustomers = rCustomers.filter(c =>
    c.epic_username.toLowerCase().includes(rSearch.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(rSearch.toLowerCase())
  );

  // ── LOGIN ──
  if (!authed) return (
    <div className="admin-login-page">
      <form className="auth-card" onSubmit={handleAuth}>
        <div className="auth-icon"><ShieldCheck size={28}/></div>
        <h1>Panel de Administrador</h1>
        <p className="auth-sub">Ingresa tu API Key para continuar.</p>
        {authErr && <div className="auth-error">{authErr}</div>}
        <label className="field">
          <span>API Key Admin</span>
          <input type="password" placeholder="••••••••••••" value={keyInput} onChange={e => setKeyInput(e.target.value)} required autoFocus/>
        </label>
        <button className="btn btn-primary btn-full" type="submit"><LogIn size={18}/> Acceder</button>
      </form>
    </div>
  );

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
          ['schedule', 'Horario Bots', <Clock size={15}/>],
        ] as [AdminTab, string, React.ReactNode][]).map(([key, label, icon]) => (
          <button key={key} className={`admin-tab ${tab===key?'active':''}`} onClick={() => setTab(key)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {loading && tab !== 'recharge' && tab !== 'bots' && tab !== 'schedule' && (
        <div className="admin-loading"><Loader2 className="spin" size={28}/></div>
      )}

      {/* ── STATS ── */}
      {tab === 'stats' && stats && !loading && (
        <div className="admin-stats-grid">
          {[
            { label:'Clientes activos',    value: stats.total_customers,  icon:<Users size={22}/>,        color:'#6c5ce7' },
            { label:'Pedidos totales',     value: stats.total_orders,     icon:<Package size={22}/>,      color:'#3b82f6' },
            { label:'Enviados',            value: stats.total_sent,       icon:<CheckCircle2 size={22}/>, color:'#22c55e' },
            { label:'Pendientes',          value: stats.total_pending,    icon:<Package size={22}/>,      color:'#f59e0b' },
            { label:'KC recargados total', value:`${(stats.total_kc_recharged||0).toLocaleString()} KC`, icon:<Coins size={22}/>, color:'#f59e0b' },
          ].map(s => (
            <div className="admin-stat-card" key={s.label} style={{'--stat-color':s.color} as React.CSSProperties}>
              <div className="admin-stat-icon">{s.icon}</div>
              <div><span className="admin-stat-label">{s.label}</span><span className="admin-stat-value">{s.value}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* ── CUSTOMERS ── */}
      {tab === 'customers' && !loading && (
        <div className="admin-table-section">
          <div className="adm-section-head">
            <div className="admin-search-bar">
              <Search size={15}/>
              <input placeholder="Buscar por usuario o email..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <span className="adm-count">{filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Usuario Epic</th><th>Email</th><th>Balance KC</th>
                <th>Discord</th><th>Registrado</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="adm-customer-row" onClick={() => openEditCustomer(c)}>
                    <td><div className="adm-user-cell"><div className="adm-user-avatar">{c.epic_username[0].toUpperCase()}</div><strong>{c.epic_username}</strong></div></td>
                    <td className="text-muted">{c.email}</td>
                    <td><KCBadge amount={c.kc_balance} size="sm"/></td>
                    <td className="text-muted">{c.discord_username || '—'}</td>
                    <td className="text-muted">{new Date(c.created_at).toLocaleDateString('es-PE')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="adm-row-actions">
                        <button className="adm-action-icon edit" title="Editar" onClick={() => openEditCustomer(c)}><Edit2 size={13}/></button>
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
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === 'orders' && !loading && (
        <div className="admin-table-section">
          <div className="adm-section-head">
            <div className="admin-search-bar">
              <Search size={15}/>
              <input placeholder="Buscar por usuario o item..." value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <span className="adm-count">{filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                <th>Usuario Epic</th><th>Item</th><th>KC</th><th>VBucks</th><th>Estado</th><th>Fecha</th>
              </tr></thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td><div className="adm-user-cell"><div className="adm-user-avatar" style={{background:'rgba(59,130,246,0.15)',color:'#3b82f6'}}>{o.epic_username[0]}</div><strong>{o.epic_username}</strong></div></td>
                    <td>{o.item_name}</td>
                    <td><KCBadge amount={o.price_kc} size="sm"/></td>
                    <td className="text-muted">{(o as any).price_vbucks || '—'}</td>
                    <td><StatusBadge status={o.status}/></td>
                    <td className="text-muted">{new Date(o.created_at).toLocaleDateString('es-PE')}</td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && <tr><td colSpan={6} className="adm-empty-row">Sin resultados</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RECHARGE ── */}
      {tab === 'recharge' && (
        <div className="admin-recharge-layout">
          <div className="admin-recharge-customers">
            <h3><Users size={15}/> Seleccionar cliente</h3>
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
                          {bot.is_active ? '● Activa' : '● Inactiva — requiere nueva vinculación'}
                        </span>
                      </div>
                      <div className="bca-actions">
                        <button className="admin-action-btn" title="Editar" onClick={() => openEditBot(bot)}><Zap size={13}/></button>
                        <button className="admin-action-btn danger" title="Desconectar" onClick={() => handleDisconnect(bot.id, bot.display_name)}><Trash2 size={13}/></button>
                      </div>
                    </div>
                    <div className="bca-stats">
                      <div className="bca-stat">
                        <span>Gifts restantes</span>
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
                        <strong>{new Date(bot.created_at).toLocaleDateString('es-PE')}</strong>
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
                      La hora Lima actual es la referencia base del sistema.
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
