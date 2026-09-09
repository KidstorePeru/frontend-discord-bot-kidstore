import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { login, verify2FA } from '../services/api';
import { LogIn, Loader2, Mail, Lock, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import OAuthButtons from '../components/OAuthButtons';

const OAUTH_ERROR_MESSAGES: Record<string, { es: string; en: string }> = {
  invalid_state:      { es: 'La sesión de inicio expiró, intenta de nuevo.', en: 'The login session expired, please try again.' },
  exchange_failed:    { es: 'No se pudo verificar tu cuenta. Intenta de nuevo.', en: "We couldn't verify your account. Please try again." },
  user_fetch_failed:  { es: 'No se pudo obtener tu perfil. Intenta de nuevo.', en: "We couldn't fetch your profile. Please try again." },
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const es = lang === 'es';

  // Paso 2 (solo cuentas admin con 2FA activado): ya se validó la
  // contraseña, falta el código de la app autenticadora (o un código de
  // respaldo) antes de recibir un token real.
  const [tempToken, setTempToken] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const oauthError = params.get('oauth_error');
    if (oauthError) {
      const msg = OAUTH_ERROR_MESSAGES[oauthError];
      setError(msg ? (es ? msg.es : msg.en) : (es ? 'Error al iniciar sesión. Intenta de nuevo.' : 'Login error. Please try again.'));
      window.history.replaceState({}, '', '/login');
      return;
    }
    // Llegó desde AuthCallback tras un login por Google/Discord en una
    // cuenta admin con 2FA activado — falta el mismo segundo paso que en
    // el login por contraseña. Viaja por el state de la navegación (no por
    // la URL) desde que AuthCallback canjea el código de un solo uso.
    const oauthTempToken = (location.state as { tempToken?: string } | null)?.tempToken;
    if (oauthTempToken) {
      setTempToken(oauthTempToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.requires2FA) {
        setTempToken(res.tempToken);
      } else {
        setAuth(res.token, res.customer);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'EMAIL_NOT_VERIFIED') {
        setError(es
          ? '📧 Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
          : '📧 You must verify your email before logging in. Check your inbox.');
      } else {
        setError(err instanceof Error ? err.message : t('auth.error.login'));
      }
    } finally { setLoading(false); }
  }

  async function handleVerify2FA(e: FormEvent) {
    e.preventDefault(); setError(''); setVerifying(true);
    try {
      const res = await verify2FA(tempToken, twoFACode.trim());
      setAuth(res.token, res.customer);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (es ? 'Código incorrecto' : 'Incorrect code'));
    } finally { setVerifying(false); }
  }

  if (tempToken) {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
          <h2 className="auth-panel-title">
            {es ? 'Verificación en' : 'Two-factor'}<br />
            <span>{es ? 'dos pasos' : 'verification'}</span>
          </h2>
          <p className="auth-panel-sub">
            {es
              ? 'Esta cuenta tiene un segundo factor activado para protegerla mejor.'
              : 'This account has a second factor enabled for extra protection.'}
          </p>
        </div>
        <div className="auth-right">
          <form className="auth-card" onSubmit={handleVerify2FA}>
            <div className="auth-icon"><ShieldCheck size={24} /></div>
            <h1>{es ? 'Código de verificación' : 'Verification code'}</h1>
            <p className="auth-sub">
              {es ? 'Ingresa el código de 6 dígitos de tu app autenticadora, o un código de respaldo.' : 'Enter the 6-digit code from your authenticator app, or a backup code.'}
            </p>

            {error && <div className="auth-error"><AlertCircle size={15} />{error}</div>}

            <label className="field">
              <span>{es ? 'Código' : 'Code'}</span>
              <input
                type="text"
                inputMode="text"
                placeholder="123456"
                value={twoFACode}
                onChange={e => setTwoFACode(e.target.value)}
                required
                autoFocus
                maxLength={9}
              />
            </label>

            <button className="btn btn-primary btn-full" type="submit" disabled={verifying}>
              {verifying ? <Loader2 className="spin" size={18} /> : <><ShieldCheck size={16} /> {es ? 'Verificar' : 'Verify'}</>}
            </button>

            <p className="auth-footer">
              <a href="#" onClick={e => { e.preventDefault(); setTempToken(''); setTwoFACode(''); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft size={13} /> {es ? 'Volver' : 'Back'}
              </a>
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Panel izquierdo decorativo */}
      <div className="auth-panel">
        <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
        <h2 className="auth-panel-title">
          {es ? 'Tu tienda de' : 'Your favorite'}<br />
          <span>{es ? 'Fortnite favorita' : 'Fortnite store'}</span>
        </h2>
        <p className="auth-panel-sub">
          {es
            ? 'Inicia sesión para acceder a tu balance de KidCoins y comprar items directo desde la tienda oficial.'
            : 'Log in to access your KidCoins balance and buy items directly from the official store.'}
        </p>
        <div className="auth-panel-features">
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? '+200 items disponibles a diario' : '+200 items available daily'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Entrega automática en menos de 48h' : 'Automatic delivery in less than 48h'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Pago con Yape, Plin, MercadoPago y más' : 'Pay with Yape, Plin, MercadoPago and more'}</div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon"><LogIn size={24} /></div>
          <h1>{t('auth.login.title')}</h1>
          <p className="auth-sub">{t('auth.login.sub')}</p>

          {error && (
            <div className="auth-error"><AlertCircle size={15} />{error}</div>
          )}

          <OAuthButtons />
          <div className="oauth-divider"><span>{es ? 'o continúa con tu correo' : 'or continue with email'}</span></div>

          <label className="field">
            <span><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />{t('auth.register.email')}</span>
            <input type="email" placeholder={t('auth.register.email.ph')} value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </label>

          <label className="field">
            <span><Lock size={11} style={{ display: 'inline', marginRight: 4 }} />{t('auth.register.pass')}</span>
            <input type="password" placeholder={t('auth.register.pass.ph')} value={password} onChange={e => setPassword(e.target.value)} required />
          </label>

          <div style={{ textAlign: 'right', marginTop: '-6px', marginBottom: '18px' }}>
            <Link to="/reset-password" style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              {es ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
            </Link>
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <><LogIn size={16} /> {t('auth.login.btn')}</>}
          </button>

          <p className="auth-footer">
            {t('auth.login.footer')} <Link to="/register">{t('auth.login.footer.link')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
