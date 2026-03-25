import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { register, resendVerification } from '../services/api';
import { UserPlus, Loader2, Gamepad2, Mail, Lock, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Register() {
  const [epicUsername, setEpicUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const { t, lang } = useLang();
  const es = lang === 'es';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await register(epicUsername.trim(), email.trim(), password);
      setRegistered(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.error.register'));
    } finally { setLoading(false); }
  }

  async function handleResend() {
    setResending(true); setResendMsg('');
    try {
      await resendVerification(email, lang);
      setResendMsg(es
        ? '✅ Nuevo enlace enviado. Revisa tu bandeja de entrada.'
        : '✅ New link sent. Check your inbox.');
    } catch {
      setResendMsg(es
        ? '❌ Error al reenviar. Inténtalo de nuevo.'
        : '❌ Error resending. Please try again.');
    } finally { setResending(false); }
  }

  // ── Pantalla de verificación pendiente ──
  if (registered) {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
          <h2 className="auth-panel-title">
            {es ? '¡Ya casi!' : 'Almost there!'}<br />
            <span>{es ? 'Verifica tu correo' : 'Verify your email'}</span>
          </h2>
          <p className="auth-panel-sub">
            {es
              ? 'Un último paso — confirma tu correo para activar tu cuenta y empezar a comprar.'
              : 'One last step — confirm your email to activate your account and start shopping.'}
          </p>
          <div className="auth-panel-features">
            <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'El enlace expira en 24 horas' : 'Link expires in 24 hours'}</div>
            <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Revisa también tu carpeta de spam' : 'Also check your spam folder'}</div>
            <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Puedes reenviar el enlace si no llega' : 'You can resend the link if needed'}</div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-card">
            <div className="auth-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <Mail size={24} />
            </div>
            <h1>{es ? 'Revisa tu correo' : 'Check your email'}</h1>
            <p className="auth-sub">
              {es
                ? <span>Enviamos un enlace de verificación a <strong>{email}</strong>. Haz clic en el enlace para activar tu cuenta.</span>
                : <span>We sent a verification link to <strong>{email}</strong>. Click the link to activate your account.</span>}
            </p>

            <div style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 20,
              background: 'rgba(34,197,94,0.07)', border: '1.5px solid rgba(34,197,94,0.25)',
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: '0.83rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                {es
                  ? 'El enlace es válido por 24 horas. Revisa también tu carpeta de spam o correo no deseado.'
                  : 'The link is valid for 24 hours. Also check your spam or junk mail folder.'}
              </p>
            </div>

            {resendMsg && (
              <div
                className={resendMsg.startsWith('✅') ? 'auth-success' : 'auth-error'}
                style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}
              >
                {resendMsg}
              </div>
            )}

            <button
              className="btn btn-ghost btn-full"
              onClick={handleResend}
              disabled={resending}
              style={{ marginBottom: 12 }}
            >
              {resending ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
              {' '}{es ? 'Reenviar correo de verificación' : 'Resend verification email'}
            </button>

            <p className="auth-footer">
              {es ? '¿Ya verificaste?' : 'Already verified?'}{' '}
              <Link to="/login">{es ? 'Inicia sesión' : 'Log in'}</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario de registro ──
  return (
    <div className="auth-page">
      <div className="auth-panel">
        <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
        <h2 className="auth-panel-title">
          {es ? 'Únete a la' : 'Join the'}<br />
          <span>{es ? 'mejor tienda' : 'best store'}</span>
        </h2>
        <p className="auth-panel-sub">
          {es
            ? 'Crea tu cuenta gratis y empieza a comprar skins, emotes y picos con KidCoins al instante.'
            : 'Create your free account and start buying skins, emotes and pickaxes with KidCoins instantly.'}
        </p>
        <div className="auth-panel-features">
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Registro gratis, sin tarjeta de crédito' : 'Free registration, no credit card required'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Recarga con Yape, Plin, BCP y más' : 'Recharge with Yape, Plin, BCP and more'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Items entregados directo a tu cuenta' : 'Items delivered directly to your account'}</div>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon"><UserPlus size={24} /></div>
          <h1>{t('auth.register.title')}</h1>
          <p className="auth-sub">{t('auth.register.sub')}</p>

          {error && <div className="auth-error"><AlertCircle size={15} />{error}</div>}

          <label className="field">
            <span><Gamepad2 size={11} style={{ display: 'inline', marginRight: 4 }} />{t('auth.register.epic')}</span>
            <input type="text" placeholder={t('auth.register.epic.ph')} value={epicUsername} onChange={e => setEpicUsername(e.target.value)} required autoFocus />
          </label>

          <label className="field">
            <span><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />{t('auth.register.email')}</span>
            <input type="email" placeholder={t('auth.register.email.ph')} value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label className="field">
            <span><Lock size={11} style={{ display: 'inline', marginRight: 4 }} />{t('auth.register.pass')}</span>
            <input type="password" placeholder={t('auth.register.pass.ph')} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </label>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <><UserPlus size={16} /> {t('auth.register.btn')}</>}
          </button>

          <p className="auth-footer">
            {t('auth.register.footer')} <Link to="/login">{t('auth.register.footer.link')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
