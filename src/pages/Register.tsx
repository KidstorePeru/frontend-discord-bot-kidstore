import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { register } from '../services/api';
import { UserPlus, Loader2, Gamepad2, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Register() {
  const [epicUsername, setEpicUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const { t, lang } = useLang();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await register(epicUsername.trim(), email.trim(), password);
      setAuth(res.token, res.customer);
      // Auto-assign random default avatar on register
      const DEFAULT_AVATARS = ['/avatars/avatar1.svg','/avatars/avatar2.svg','/avatars/avatar3.svg','/avatars/avatar4.svg','/avatars/avatar5.svg','/avatars/avatar6.svg','/avatars/avatar7.svg','/avatars/avatar8.svg'];
      const idx = res.customer.id % DEFAULT_AVATARS.length;
      if (!localStorage.getItem(`kc_avatar_${res.customer.id}`)) {
        localStorage.setItem(`kc_avatar_${res.customer.id}`, DEFAULT_AVATARS[idx]);
      }
      navigate('/store');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.error.register'));
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      {/* Panel izquierdo decorativo */}
      <div className="auth-panel">
        <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
        <h2 className="auth-panel-title">
          {lang === 'es' ? 'Únete a la' : 'Join the'}<br />
          <span>{lang === 'es' ? 'mejor tienda' : 'best store'}</span>
        </h2>
        <p className="auth-panel-sub">
          {lang === 'es' ? 'Crea tu cuenta gratis y empieza a comprar skins, emotes y picos con KidCoins al instante.' : 'Create your free account and start buying skins, emotes and pickaxes with KidCoins instantly.'}
        </p>
        <div className="auth-panel-features">
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{lang === 'es' ? 'Registro gratis, sin tarjeta de crédito' : 'Free registration, no credit card required'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{lang === 'es' ? 'Recarga con Yape, Plin, BCP y más' : 'Recharge with Yape, Plin, BCP and more'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{lang === 'es' ? 'Items entregados directo a tu cuenta' : 'Items delivered directly to your account'}</div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon"><UserPlus size={24} /></div>
          <h1>{t('auth.register.title')}</h1>
          <p className="auth-sub">{t('auth.register.sub')}</p>

          {error && (
            <div className="auth-error"><AlertCircle size={15} />{error}</div>
          )}

          <label className="field">
            <span><Gamepad2 size={11} style={{display:'inline',marginRight:4}} />{t('auth.register.epic')}</span>
            <input type="text" placeholder={t('auth.register.epic.ph')} value={epicUsername} onChange={e => setEpicUsername(e.target.value)} required autoFocus />
          </label>

          <label className="field">
            <span><Mail size={11} style={{display:'inline',marginRight:4}} />{t('auth.register.email')}</span>
            <input type="email" placeholder={t('auth.register.email.ph')} value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label className="field">
            <span><Lock size={11} style={{display:'inline',marginRight:4}} />{t('auth.register.pass')}</span>
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
