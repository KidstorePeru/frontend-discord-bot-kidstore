import { useEffect, useState, useRef, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getMyOrders, getMyOrderStats, getMe, updateProfile, updateAvatar, requestEmailChange, confirmEmailChange, startAccountLink, unlinkAccount, get2FAStatus, setup2FA, confirm2FA, disable2FA, deleteOwnAccount } from '../services/api';
import { KCBadge, PageLoader, Toast } from '../components/UI';
import SegTabs from '../components/SegTabs';
import { GoogleIcon, DiscordIcon } from '../components/OAuthButtons';
import type { Order, Customer } from '../types';
import {
  Package, Zap, User, Calendar, CheckCircle2,
  TrendingUp, ShoppingBag, Copy, Award,
  Shield, Mail, Key, AtSign, Lock, Eye, EyeOff, Loader2, Camera, AlertCircle,
  Phone, Clock, ChevronLeft, ChevronRight, ShieldCheck, Link2, Unlink,
  Smartphone, Trash2, X,
} from 'lucide-react';

const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

type Tab = 'profile' | 'security' | 'orders';
const PROFILE_TABS: Tab[] = ['profile', 'security', 'orders'];

/** Redimensiona una imagen en el navegador a un cuadrado pequeño y la
 *  devuelve como data URL JPEG — evita mandar fotos enormes al backend. */
