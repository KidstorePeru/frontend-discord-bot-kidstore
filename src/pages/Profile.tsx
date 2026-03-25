import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getMyOrders, updateProfile, getDiscordAuthURL, unlinkDiscord } from '../services/api';
import { KCBadge, StatusBadge, PageLoader, Toast } from '../components/UI';
import type { Order } from '../types';
import {
  Package, Zap, User, Calendar, CheckCircle2,
  TrendingUp, ShoppingBag, MessageSquare, Copy, Award,
  Shield, Mail, Key, AtSign, Lock, ExternalLink, Eye, EyeOff, Loader2, Camera, X, AlertCircle
} from 'lucide-react';

const DEFAULT_AVATARS = [
  '/avatars/avatar1.svg', '/avatars/avatar2.svg', '/avatars/avatar3.svg',
  '/avatars/avatar4.svg', '/avatars/avatar5.svg', '/avatars/avatar6.svg',
  '/avatars/avatar7.svg', '/avatars/avatar8.svg',
];

function getDefaultAvatar(userId: number | string): string {
  const idx = Number(String(userId).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[idx];
}
function getStoredAvatar(userId: number | string): string {
  return localStorage.getItem(`kc_avatar_${userId}`) || getDefaultAvatar(userId);
}

type Tab = 'profile' | 'security';

export default function Profile() {
  const { customer, refresh, setAuth } = useAuth();
  const { t, lang } = useLang();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<Tab>('profile');
  const [copied,  setCopied]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [avatar,  setAvatar]  = useState<string>('');
  const [avatarModal, setAvatarModal] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([refresh(), getMyOrders().then(setOrders).catch(() => [])]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (customer) setAvatar(getStoredAvatar(customer.id));
  }, [customer]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordResult = params.get('discord');
    if (discordResult === 'success') {
      setToast({ msg: lang === 'es' ? '✅ Discord vinculado correctamente' : '✅ Discord linked successfully', type: 'success' });
      refresh();
      window.history.replaceState({}, '', '/profile');
    } else if (discordResult === 'error') {
      const reason = params.get('reason') || 'unknown';
      setToast({ msg: lang === 'es' ? `❌ Error vinculando Discord (${reason})` : `❌ Error linking Discord (${reason})`, type: 'error' });
      window.history.replaceState({}, '', '/profile');
    }
  }, []);

  async function handleDiscordOAuth() {
    try {
      const url = await getDiscordAuthURL();
      window.location.href = url;
    } catch {
      setToast({ msg: lang === 'es' ? '❌ Error iniciando conexión con Discord' : '❌ Error starting Discord connection', type: 'error' });
    }
  }

  if (loading || !customer) return <PageLoader />;

  const sentOrders   = orders.filter(o => o.status === 'sent');
  const totalSpentKC = sentOrders.reduce((s, o) => s + o.price_kc, 0);
  const memberSince  = new Date(customer!.created_at).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const recentOrders = orders.slice(0, 5);
  const level = totalSpentKC >= 10000 ? 'Legend' : totalSpentKC >= 4000 ? 'Pro' : totalSpentKC >= 1000 ? 'Gamer' : 'Starter';
  const levelColors: Record<string, string> = { Starter: '#3b82f6', Gamer: '#8b5cf6', Pro: '#f59e0b', Legend: '#f59e0b' };
  const levelEmojis: Record<string, string> = { Starter: '⚡', Gamer: '🎮', Pro: '🔥', Legend: '👑' };

  function handleCopyId() {
    navigator.clipboard.writeText(String(customer!.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveAvatar() {
    if (!pendingAvatar || !customer) return;
    localStorage.setItem(`kc_avatar_${customer!.id}`, pendingAvatar);
    setAvatar(pendingAvatar);
    setAvatarModal(false);
    setPendingAvatar('');
    setToast({ msg: lang === 'es' ? '✅ Foto de perfil actualizada' : '✅ Profile photo updated', type: 'success' });
  }

  function handleFileAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPendingAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="profile-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Avatar picker modal */}
      {avatarModal && (
        <div className="avatar-modal-overlay" onClick={() => { setAvatarModal(false); setPendingAvatar(''); }}>
          <div className="avatar-modal" onClick={e => e.stopPropagation()}>
            <div className="avatar-modal-head">
              <h3><Camera size={18}/>{lang === 'es' ? ' Cambiar foto de perfil' : ' Change profile photo'}</h3>
              <button onClick={() => { setAvatarModal(false); setPendingAvatar(''); }}><X size={20}/></button>
            </div>
            <div className="avatar-modal-body">
              <p className="avatar-modal-sub">{lang === 'es' ? 'Elige un avatar predeterminado o sube tu propia foto' : 'Choose a default avatar or upload your own photo'}</p>
              <div className="avatar-grid">
                {DEFAULT_AVATARS.map(src => (
                  <button key={src} className={`avatar-option ${(pendingAvatar||avatar)===src?'sel':''}`} onClick={() => setPendingAvatar(src)}>
                    <img src={src} alt="avatar" onError={e => { (e.target as HTMLImageElement).src = '/kidcoin.png'; }}/>
                    {(pendingAvatar||avatar)===src && <CheckCircle2 size={16} className="avatar-option-check"/>}
                  </button>
                ))}
                {pendingAvatar && !DEFAULT_AVATARS.includes(pendingAvatar) && (
                  <button className="avatar-option sel">
                    <img src={pendingAvatar} alt="custom"/>
                    <CheckCircle2 size={16} className="avatar-option-check"/>
                  </button>
                )}
              </div>
              <div className="avatar-modal-actions">
                <label className="avatar-upload-btn">
                  <Camera size={15}/>{lang === 'es' ? ' Subir foto' : ' Upload photo'}
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFileAvatar}/>
                </label>
                <button className="btn btn-primary" onClick={handleSaveAvatar} disabled={!pendingAvatar || pendingAvatar === avatar}>
                  <CheckCircle2 size={16}/>{lang === 'es' ? ' Guardar' : ' Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="profile-hero">
        <button className="profile-avatar-btn" onClick={() => { setPendingAvatar(avatar); setAvatarModal(true); }} title="Cambiar foto">
          <div className="profile-avatar">
            <img src={avatar || '/kidcoin.png'} alt="avatar" onError={e => { (e.target as HTMLImageElement).src = '/kidcoin.png'; }}/>
            <span className="profile-level-badge" style={{ background: levelColors[level] }}>{levelEmojis[level]} {level}</span>
          </div>
          <div className="profile-avatar-edit"><Camera size={14}/></div>
        </button>
        <div className="profile-hero-info">
          <h1 className="profile-username">{customer!.epic_username}</h1>
          <p className="profile-email">{customer!.email}</p>
          <div className="profile-member"><Calendar size={14} /><span>{t('profile.member.since')} {memberSince}</span></div>
          {customer!.discord_username ? (
            <div className="profile-discord linked"><MessageSquare size={14} /><span>Discord: <strong>{customer!.discord_username}</strong></span></div>
          ) : (
            <div className="profile-discord unlinked"><MessageSquare size={14} /><span>{t('profile.discord.no')}</span></div>
          )}
        </div>
        <div className="profile-hero-actions">
          <Link to="/recharge" className="btn btn-primary"><Zap size={16} />{t('dash.recharge')}</Link>
          <Link to="/store" className="btn btn-ghost"><ShoppingBag size={16} />{lang === 'es' ? 'Tienda' : 'Store'}</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="pstat pstat-balance">
          <div className="pstat-icon"><img src="/kidcoin.png" alt="KC" /></div>
          <div><span className="pstat-label">{t('profile.balance')}</span><span className="pstat-value">{customer!.kc_balance.toLocaleString()} KC</span></div>
        </div>
        <div className="pstat">
          <div className="pstat-icon"><Package size={22} /></div>
          <div><span className="pstat-label">{t('profile.orders.total')}</span><span className="pstat-value">{orders.length}</span></div>
        </div>
        <div className="pstat">
          <div className="pstat-icon"><CheckCircle2 size={22} /></div>
          <div><span className="pstat-label">{t('profile.orders.sent')}</span><span className="pstat-value">{sentOrders.length}</span></div>
        </div>
        <div className="pstat">
          <div className="pstat-icon"><TrendingUp size={22} /></div>
          <div><span className="pstat-label">{t('profile.spent')}</span><span className="pstat-value">{totalSpentKC.toLocaleString()} KC</span></div>
        </div>
      </div>

      {/* Progress */}
      <div className="profile-progress-card">
        <div className="progress-header"><Award size={18} /><span>{lang === 'es' ? 'Progreso de nivel' : 'Level progress'}</span><span className="progress-level" style={{ color: levelColors[level] }}>{levelEmojis[level]} {level}</span></div>
        <LevelBar kc={totalSpentKC} lang={lang} />
      </div>

      {/* Account ID */}
      <div className="profile-id-card">
        <User size={14} />
        <span className="profile-id-label">ID:</span>
        <code className="profile-id">{customer!.id}</code>
        <button className="btn-copy-sm" onClick={handleCopyId}>
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button className={`profile-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <Package size={16} /> {t('profile.recent')}
        </button>
        <button className={`profile-tab ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>
          <Shield size={16} />{lang === 'es' ? ' Seguridad' : ' Security'}
        </button>
      </div>

      {/* Tab: Recent orders */}
      {tab === 'profile' && (
        <div className="profile-section">
          <div className="section-header">
            <h2><Package size={20} /> {t('profile.recent')}</h2>
            <Link to="/dashboard" className="btn btn-ghost btn-sm">{lang === 'es' ? 'Ver todos' : 'View all'}</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="empty-state">
              <Package size={40} strokeWidth={1} />
              <p>{t('dash.orders.empty')}</p>
              <Link to="/store" className="btn btn-primary btn-sm">{t('dash.orders.explore')}</Link>
            </div>
          ) : (
            <div className="orders-list">
              {recentOrders.map(o => (
                <div className="order-row" key={o.id}>
                  <div className="order-img">
                    {o.item_image ? <img src={o.item_image} alt={o.item_name} /> : <div className="order-img-placeholder">🎮</div>}
                  </div>
                  <div className="order-details">
                    <strong>{o.item_name}</strong>
                    <span className="order-date">{new Date(o.created_at).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <KCBadge amount={o.price_kc} size="sm" />
                  <StatusBadge status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Security */}
      {tab === 'security' && (
        <SecurityTab
          customer={customer}
          setAuth={setAuth}
          refresh={refresh}
          setToast={setToast}
          lang={lang}
          onDiscordOAuth={handleDiscordOAuth}
        />
      )}
    </div>
  );
}

/* ── Security Tab ── */
function SecurityTab({ customer, setAuth, refresh, setToast, lang, onDiscordOAuth }: {
  customer: any; setAuth: any; refresh: any;
  setToast: (v: { msg: string; type: 'success' | 'error' } | null) => void;
  lang: string; onDiscordOAuth: () => void;
}) {
  const es = lang === 'es';

  // ── Sección 1: Datos de cuenta (epic username + email) ──
  const [epicVal,       setEpicVal]       = useState('');
  const [emailVal,      setEmailVal]      = useState('');
  const [passForInfo,   setPassForInfo]   = useState('');
  const [showPassInfo,  setShowPassInfo]  = useState(false);
  const [savingInfo,    setSavingInfo]    = useState(false);

  // ── Sección 2: Cambio de contraseña ──
  const [currPass,      setCurrPass]      = useState('');
  const [newPass,       setNewPass]       = useState('');
  const [confirmPass,   setConfirmPass]   = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [savingPass,    setSavingPass]    = useState(false);
  const [passMatch,     setPassMatch]     = useState(true);

  // ── Discord ──
  const [unlinking,     setUnlinking]     = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!epicVal && !emailVal) return;
    if (!passForInfo) {
      setToast({ msg: es ? 'Ingresa tu contraseña actual para confirmar los cambios' : 'Enter your current password to confirm changes', type: 'error' });
      return;
    }
    setSavingInfo(true);
    try {
      const res = await updateProfile({
        epic_username:    epicVal   || undefined,
        email:            emailVal  || undefined,
        current_password: passForInfo,
      });
      localStorage.setItem('kc_token', res.token);
      setAuth(res.token, res.customer);
      setToast({ msg: es ? '✅ Datos actualizados correctamente' : '✅ Account info updated successfully', type: 'success' });
      setEpicVal(''); setEmailVal(''); setPassForInfo('');
    } catch (err: any) {
      setToast({ msg: err.message || (es ? 'Error al actualizar' : 'Update error'), type: 'error' });
    } finally { setSavingInfo(false); }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currPass || !newPass || !confirmPass) return;
    if (newPass !== confirmPass) {
      setPassMatch(false);
      return;
    }
    setPassMatch(true);
    setSavingPass(true);
    try {
      const res = await updateProfile({
        current_password: currPass,
        new_password:     newPass,
      });
      localStorage.setItem('kc_token', res.token);
      setAuth(res.token, res.customer);
      setToast({ msg: es ? '✅ Contraseña actualizada correctamente' : '✅ Password updated successfully', type: 'success' });
      setCurrPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      setToast({ msg: err.message || (es ? 'Error al cambiar contraseña' : 'Password change error'), type: 'error' });
    } finally { setSavingPass(false); }
  }

  async function handleUnlinkDiscord() {
    setUnlinking(true);
    try {
      await unlinkDiscord();
      await refresh();
      setConfirmUnlink(false);
      setToast({ msg: es ? '✅ Discord desvinculado correctamente' : '✅ Discord unlinked successfully', type: 'success' });
    } catch (err: any) {
      setToast({ msg: err.message || (es ? 'Error al desvincular Discord' : 'Error unlinking Discord'), type: 'error' });
    } finally { setUnlinking(false); }
  }

  return (
    <div className="security-section">

      {/* ── Sección 1: Datos de cuenta ── */}
      <div className="security-card">
        <div className="security-card-header">
          <AtSign size={18} />
          <h3>{es ? 'Datos de cuenta' : 'Account info'}</h3>
        </div>
        <form onSubmit={handleSaveInfo} className="security-form">
          <div className="sec-field">
            <label><User size={13} /> {es ? 'Nuevo usuario Epic' : 'New Epic username'}</label>
            <input
              type="text"
              placeholder={es ? `Actual: ${customer.epic_username}` : `Current: ${customer.epic_username}`}
              value={epicVal}
              onChange={e => setEpicVal(e.target.value)}
              minLength={3} maxLength={50}
            />
          </div>
          <div className="sec-field">
            <label><Mail size={13} /> {es ? 'Nuevo email' : 'New email'}</label>
            <input
              type="email"
              placeholder={es ? `Actual: ${customer.email}` : `Current: ${customer.email}`}
              value={emailVal}
              onChange={e => setEmailVal(e.target.value)}
            />
          </div>
          <div className="sec-field">
            <label><Lock size={13} /> {es ? 'Contraseña actual (requerida para confirmar)' : 'Current password (required to confirm)'}</label>
            <div className="pass-wrap">
              <input
                type={showPassInfo ? 'text' : 'password'}
                placeholder={es ? 'Ingresa tu contraseña actual' : 'Enter your current password'}
                value={passForInfo}
                onChange={e => setPassForInfo(e.target.value)}
              />
              <button type="button" className="pass-eye" onClick={() => setShowPassInfo(v => !v)}>
                {showPassInfo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
            borderRadius: 10, background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.2)',
          }}>
            <AlertCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {es
                ? 'Para cambiar tu usuario Epic o email debes confirmar tu identidad con tu contraseña actual.'
                : 'To change your Epic username or email you must confirm your identity with your current password.'}
            </p>
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingInfo || (!epicVal && !emailVal)}
          >
            {savingInfo ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
            {es ? 'Guardar datos' : 'Save info'}
          </button>
        </form>
      </div>

      {/* ── Sección 2: Cambiar contraseña ── */}
      <div className="security-card">
        <div className="security-card-header">
          <Key size={18} />
          <h3>{es ? 'Cambiar contraseña' : 'Change password'}</h3>
        </div>
        <form onSubmit={handleSavePassword} className="security-form">
          <div className="sec-field">
            <label><Lock size={13} /> {es ? 'Contraseña actual' : 'Current password'}</label>
            <div className="pass-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder={es ? 'Tu contraseña actual' : 'Your current password'}
                value={currPass}
                onChange={e => setCurrPass(e.target.value)}
                required
              />
              <button type="button" className="pass-eye" onClick={() => setShowPass(v => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="sec-field">
            <label><Key size={13} /> {es ? 'Nueva contraseña' : 'New password'}</label>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder={es ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'}
              value={newPass}
              onChange={e => { setNewPass(e.target.value); setPassMatch(true); }}
              required minLength={8}
            />
          </div>
          <div className="sec-field">
            <label><Key size={13} /> {es ? 'Confirmar nueva contraseña' : 'Confirm new password'}</label>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder={es ? 'Repite la nueva contraseña' : 'Repeat new password'}
              value={confirmPass}
              onChange={e => { setConfirmPass(e.target.value); setPassMatch(true); }}
              required minLength={8}
            />
          </div>
          {!passMatch && (
            <p style={{ margin: '-4px 0 4px', fontSize: '0.8rem', color: 'var(--red-500)' }}>
              ⚠️ {es ? 'Las contraseñas no coinciden' : 'Passwords do not match'}
            </p>
          )}
          {newPass && confirmPass && newPass === confirmPass && (
            <p style={{ margin: '-4px 0 4px', fontSize: '0.8rem', color: 'var(--green-500)' }}>
              ✓ {es ? 'Las contraseñas coinciden' : 'Passwords match'}
            </p>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={savingPass || !currPass || !newPass || !confirmPass || newPass !== confirmPass}
          >
            {savingPass ? <Loader2 className="spin" size={16} /> : <Key size={16} />}
            {es ? 'Cambiar contraseña' : 'Change password'}
          </button>
        </form>
      </div>

      {/* ── Sección 3: Discord ── */}
      <div className="security-card">
        <div className="security-card-header">
          <MessageSquare size={18} />
          <h3>{es ? 'Vincular Discord' : 'Link Discord'}</h3>
          {customer.discord_username && (
            <span className="discord-linked-badge">✓ {customer.discord_username}</span>
          )}
        </div>
        {customer.discord_username ? (
          <div className="security-form">
            <p className="sec-already-linked">
              {es
                ? <>{`Tu cuenta de Discord `}<strong>{customer.discord_username}</strong>{` ya está vinculada. Esto te permite hacer compras desde el bot de Discord.`}</>
                : <>{`Your Discord account `}<strong>{customer.discord_username}</strong>{` is already linked. This allows you to make purchases from the Discord bot.`}</>}
            </p>
            {!confirmUnlink ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmUnlink(true)}
                style={{ color: 'var(--red-500)', borderColor: 'var(--red-500)', marginTop: 12 }}
              >
                <MessageSquare size={16} />
                {es ? ' Desvincular Discord' : ' Unlink Discord'}
              </button>
            ) : (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.3)' }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ⚠️ {es
                    ? '¿Seguro que quieres desvincular tu Discord? Ya no podrás usar el bot hasta que lo vuelvas a vincular.'
                    : "Are you sure you want to unlink your Discord? You won't be able to use the bot until you link it again."}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmUnlink(false)} disabled={unlinking}>
                    {es ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleUnlinkDiscord}
                    disabled={unlinking}
                    style={{ background: '#ef4444', color: '#fff', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
                  >
                    {unlinking ? <Loader2 className="spin" size={14} /> : <MessageSquare size={14} />}
                    {es ? ' Sí, desvincular' : ' Yes, unlink'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="security-form">
            <p className="sec-note">
              {es
                ? 'Conecta tu cuenta de Discord para comprar desde el bot y recibir notificaciones.'
                : 'Connect your Discord account to buy from the bot and receive notifications.'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onDiscordOAuth}
              style={{ background: '#5865f2', boxShadow: '0 4px 14px rgba(88,101,242,0.4)' }}
            >
              <MessageSquare size={18} />
              {es ? ' Conectar con Discord' : ' Connect with Discord'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

/* ── Level bar ── */
const LEVELS = [
  { name: 'Starter', min: 0,     color: '#3b82f6', emoji: '⚡' },
  { name: 'Gamer',   min: 1000,  color: '#8b5cf6', emoji: '🎮' },
  { name: 'Pro',     min: 4000,  color: '#f59e0b', emoji: '🔥' },
  { name: 'Legend',  min: 10000, color: '#f59e0b', emoji: '👑' },
];
function LevelBar({ kc, lang }: { kc: number; lang: string }) {
  const currentIdx = kc >= 10000 ? 3 : kc >= 4000 ? 2 : kc >= 1000 ? 1 : 0;
  const current = LEVELS[currentIdx];
  const next    = LEVELS[Math.min(currentIdx + 1, 3)];
  const isMax   = currentIdx === 3;
  const pct     = isMax ? 100 : Math.min(100, ((kc - current.min) / (next.min - current.min)) * 100);
  return (
    <div className="level-bar-wrap">
      <div className="level-milestones">
        {LEVELS.map((l, i) => (
          <div key={l.name} className={`lm ${i <= currentIdx ? 'reached' : ''}`} style={i <= currentIdx ? { color: l.color } : {}}>
            <span className="lm-dot" style={i <= currentIdx ? { background: l.color } : {}} />
            <span className="lm-name">{l.emoji} {l.name}</span>
          </div>
        ))}
      </div>
      <div className="level-bar-bg"><div className="level-bar-fill" style={{ width: `${pct}%`, background: current.color }} /></div>
      {!isMax && <p className="level-bar-hint">{(next.min - kc).toLocaleString()} {lang === 'es' ? `KC más para ${next.emoji} ${next.name}` : `KC more to reach ${next.emoji} ${next.name}`}</p>}
      {isMax && <p className="level-bar-hint">🏆 {lang === 'es' ? 'Nivel máximo alcanzado' : 'Maximum level reached'}</p>}
    </div>
  );
}
