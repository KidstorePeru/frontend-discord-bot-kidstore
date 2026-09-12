import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { exchangeOAuthCode } from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';

/** Destino del redirect que hace el backend tras un login exitoso con
 *  Google/Discord (cuenta ya existente o recien vinculada). Recibe un
 *  código de un solo uso por query (nunca el token real — ver punto 22 del
 *  audit) y lo canjea por los tokens reales vía POST /auth/exchange, con
 *  los tokens viajando en el cuerpo de la respuesta, no en la URL. */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { lang } = useLang();
  const es = lang === 'es';
  useSEO({ title: es ? 'Conectando cuenta' : 'Connecting account', noindex: true });
  const [error, setError] = useState(false);

  useEffect(() => {
    const code = params.get('code');
    if (!code) { setError(true); return; }

    exchangeOAuthCode(code).then(result => {
      if (result.requires2FA) {
        // Cuenta admin con 2FA activado: el backend no entregó un token
        // real, solo uno temporal — se manda a /login para completar con
        // el código, el mismo paso 2 que usa el login por contraseña. Se
        // pasa por el state de la navegación, no por la URL.
        navigate('/login', { replace: true, state: { tempToken: result.tempToken } });
        return;
      }
      localStorage.setItem('kc_token', result.token);
      if (result.refreshToken) localStorage.setItem('kc_refresh_token', result.refreshToken);
      return refresh().then(() => navigate('/dashboard', { replace: true }));
    }).catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-right" style={{ gridColumn: '1 / -1' }}>
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
            <h1>{es ? 'Error al iniciar sesión' : 'Login error'}</h1>
            <p className="auth-sub">
              {es ? 'No pudimos completar el inicio de sesión. Intenta de nuevo.' : "We couldn't complete the login. Please try again."}
            </p>
            <Link to="/login" className="btn btn-primary btn-full">{es ? 'Volver a iniciar sesión' : 'Back to login'}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-right" style={{ gridColumn: '1 / -1' }}>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <Loader2 className="spin" size={32} style={{ color: 'var(--accent)' }} />
          <p className="auth-sub" style={{ marginTop: 16, marginBottom: 0 }}>
            {es ? 'Iniciando sesión...' : 'Signing you in...'}
          </p>
        </div>
      </div>
    </div>
  );
}