function resizeImageToDataURL(file: File, size = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result as string; };
    reader.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas not supported')); return; }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { customer, refresh, setAuth } = useAuth();
  const { t, lang } = useLang();
  const { tab: tabParam } = useParams<{ tab: string }>();
  const es = lang === 'es';
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  // Totales calculados en el servidor sobre TODO el historial, no solo la
  // página cargada — antes se mostraba orders.length (como mucho el primer
  // lote) como si fuera el total real del cliente.
  const [orderStats, setOrderStats] = useState({ total_orders: 0, sent_orders: 0, total_spent_kc: 0 });
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    Promise.all([
      refresh(),
      getMyOrders(1, 100).then(r => { setOrders(r.orders); setOrdersTotal(r.total); }).catch(() => {}),
      getMyOrderStats().then(setOrderStats).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function loadMoreOrders() {
    setLoadingMore(true);
    try {
      const next = ordersPage + 1;
      const r = await getMyOrders(next, 100);
      setOrders(prev => [...prev, ...r.orders]);
      setOrdersTotal(r.total);
      setOrdersPage(next);
    } catch { /* se puede reintentar con el mismo botón */ }
    finally { setLoadingMore(false); }
  }

  if (loading || !customer) return <PageLoader />;

  if (!tabParam || !PROFILE_TABS.includes(tabParam as Tab)) {
    return <Navigate to="/account/profile" replace />;
  }
  const tab = tabParam as Tab;

  const totalSpentKC = orderStats.total_spent_kc;
  const memberSince  = new Date(customer.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const level = totalSpentKC >= 10000 ? 'Legend' : totalSpentKC >= 4000 ? 'Pro' : totalSpentKC >= 1000 ? 'Gamer' : 'Starter';
  const levelColors: Record<string, string> = { Starter: '#3b82f6', Gamer: '#8b5cf6', Pro: '#f59e0b', Legend: '#ec4899' };
  const levelEmojis: Record<string, string> = { Starter: '⚡', Gamer: '🎮', Pro: '🔥', Legend: '👑' };

  function handleCopyId() {
    navigator.clipboard.writeText(String(customer!.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="profile-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar">
          <img src={customer.avatar_url || '/kidcoin.png'} alt="avatar" onError={e => { (e.target as HTMLImageElement).src = '/kidcoin.png'; }}/>
          <span className="profile-level-badge" style={{ background: levelColors[level] }}>{levelEmojis[level]} {level}</span>
        </div>
        <div className="profile-hero-info">
          <h1 className="profile-username">{customer.epic_username}</h1>
          <p className="profile-email">{customer.email}</p>
          <div className="profile-member"><Calendar size={14} /><span>{t('profile.member.since')} {memberSince}</span></div>
        </div>
        <div className="profile-hero-actions">
          <Link to="/recharge" className="btn btn-primary"><Zap size={16} />{t('dash.recharge')}</Link>
          <Link to="/store" className="btn btn-ghost"><ShoppingBag size={16} />{es ? 'Tienda' : 'Store'}</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="pstat pstat-balance">
          <div className="pstat-icon"><img src="/kidcoin.png" alt="KC" /></div>
          <div><span className="pstat-label">{t('profile.balance')}</span><span className="pstat-value">{customer.kc_balance.toLocaleString()} KC</span></div>
        </div>
        <div className="pstat">
          <div className="pstat-icon"><Package size={22} /></div>
          <div><span className="pstat-label">{t('profile.orders.total')}</span><span className="pstat-value">{orderStats.total_orders.toLocaleString()}</span></div>
        </div>
        <div className="pstat">
          <div className="pstat-icon"><CheckCircle2 size={22} /></div>
          <div><span className="pstat-label">{t('profile.orders.sent')}</span><span className="pstat-value">{orderStats.sent_orders.toLocaleString()}</span></div>
        </div>
        <div className="pstat">
          <div className="pstat-icon"><TrendingUp size={22} /></div>
          <div><span className="pstat-label">{t('profile.spent')}</span><span className="pstat-value">{totalSpentKC.toLocaleString()} KC</span></div>
        </div>
      </div>

      {/* Progress */}
      <div className="profile-progress-card">
        <div className="progress-header"><Award size={18} /><span>{es ? 'Progreso de nivel' : 'Level progress'}</span><span className="progress-level" style={{ color: levelColors[level] }}>{levelEmojis[level]} {level}</span></div>
        <LevelBar kc={totalSpentKC} lang={lang} />
      </div>

      {/* Sidebar tabs + content */}
      <div className="profile-body">
        <div className="profile-sidebar-tabs">
          <Link to="/account/profile" className={`profile-side-tab ${tab === 'profile' ? 'active' : ''}`}>
            <User size={16} /> {es ? 'Perfil' : 'Profile'}
          </Link>
          <Link to="/account/security" className={`profile-side-tab ${tab === 'security' ? 'active' : ''}`}>
            <Shield size={16} />{es ? ' Seguridad' : ' Security'}
          </Link>
          <Link to="/account/orders" className={`profile-side-tab ${tab === 'orders' ? 'active' : ''}`}>
            <Package size={16} />{es ? ' Mis Órdenes' : ' My Orders'}
          </Link>
        </div>

        <div className="profile-tab-content">
          {tab === 'profile' && (
            <PerfilTab customer={customer} refresh={refresh} setAuth={setAuth} setToast={setToast} lang={lang} onCopyId={handleCopyId} copied={copied} />
          )}

          {tab === 'security' && (
            <SecurityTab customer={customer} setAuth={setAuth} setToast={setToast} lang={lang} />
          )}

          {tab === 'orders' && (
            <OrdersTab orders={orders} lang={lang} hasMore={orders.length < ordersTotal} loadingMore={loadingMore} onLoadMore={loadMoreOrders} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Perfil del Usuario ── */
function PerfilTab({ customer, refresh, setAuth, setToast, lang, onCopyId, copied }: {
  customer: Customer; refresh: () => Promise<void>; setAuth: (token: string, customer: Customer) => void;
  setToast: (v: { msg: string; type: 'success' | 'error' } | null) => void;
  lang: string; onCopyId: () => void; copied: boolean;
}) {
  const es = lang === 'es';
  const [epicVal, setEpicVal] = useState(customer.epic_username);
  const [passForEpic, setPassForEpic] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEpicVal(customer.epic_username); }, [customer.epic_username]);

  async function handleFileAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file);
      setAvatarPreview(dataUrl);
    } catch {
      setToast({ msg: es ? 'No se pudo procesar la imagen' : "Couldn't process the image", type: 'error' });
    }
  }

  async function handleSaveAvatar() {
    if (!avatarPreview) return;
    setAvatarSaving(true);
    try {
      await updateAvatar(avatarPreview);
      await refresh();
      setAvatarPreview('');
      setToast({ msg: es ? '✅ Foto de perfil actualizada' : '✅ Profile photo updated', type: 'success' });
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al subir la foto' : 'Error uploading photo'), type: 'error' });
    } finally { setAvatarSaving(false); }
  }

  async function handleSaveEpic(e: FormEvent) {
    e.preventDefault();
    if (!epicVal.trim()) return;
    if (customer.has_password && !passForEpic) {
      setToast({ msg: es ? 'Ingresa tu contraseña actual para confirmar el cambio' : 'Enter your current password to confirm the change', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ epic_username: epicVal.trim(), current_password: passForEpic || undefined });
      localStorage.setItem('kc_token', res.token);
      setAuth(res.token, res.customer);
      setToast({ msg: es ? '✅ Usuario Epic actualizado' : '✅ Epic username updated', type: 'success' });
      setPassForEpic('');
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al actualizar' : 'Update error'), type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <div className="security-section perfil-tab-vertical">
      {/* Foto de perfil */}
      <div className="security-card">
        <div className="security-card-header">
          <Camera size={18} />
          <h3>{es ? 'Foto de perfil' : 'Profile photo'}</h3>
        </div>
        <div className="security-form">
          <div className="avatar-preview-wrap">
            <img
              src={avatarPreview || customer.avatar_url || '/kidcoin.png'}
              alt="avatar"
              onError={e => { (e.target as HTMLImageElement).src = '/kidcoin.png'; }}
            />
          </div>
          <div className="avatar-modal-actions">
            <label className="avatar-upload-btn">
              <Camera size={15}/>{es ? ' Elegir foto' : ' Choose photo'}
              <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFileAvatar}/>
            </label>
            <button className="btn btn-primary" type="button" onClick={handleSaveAvatar} disabled={!avatarPreview || avatarSaving}>
              {avatarSaving ? <Loader2 size={16} className="spin"/> : <CheckCircle2 size={16}/>}{es ? ' Guardar' : ' Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Usuario Epic Games */}
      <div className="security-card">
        <div className="security-card-header">
          <User size={18} />
          <h3>{es ? 'Usuario Epic Games' : 'Epic Games username'}</h3>
        </div>
        <form onSubmit={handleSaveEpic} className="security-form">
          <div className="sec-field">
            <label><User size={13} /> {es ? 'Usuario Epic' : 'Epic username'}</label>
            <input
              type="text"
              value={epicVal}
              onChange={e => setEpicVal(e.target.value)}
              minLength={3} maxLength={50}
            />
          </div>
          {customer.has_password && (
            <div className="sec-field">
              <label><Lock size={13} /> {es ? 'Contraseña actual (para confirmar)' : 'Current password (to confirm)'}</label>
              <div className="pass-wrap">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={es ? 'Ingresa tu contraseña actual' : 'Enter your current password'}
                  value={passForEpic}
                  onChange={e => setPassForEpic(e.target.value)}
                />
                <button type="button" className="pass-eye" onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={saving || !epicVal.trim() || epicVal.trim() === customer.epic_username}>
            {saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
            {es ? 'Guardar' : 'Save'}
          </button>
        </form>
      </div>

      {/* Informacion de la cuenta */}
      <div className="security-card">
        <div className="security-card-header">
          <AtSign size={18} />
          <h3>{es ? 'Información de la cuenta' : 'Account information'}</h3>
        </div>
        <div className="account-info-grid">
          <div className="account-info-item">
            <span className="account-info-label"><Mail size={13}/> {es ? 'Email' : 'Email'}</span>
            <span className="account-info-value">{customer.email || '—'}</span>
          </div>
          <div className="account-info-item">
            <span className="account-info-label"><Phone size={13}/> {es ? 'Teléfono' : 'Phone'}</span>
            <span className="account-info-value">{customer.phone || (es ? 'No registrado' : 'Not set')}</span>
          </div>
          <div className="account-info-item">
            <span className="account-info-label"><User size={13}/> {es ? 'Usuario ID' : 'User ID'}</span>
            <span className="account-info-value account-info-mono">
              {customer.id}
              <button className="btn-copy-sm" onClick={onCopyId} type="button">
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              </button>
            </span>
          </div>
          <div className="account-info-item">
            <span className="account-info-label"><Calendar size={13}/> {es ? 'Miembro desde' : 'Member since'}</span>
            <span className="account-info-value">{new Date(customer.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Security Tab ── */
function SecurityTab({ customer, setAuth, setToast, lang }: {
  customer: Customer; setAuth: (token: string, customer: Customer) => void;
  setToast: (v: { msg: string; type: 'success' | 'error' } | null) => void;
  lang: string;
}) {
  const es = lang === 'es';
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ── Cuentas vinculadas (Google / Discord) ──
  const [linking, setLinking] = useState<'google' | 'discord' | null>(null);
  const [unlinking, setUnlinking] = useState<'google' | 'discord' | null>(null);
  // Si la cuenta tiene contraseña, vincular un proveedor nuevo pide
  // confirmarla primero (ver HandlerStartLink) — agrega un método de
  // acceso permanente, así que no basta con tener la sesión abierta.
  const [linkPasswordPrompt, setLinkPasswordPrompt] = useState<'google' | 'discord' | null>(null);
  const [linkPassword, setLinkPassword] = useState('');

  // ── 2FA (solo cuentas admin) ──
  const [totpStatus, setTotpStatus] = useState<{ enabled: boolean; backup_codes_remaining: number } | null>(null);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [totpQr, setTotpQr] = useState('');
  const [totpConfirmCode, setTotpConfirmCode] = useState('');
  const [totpBackupCodes, setTotpBackupCodes] = useState<string[] | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [showReplace2FA, setShowReplace2FA] = useState(false);
  const [replace2FAPassword, setReplace2FAPassword] = useState('');

  useEffect(() => {
    if (!customer.is_admin) return;
    get2FAStatus().then(setTotpStatus).catch(() => {});
  }, [customer.is_admin]);

  async function handleStart2FASetup(password?: string) {
    setTotpLoading(true); setTotpError('');
    try {
      const data = await setup2FA(password);
      setTotpSetupData(data);
      setShowReplace2FA(false); setReplace2FAPassword('');
      const qr = await QRCode.toDataURL(data.otpauth_url, { width: 220, margin: 1 });
      setTotpQr(qr);
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : (es ? 'Error iniciando la activación' : 'Error starting setup'));
    } finally { setTotpLoading(false); }
  }

  async function handleReplace2FASubmit(e: FormEvent) {
    e.preventDefault();
    await handleStart2FASetup(replace2FAPassword);
  }

  async function handleConfirm2FA(e: FormEvent) {
    e.preventDefault(); setTotpLoading(true); setTotpError('');
    try {
      const res = await confirm2FA(totpConfirmCode.trim());
      setTotpBackupCodes(res.backup_codes);
      setTotpSetupData(null); setTotpQr(''); setTotpConfirmCode('');
      setTotpStatus({ enabled: true, backup_codes_remaining: res.backup_codes.length });
      setToast({ msg: es ? '✅ Verificación en dos pasos activada' : '✅ Two-factor verification enabled', type: 'success' });
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : (es ? 'Código incorrecto' : 'Incorrect code'));
    } finally { setTotpLoading(false); }
  }

  async function handleDisable2FA(e: FormEvent) {
    e.preventDefault(); setTotpLoading(true); setTotpError('');
    try {
      await disable2FA(disable2FAPassword);
      setTotpStatus({ enabled: false, backup_codes_remaining: 0 });
      setShowDisable2FA(false); setDisable2FAPassword('');
      setToast({ msg: es ? '✅ Verificación en dos pasos desactivada' : '✅ Two-factor verification disabled', type: 'success' });
    } catch (err: unknown) {
      setTotpError(err instanceof Error ? err.message : (es ? 'Contraseña incorrecta' : 'Incorrect password'));
    } finally { setTotpLoading(false); }
  }

  // ── Eliminar cuenta ──
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault(); setDeleting(true); setDeleteError('');
    try {
      await deleteOwnAccount(deletePassword);
      logout();
      navigate('/');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : (es ? 'Contraseña incorrecta' : 'Incorrect password'));
    } finally { setDeleting(false); }
  }

  useEffect(() => {
    const linked = searchParams.get('linked');
    const linkError = searchParams.get('link_error');
    if (linked === 'google' || linked === 'discord') {
      setToast({ msg: es ? `✅ ${linked === 'google' ? 'Google' : 'Discord'} vinculado correctamente` : `✅ ${linked === 'google' ? 'Google' : 'Discord'} linked successfully`, type: 'success' });
      setSearchParams({}, { replace: true });
    } else if (linkError) {
      const provider = searchParams.get('provider');
      const label = provider === 'google' ? 'Google' : provider === 'discord' ? 'Discord' : '';
      const reason = linkError === 'already_linked_elsewhere'
        ? (es ? `Esa cuenta de ${label} ya está vinculada a otro usuario` : `That ${label} account is already linked to another user`)
        : (es ? `No se pudo vincular ${label}` : `Couldn't link ${label}`);
      setToast({ msg: `❌ ${reason}`, type: 'error' });
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestLink(provider: 'google' | 'discord') {
    if (customer!.has_password) { setLinkPasswordPrompt(provider); return; }
    handleLink(provider);
  }

  async function handleLink(provider: 'google' | 'discord', password?: string) {
    setLinking(provider);
    try {
      const linkToken = await startAccountLink(provider, password);
      window.location.href = `${BASE}/auth/${provider}?link_token=${encodeURIComponent(linkToken)}`;
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al iniciar la vinculación' : 'Error starting the link'), type: 'error' });
      setLinking(null);
    }
  }

  async function handleLinkPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    const provider = linkPasswordPrompt;
    if (!provider) return;
    setLinkPasswordPrompt(null);
    const pwd = linkPassword;
    setLinkPassword('');
    await handleLink(provider, pwd);
  }

  async function handleUnlink(provider: 'google' | 'discord') {
    setUnlinking(provider);
    try {
      await unlinkAccount(provider);
      const updated = await getMe();
      setAuth(localStorage.getItem('kc_token') || '', updated);
      setToast({ msg: es ? `✅ ${provider === 'google' ? 'Google' : 'Discord'} desvinculado` : `✅ ${provider === 'google' ? 'Google' : 'Discord'} unlinked`, type: 'success' });
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al desvincular' : 'Error unlinking'), type: 'error' });
    } finally { setUnlinking(null); }
  }

  // ── Email (2FA / OTP) ──
  const [emailStep, setEmailStep] = useState<'form' | 'code'>('form');
  const [emailVal, setEmailVal] = useState(customer.email || '');
  const [passForEmail, setPassForEmail] = useState('');
  const [showPassEmail, setShowPassEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmingEmail, setConfirmingEmail] = useState(false);

  useEffect(() => { setEmailVal(customer.email || ''); }, [customer.email]);

  // ── Telefono ──
  const [phoneVal, setPhoneVal] = useState(customer.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  // ── Contrasena ──
  const [currPass,    setCurrPass]    = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [savingPass,  setSavingPass]  = useState(false);
  const [passMatch,   setPassMatch]   = useState(true);

  const emailLocked = !!customer.next_email_change_at && new Date(customer.next_email_change_at) > new Date();
  const emailUnlockDate = customer.next_email_change_at
    ? new Date(customer.next_email_change_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  async function handleRequestEmailChange(e: FormEvent) {
    e.preventDefault();
    const newEmail = emailVal.trim();
    if (!newEmail || newEmail === customer.email) return;
    if (customer.has_password && !passForEmail) {
      setToast({ msg: es ? 'Ingresa tu contraseña actual para confirmar el cambio' : 'Enter your current password to confirm the change', type: 'error' });
      return;
    }
    setSavingEmail(true);
    try {
      await requestEmailChange(newEmail, passForEmail || undefined);
      setEmailStep('code');
      setToast({ msg: es ? `📧 Código enviado a ${newEmail}` : `📧 Code sent to ${newEmail}`, type: 'success' });
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al solicitar el cambio' : 'Error requesting the change'), type: 'error' });
    } finally { setSavingEmail(false); }
  }

  async function handleConfirmEmailChange(e: FormEvent) {
    e.preventDefault();
    if (otpCode.trim().length !== 6) return;
    setConfirmingEmail(true);
    try {
      const res = await confirmEmailChange(otpCode.trim());
      localStorage.setItem('kc_token', res.token);
      setAuth(res.token, res.customer);
      setToast({ msg: es ? '✅ Email actualizado correctamente' : '✅ Email updated successfully', type: 'success' });
      setEmailStep('form'); setOtpCode(''); setPassForEmail('');
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Código incorrecto o expirado' : 'Incorrect or expired code'), type: 'error' });
    } finally { setConfirmingEmail(false); }
  }

  function handleCancelEmailChange() {
    setEmailStep('form'); setOtpCode('');
  }

  async function handleSavePhone(e: FormEvent) {
    e.preventDefault();
    setSavingPhone(true);
    try {
      const res = await updateProfile({ phone: phoneVal.trim() || null });
      localStorage.setItem('kc_token', res.token);
      setAuth(res.token, res.customer);
      setToast({ msg: es ? '✅ Teléfono guardado' : '✅ Phone saved', type: 'success' });
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al guardar el teléfono' : 'Error saving phone'), type: 'error' });
    } finally { setSavingPhone(false); }
  }

  async function handleSavePassword(e: FormEvent) {
    e.preventDefault();
    if (!newPass || !confirmPass) return;
    if (customer.has_password && !currPass) return;
    if (newPass !== confirmPass) { setPassMatch(false); return; }
    setPassMatch(true);
    setSavingPass(true);
    try {
      const res = await updateProfile({
        current_password: customer.has_password ? currPass : undefined,
        new_password: newPass,
      });
      localStorage.setItem('kc_token', res.token);
      setAuth(res.token, res.customer);
      setToast({ msg: es ? '✅ Contraseña guardada correctamente' : '✅ Password saved successfully', type: 'success' });
      setCurrPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : (es ? 'Error al cambiar contraseña' : 'Password change error'), type: 'error' });
    } finally { setSavingPass(false); }
  }

  return (
    <div className="security-section">

      {/* ── Correo electronico (2FA / OTP) ── */}
      <div className="security-card">
        <div className="security-card-header">
          <Mail size={18} />
          <h3>{es ? 'Correo electrónico' : 'Email'}</h3>
        </div>

        {emailStep === 'form' ? (
          <form onSubmit={handleRequestEmailChange} className="security-form">
            <div className="sec-field">
              <label><Mail size={13} /> {es ? 'Correo electrónico' : 'Email address'}</label>
              <input
                type="email"
                value={emailVal}
                onChange={e => setEmailVal(e.target.value)}
                disabled={emailLocked}
              />
            </div>
            {customer.has_password && (
              <div className="sec-field">
                <label><Lock size={13} /> {es ? 'Contraseña actual (para confirmar)' : 'Current password (to confirm)'}</label>
                <div className="pass-wrap">
                  <input
                    type={showPassEmail ? 'text' : 'password'}
                    placeholder={es ? 'Ingresa tu contraseña actual' : 'Enter your current password'}
                    value={passForEmail}
                    onChange={e => setPassForEmail(e.target.value)}
                    disabled={emailLocked}
                  />
                  <button type="button" className="pass-eye" onClick={() => setShowPassEmail(v => !v)}>
                    {showPassEmail ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            {emailLocked ? (
              <div className="sec-note sec-note-lock">
                <Clock size={14} style={{ flexShrink: 0 }} />
                {es
                  ? `Ya cambiaste tu email recientemente. Podrás volver a hacerlo el ${emailUnlockDate}.`
                  : `You've already changed your email recently. You can change it again on ${emailUnlockDate}.`}
              </div>
            ) : (
              <div className="sec-note">
                {es
                  ? 'Por seguridad, te enviaremos un código de verificación al nuevo correo antes de aplicar el cambio. El email solo puede cambiarse una vez cada 90 días.'
                  : "For security, we'll send a verification code to the new email before applying the change. The email can only be changed once every 90 days."}
              </div>
            )}
            <button className="btn btn-primary" type="submit" disabled={savingEmail || !emailVal.trim() || emailVal.trim() === customer.email || emailLocked}>
              {savingEmail ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
              {es ? 'Enviar código de verificación' : 'Send verification code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmEmailChange} className="security-form">
            <div className="sec-note">
              {es
                ? `Ingresa el código de 6 dígitos que enviamos a ${emailVal.trim()}.`
                : `Enter the 6-digit code we sent to ${emailVal.trim()}.`}
            </div>
            <div className="sec-field">
              <label><ShieldCheck size={13} /> {es ? 'Código de verificación' : 'Verification code'}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                style={{ letterSpacing: '0.3em', fontWeight: 700, textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" type="button" onClick={handleCancelEmailChange}>
                {es ? 'Cancelar' : 'Cancel'}
              </button>
              <button className="btn btn-primary" type="submit" disabled={confirmingEmail || otpCode.length !== 6}>
                {confirmingEmail ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                {es ? 'Confirmar código' : 'Confirm code'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Telefono ── */}
      <div className="security-card">
        <div className="security-card-header">
          <Phone size={18} />
          <h3>{es ? 'Teléfono móvil' : 'Mobile phone'}</h3>
        </div>
        <form onSubmit={handleSavePhone} className="security-form">
          <div className="sec-field">
            <label><Phone size={13} /> {es ? 'Número de teléfono' : 'Phone number'}</label>
            <input
              type="tel"
              placeholder={es ? 'Ej: +51 987 654 321' : 'e.g. +1 555 123 4567'}
              value={phoneVal}
              onChange={e => setPhoneVal(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="sec-note">
            {es
              ? 'Solo lo usamos para contactarte si ocurre algún problema con tu cuenta o pedidos.'
              : "We only use it to contact you if there's an issue with your account or orders."}
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingPhone}>
            {savingPhone ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
            {es ? 'Guardar teléfono' : 'Save phone'}
          </button>
        </form>
      </div>

      {/* ── Contrasena ── */}
      <div className="security-card">
        <div className="security-card-header">
          <Key size={18} />
          <h3>{customer.has_password ? (es ? 'Cambiar contraseña' : 'Change password') : (es ? 'Configurar contraseña' : 'Set a password')}</h3>
        </div>
        <form onSubmit={handleSavePassword} className="security-form">
          {!customer.has_password && (
            <div className="sec-note">
              {es
                ? 'Te registraste con Google o Discord y aún no tienes contraseña. Configura una para poder iniciar sesión también con tu correo y contraseña.'
                : "You signed up with Google or Discord and don't have a password yet. Set one so you can also log in with your email and password."}
            </div>
          )}
          {customer.has_password && (
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
          )}
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
            disabled={savingPass || (customer.has_password && !currPass) || !newPass || !confirmPass || newPass !== confirmPass}
          >
            {savingPass ? <Loader2 className="spin" size={16} /> : <Key size={16} />}
            {customer.has_password ? (es ? 'Cambiar contraseña' : 'Change password') : (es ? 'Configurar contraseña' : 'Set password')}
          </button>
        </form>
      </div>

      {/* ── Cuentas vinculadas ── */}
      <div className="security-card">
        <div className="security-card-header">
          <Link2 size={18} />
          <h3>{es ? 'Cuentas vinculadas' : 'Linked accounts'}</h3>
        </div>
        <div className="linked-accounts">
          <div className="linked-account-row">
            <div className="linked-account-info">
              <GoogleIcon />
              <div>
                <strong>Google</strong>
                <span>{customer.google_linked ? (es ? 'Vinculada' : 'Linked') : (es ? 'No vinculada' : 'Not linked')}</span>
              </div>
            </div>
            {customer.google_linked ? (
              <button className="btn btn-ghost btn-sm" onClick={() => handleUnlink('google')} disabled={unlinking === 'google'}>
                {unlinking === 'google' ? <Loader2 size={14} className="spin" /> : <Unlink size={14} />} {es ? 'Desvincular' : 'Unlink'}
              </button>
            ) : linkPasswordPrompt === 'google' ? (
              <form onSubmit={handleLinkPasswordSubmit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="password" autoFocus required placeholder={es ? 'Tu contraseña' : 'Your password'}
                  value={linkPassword} onChange={e => setLinkPassword(e.target.value)} style={{ width: 140 }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLinkPasswordPrompt(null); setLinkPassword(''); }}>{es ? 'Cancelar' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={linking === 'google'}>
                  {linking === 'google' ? <Loader2 size={14} className="spin" /> : (es ? 'Confirmar' : 'Confirm')}
                </button>
              </form>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => requestLink('google')} disabled={linking === 'google'}>
                {linking === 'google' ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />} {es ? 'Vincular' : 'Link'}
              </button>
            )}
          </div>
          <div className="linked-account-row">
            <div className="linked-account-info">
              <DiscordIcon />
              <div>
                <strong>Discord</strong>
                <span>{customer.discord_linked ? (customer.discord_username || (es ? 'Vinculada' : 'Linked')) : (es ? 'No vinculada' : 'Not linked')}</span>
              </div>
            </div>
            {customer.discord_linked ? (
              <button className="btn btn-ghost btn-sm" onClick={() => handleUnlink('discord')} disabled={unlinking === 'discord'}>
                {unlinking === 'discord' ? <Loader2 size={14} className="spin" /> : <Unlink size={14} />} {es ? 'Desvincular' : 'Unlink'}
              </button>
            ) : linkPasswordPrompt === 'discord' ? (
              <form onSubmit={handleLinkPasswordSubmit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="password" autoFocus required placeholder={es ? 'Tu contraseña' : 'Your password'}
                  value={linkPassword} onChange={e => setLinkPassword(e.target.value)} style={{ width: 140 }} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLinkPasswordPrompt(null); setLinkPassword(''); }}>{es ? 'Cancelar' : 'Cancel'}</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={linking === 'discord'}>
                  {linking === 'discord' ? <Loader2 size={14} className="spin" /> : (es ? 'Confirmar' : 'Confirm')}
                </button>
              </form>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => requestLink('discord')} disabled={linking === 'discord'}>
                {linking === 'discord' ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />} {es ? 'Vincular' : 'Link'}
              </button>
            )}
          </div>
        </div>
        <div className="sec-note linked-accounts-note">
          {es
            ? 'Vincula Google y/o Discord para poder iniciar sesión con cualquiera de ellos, además de tu correo y contraseña.'
            : 'Link Google and/or Discord so you can log in with any of them, in addition to your email and password.'}
        </div>
      </div>

      {/* ── 2FA (solo admin) ── */}
      {customer.is_admin && (
        <div className="security-card">
          <div className="security-card-header">
            <Smartphone size={18} />
            <h3>{es ? 'Verificación en dos pasos' : 'Two-factor verification'}</h3>
          </div>
          <div className="security-form">
            {totpError && <div className="auth-error"><AlertCircle size={15} />{totpError}</div>}

            {/* Códigos de respaldo recién generados — se muestran una sola vez */}
            {totpBackupCodes ? (
              <div>
                <div className="sec-note" style={{ marginBottom: 12 }}>
                  {es
                    ? '⚠️ Guarda estos 8 códigos de respaldo en un lugar seguro — cada uno sirve una sola vez, y es la única forma de entrar si pierdes tu teléfono. No se van a volver a mostrar.'
                    : '⚠️ Save these 8 backup codes somewhere safe — each works once, and they are the only way in if you lose your phone. They will not be shown again.'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: 'monospace', fontSize: '.9rem', marginBottom: 16 }}>
                  {totpBackupCodes.map(code => (
                    <div key={code} style={{ padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: 8, textAlign: 'center' }}>{code}</div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={() => setTotpBackupCodes(null)}>
                  {es ? 'Ya los guardé' : "I've saved them"}
                </button>
              </div>
            ) : totpSetupData ? (
              <form onSubmit={handleConfirm2FA}>
                <p className="sec-note" style={{ marginBottom: 14 }}>
                  {es
                    ? 'Escanea este código QR con Google Authenticator, Authy, o cualquier app compatible con TOTP. Si no puedes escanear, ingresa el código manualmente.'
                    : 'Scan this QR code with Google Authenticator, Authy, or any TOTP-compatible app. If you can\'t scan it, enter the code manually.'}
                </p>
                {totpQr && <img src={totpQr} alt="QR 2FA" style={{ display: 'block', margin: '0 auto 14px', borderRadius: 12 }} />}
                <div className="sec-field">
                  <label>{es ? 'Código manual' : 'Manual code'}</label>
                  <input type="text" readOnly value={totpSetupData.secret} onClick={e => (e.target as HTMLInputElement).select()} style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="sec-field">
                  <label>{es ? 'Código de 6 dígitos' : '6-digit code'}</label>
                  <input type="text" placeholder="123456" value={totpConfirmCode} onChange={e => setTotpConfirmCode(e.target.value)} required autoFocus maxLength={6} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setTotpSetupData(null); setTotpQr(''); setTotpError(''); }}>{es ? 'Cancelar' : 'Cancel'}</button>
                  <button className="btn btn-primary" type="submit" disabled={totpLoading}>
                    {totpLoading ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />} {es ? 'Confirmar' : 'Confirm'}
                  </button>
                </div>
              </form>
            ) : totpStatus?.enabled ? (
              <>
                <div className="sec-note">
                  {es
                    ? `✅ Activado. Te quedan ${totpStatus.backup_codes_remaining} código(s) de respaldo sin usar.`
                    : `✅ Enabled. You have ${totpStatus.backup_codes_remaining} unused backup code(s) left.`}
                </div>
                {!showDisable2FA && !showReplace2FA ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => { setShowReplace2FA(true); setTotpError(''); }}>{es ? 'Reemplazar 2FA' : 'Replace 2FA'}</button>
                    <button className="btn btn-ghost" onClick={() => { setShowDisable2FA(true); setTotpError(''); }}>{es ? 'Desactivar 2FA' : 'Disable 2FA'}</button>
                  </div>
                ) : showReplace2FA ? (
                  <form onSubmit={handleReplace2FASubmit}>
                    <div className="sec-note" style={{ marginBottom: 14 }}>
                      {es
                        ? 'Vas a generar un secreto 2FA nuevo. El actual sigue activo hasta que confirmes el reemplazo con un código de tu nueva app.'
                        : "You're about to generate a new 2FA secret. The current one stays active until you confirm the replacement with a code from your new app."}
                    </div>
                    <div className="sec-field">
                      <label><Lock size={13} /> {es ? 'Confirma tu contraseña' : 'Confirm your password'}</label>
                      <input type="password" value={replace2FAPassword} onChange={e => setReplace2FAPassword(e.target.value)} required autoFocus />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => { setShowReplace2FA(false); setReplace2FAPassword(''); setTotpError(''); }}>{es ? 'Cancelar' : 'Cancel'}</button>
                      <button className="btn btn-primary" type="submit" disabled={totpLoading}>
                        {totpLoading ? <Loader2 className="spin" size={16} /> : (es ? 'Continuar' : 'Continue')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleDisable2FA}>
                    <div className="sec-field">
                      <label><Lock size={13} /> {es ? 'Confirma tu contraseña' : 'Confirm your password'}</label>
                      <input type="password" value={disable2FAPassword} onChange={e => setDisable2FAPassword(e.target.value)} required autoFocus />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => { setShowDisable2FA(false); setTotpError(''); }}>{es ? 'Cancelar' : 'Cancel'}</button>
                      <button className="btn btn-primary" type="submit" disabled={totpLoading}>
                        {totpLoading ? <Loader2 className="spin" size={16} /> : (es ? 'Desactivar' : 'Disable')}
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <>
                <div className="sec-note">
                  {es
                    ? 'Tu cuenta administra dinero real y datos de clientes — activa un segundo factor para protegerla mejor.'
                    : 'Your account manages real money and customer data — enable a second factor to protect it better.'}
                </div>
                <button className="btn btn-primary" onClick={() => handleStart2FASetup()} disabled={totpLoading}>
                  {totpLoading ? <Loader2 className="spin" size={16} /> : <Smartphone size={16} />} {es ? 'Activar 2FA' : 'Enable 2FA'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Eliminar cuenta ── */}
      {!customer.is_admin && (
        <div className="security-card danger">
          <div className="security-card-header">
            <Trash2 size={18} />
            <h3>{es ? 'Eliminar cuenta' : 'Delete account'}</h3>
          </div>
          <div className="security-form">
            {!showDeleteAccount ? (
              <>
                <div className="sec-note sec-note-danger">
                  {es
                    ? 'Esto elimina tus datos personales de forma permanente y no podrás volver a iniciar sesión. No se puede deshacer.'
                    : 'This permanently removes your personal data and you will no longer be able to log in. This cannot be undone.'}
                </div>
                {!customer.has_password ? (
                  <div className="sec-note">
                    {es
                      ? 'Tu cuenta no tiene contraseña (creada con Google/Discord) — contáctanos por soporte para eliminarla.'
                      : "Your account doesn't have a password (created via Google/Discord) — contact support to delete it."}
                  </div>
                ) : (
                  <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDeleteAccount(true)}>
                    <Trash2 size={15} /> {es ? 'Eliminar mi cuenta' : 'Delete my account'}
                  </button>
                )}
              </>
            ) : (
              <form onSubmit={handleDeleteAccount}>
                {deleteError && <div className="auth-error" style={{ marginBottom: 14 }}><AlertCircle size={15} />{deleteError}</div>}
                <div className="sec-field">
                  <label><Lock size={13} /> {es ? 'Confirma tu contraseña para continuar' : 'Confirm your password to continue'}</label>
                  <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} required autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowDeleteAccount(false); setDeletePassword(''); setDeleteError(''); }}>
                    <X size={14} /> {es ? 'Cancelar' : 'Cancel'}
                  </button>
                  <button className="btn btn-danger" type="submit" disabled={deleting}>
                    {deleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />} {es ? 'Sí, eliminar permanentemente' : 'Yes, delete permanently'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Mis Ordenes ── */
type OrderFilter = 'all' | 'processing' | 'delivery' | 'completed' | 'refunded';
const ORDER_TABS: { key: OrderFilter; es: string; en: string }[] = [
  { key: 'all',        es: 'Todos',        en: 'All' },
  { key: 'processing', es: 'Procesamiento', en: 'Processing' },
  { key: 'delivery',   es: 'Entrega',      en: 'Delivery' },
  { key: 'completed',  es: 'Completado',   en: 'Completed' },
  { key: 'refunded',   es: 'Reembolsado',  en: 'Refunded' },
];
const ORDERS_PER_PAGE = 8;

function matchesFilter(status: Order['status'], filter: OrderFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'processing': return status === 'pending';
    case 'delivery': return status === 'processing';
    case 'completed': return status === 'sent';
    case 'refunded': return status === 'failed' || status === 'refunded';
    default: return true;
  }
}

function OrdersTab({ orders, lang, hasMore, loadingMore, onLoadMore }: {
  orders: Order[]; lang: string; hasMore: boolean; loadingMore: boolean; onLoadMore: () => void;
}) {
  const es = lang === 'es';
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [page, setPage] = useState(1);

  const filtered = orders.filter(o => matchesFilter(o.status, filter));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ORDERS_PER_PAGE, page * ORDERS_PER_PAGE);

  function selectFilter(f: OrderFilter) { setFilter(f); setPage(1); }

  return (
    <div className="profile-section orders-tab">
      <div className="section-header">
        <h2><Package size={20} /> {es ? 'Mis Órdenes' : 'My Orders'}</h2>
      </div>

      <SegTabs
        className="order-filters"
        variant="surface"
        size="sm"
        activeKey={filter}
        onSelect={(k) => selectFilter(k as OrderFilter)}
        ariaLabel={es ? 'Filtrar órdenes' : 'Filter orders'}
        items={ORDER_TABS.map(f => ({
          key: f.key,
          label: (
            <>
              {es ? f.es : f.en}
              <span className="seg-count">{orders.filter(o => matchesFilter(o.status, f.key)).length}</span>
            </>
          ),
        }))}
      />

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={40} strokeWidth={1} />
          <p>{es ? 'No tienes órdenes en esta categoría' : "You don't have orders in this category"}</p>
          <Link to="/store" className="btn btn-primary btn-sm">{t_go(es)}</Link>
        </div>
      ) : (
        <>
          <div className="order-detail-list">
            {paged.map(o => <OrderDetailCard key={o.id} order={o} lang={lang} />)}
          </div>
          {totalPages > 1 && (
            <div className="dash-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14}/></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14}/></button>
            </div>
          )}
          {/* El historial se carga de a 100 pedidos — si hay más, hace
              falta pedir la siguiente página al servidor antes de que
              aparezcan acá (antes, /perfil pedía 200 de una sola vez y el
              backend los recortaba a 20 sin avisar; ahora si hay más de
              los ya cargados, se ofrece traerlos explícitamente). */}
          {hasMore && page >= totalPages && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost" disabled={loadingMore} onClick={onLoadMore}>
                {loadingMore ? (es ? 'Cargando...' : 'Loading...') : (es ? 'Cargar más pedidos' : 'Load more orders')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function t_go(es: boolean) { return es ? 'Ir a la tienda' : 'Go to store'; }

// "failed" y "refunded" se muestran distinto a propósito — un pedido pasa
// por 'failed' apenas se intenta el reembolso, y recién queda 'refunded'
// cuando ESE reembolso se confirma (ver failOrderAndRefund en el backend).
// Casi siempre son segundos, pero en el caso raro de que el primer intento
// falle (queda pendiente de un reintento automático), decir "Reembolsado"
// sin que sea cierto todavía sería la misma promesa vacía que se corrigió
// en el correo de pedido fallido.
const STATUS_META: Record<Order['status'], { es: string; en: string; color: string }> = {
  pending:    { es: 'En procesamiento', en: 'Processing',  color: 'var(--amber-500)' },
  processing: { es: 'En entrega',       en: 'Out for delivery', color: 'var(--blue-500)' },
  sent:       { es: 'Completado',       en: 'Completed',   color: 'var(--green-500)' },
  failed:     { es: 'Reembolso en proceso', en: 'Refund in progress', color: 'var(--amber-500)' },
  refunded:   { es: 'Reembolsado',      en: 'Refunded',    color: 'var(--gray-500)' },
};

function OrderDetailCard({ order, lang }: { order: Order; lang: string }) {
  const es = lang === 'es';
  const [copied, setCopied] = useState(false);
  const meta = STATUS_META[order.status] ?? { es: order.status, en: order.status, color: 'var(--text-muted)' };

  function copyId() {
    navigator.clipboard.writeText(order.id);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="order-detail-card">
      <div className="order-detail-img">
        {order.item_image ? <img src={order.item_image} alt={order.item_name} /> : <div className="order-img-placeholder">🎮</div>}
      </div>
      <div className="order-detail-body">
        <div className="order-detail-top">
          <strong>{order.item_name}</strong>
          <span className="status-badge" style={{ '--badge-color': meta.color } as React.CSSProperties}>{es ? meta.es : meta.en}</span>
        </div>
        <div className="order-detail-meta">
          <span className="order-detail-id">
            {es ? 'ID de orden:' : 'Order ID:'} <code>{order.id.slice(0, 13)}…</code>
            <button className="btn-copy-sm" onClick={copyId} type="button">{copied ? <CheckCircle2 size={12}/> : <Copy size={12}/>}</button>
          </span>
          <span className="order-detail-date"><Clock size={12}/> {new Date(order.created_at).toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="order-detail-prices">
          <KCBadge amount={order.price_kc} size="sm" />
          {order.price_vbucks > 0 && <span className="order-detail-vbucks">🎮 {order.price_vbucks.toLocaleString()} V-Bucks</span>}
          <span className="order-detail-epic">{es ? 'Cuenta Epic:' : 'Epic account:'} <strong>{order.epic_username}</strong></span>
        </div>
        {(order.status === 'failed' || order.status === 'refunded') && order.error_msg && (
          <div className="order-detail-error">
            <AlertCircle size={13}/> {order.error_msg}
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
  { name: 'Legend',  min: 10000, color: '#ec4899', emoji: '👑' },
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
