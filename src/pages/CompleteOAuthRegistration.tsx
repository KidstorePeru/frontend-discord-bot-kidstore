import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { getPendingOAuthRegistration, completeOAuthRegistration } from '../services/api';
import { Gamepad2, Loader2, AlertCircle, UserPlus } from 'lucide-react';

/** Destino del redirect que hace el backend cuando el login con Google/Discord
 *  corresponde a una cuenta nueva: pide el usuario Epic Games antes de crear
 *  la cuenta definitiva (la cuenta aun no existe en este punto). */
export default function CompleteOAuthRegistration() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { lang } = useLang();
  const es = lang === 'es';

  const [epicUsername, setEpicUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [provider, setProvider] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoadingInfo(false); return; }
    getPendingOAuthRegistration(token)
      .then(r => { setDisplayName(r.display_name || ''); setProvider(r.provider); })
      .catch(() => setInvalid(true))
      .finally(() => setLoadingInfo(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const res = await completeOAuthRegistration(token, epicUsername.trim());
      if (res.refresh_token) localStorage.setItem('kc_refresh_token', res.refresh_token);
      setAuth(res.token, res.customer);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (es ? 'Error al completar el registro' : 'Error completing registration'));
    } finally { setSubmitting(false); }
  }

  if (loadingInfo) {
    return (
      <div className="auth-page">
        <div className="auth-right" style={{ gridColumn: '1 / -1' }}>
          <Loader2 className="spin" size={32} style={{ color: 'var(--accent)' }} />
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="auth-page">
        <div className="auth-right" style={{ gridColumn: '1 / -1' }}>
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
            <h1>{es ? 'Enlace inválido' : 'Invalid link'}</h1>
            <p className="auth-sub">
              {es ? 'Este enlace expiró o ya fue usado. Intenta iniciar sesión de nuevo.' : 'This link expired or was already used. Please try signing in again.'}
            </p>
            <Link to="/login" className="btn btn-primary btn-full">{es ? 'Volver a iniciar sesión' : 'Back to login'}</Link>
          </div>
        </div>
      </div>
    );
  }

  const providerLabel = provider === 'google' ? 'Google' : provider === 'discord' ? 'Discord' : provider;

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
        <h2 className="auth-panel-title">
          {es ? 'Un último paso' : 'One last step'}<br />
          <span>{es ? 'para terminar' : 'to finish up'}</span>
        </h2>
        <p className="auth-panel-sub">
          {es
            ? `Ya iniciaste sesión con ${providerLabel}. Solo falta tu usuario de Epic Games para crear tu cuenta.`
            : `You've signed in with ${providerLabel}. We just need your Epic Games username to create your account.`}
        </p>
      </div>

      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon"><UserPlus size={24} /></div>
          <h1>{es ? 'Completa tu registro' : 'Complete your registration'}</h1>
          <p className="auth-sub">
            {displayName
              ? (es ? `¡Hola, ${displayName}! Elige tu usuario Epic Games para terminar.` : `Hi ${displayName}! Choose your Epic Games username to finish.`)
              : (es ? 'Elige tu usuario Epic Games para terminar.' : 'Choose your Epic Games username to finish.')}
          </p>

          {error && <div className="auth-error"><AlertCircle size={15} />{error}</div>}

          <label className="field">
            <span><Gamepad2 size={11} style={{ display: 'inline', marginRight: 4 }} />{es ? 'Usuario Epic Games' : 'Epic Games username'}</span>
            <input
              type="text"
              placeholder={es ? 'Ej: MiUsuarioEpic' : 'e.g. MyEpicUsername'}
              value={epicUsername}
              onChange={e => setEpicUsername(e.target.value)}
              required minLength={3} maxLength={50} autoFocus
            />
          </label>

          <button className="btn btn-primary btn-full" type="submit" disabled={submitting || epicUsername.trim().length < 3}>
            {submitting ? <Loader2 className="spin" size={18} /> : <><UserPlus size={16} /> {es ? 'Crear mi cuenta' : 'Create my account'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}
