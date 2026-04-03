import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { login } from '../services/api';
import { LogIn, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const es = lang === 'es';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await login(email.trim(), password);
      setAuth(res.token, res.customer);
      navigate('/dashboard');
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
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Pago con Yape, Plin, PayPal y más' : 'Pay with Yape, Plin, PayPal and more'}</div>
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
