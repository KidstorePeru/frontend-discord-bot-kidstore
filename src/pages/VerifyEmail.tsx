import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { verifyEmail } from '../services/api';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { setAuth }    = useAuth();
  const { lang }       = useLang();
  const navigate       = useNavigate();
  const es             = lang === 'es';
  const called         = useRef(false); // evita doble ejecución en React Strict Mode

  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage(es ? 'Token de verificación no encontrado.' : 'Verification token not found.');
      return;
    }

    verifyEmail(token)
      .then(res => {
        setAuth(res.token, res.customer);
        setStatus('success');
        setMessage(es
          ? '¡Tu cuenta ha sido verificada correctamente!'
          : 'Your account has been verified successfully!');
        setTimeout(() => navigate('/store'), 2500);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || (es ? 'Token inválido o expirado.' : 'Invalid or expired token.'));
      });
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
        <h2 className="auth-panel-title">
          {es ? 'Verificación' : 'Verification'}<br />
          <span>{es ? 'de cuenta' : 'of account'}</span>
        </h2>
        <p className="auth-panel-sub">
          {es
            ? 'Estamos verificando tu correo electrónico para activar tu cuenta.'
            : 'We are verifying your email address to activate your account.'}
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          {status === 'loading' && (
            <>
              <div className="auth-icon"><Loader2 size={24} className="spin" /></div>
              <h1>{es ? 'Verificando...' : 'Verifying...'}</h1>
              <p className="auth-sub">{es ? 'Por favor espera un momento.' : 'Please wait a moment.'}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="auth-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                <CheckCircle2 size={24} />
              </div>
              <h1>{es ? '¡Cuenta verificada!' : 'Account verified!'}</h1>
              <p className="auth-sub">{message}</p>
              <p className="auth-sub" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {es ? 'Redirigiendo a la tienda...' : 'Redirecting to the store...'}
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="auth-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                <XCircle size={24} />
              </div>
              <h1>{es ? 'Error de verificación' : 'Verification error'}</h1>
              <p className="auth-sub">{message}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                <Link to="/register" className="btn btn-primary btn-full">
                  <Mail size={16} /> {es ? 'Registrarse de nuevo' : 'Register again'}
                </Link>
                <Link to="/login" className="btn btn-ghost btn-full">
                  {es ? 'Ir al login' : 'Go to login'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
