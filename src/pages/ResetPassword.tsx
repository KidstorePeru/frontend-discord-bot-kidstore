import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [params]    = useSearchParams();
  const token       = params.get('token') || '';
  const navigate    = useNavigate();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [show,      setShow]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (!token) { setError('Token inválido. Solicita un nuevo enlace.'); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Token inválido o expirado');
    } finally { setLoading(false); }
  }

  if (!token) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-icon">⚠️</div>
        <h1>Enlace inválido</h1>
        <p className="auth-sub">Solicita un nuevo enlace desde la pantalla de login.</p>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      {done ? (
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={48} style={{ color: 'var(--green-500)', margin: '0 auto 16px' }} />
          <h1>¡Contraseña actualizada!</h1>
          <p className="auth-sub">Redirigiendo al login...</p>
        </div>
      ) : (
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon"><KeyRound size={28} /></div>
          <h1>Nueva contraseña</h1>
          <p className="auth-sub">Elige una contraseña segura de al menos 8 caracteres.</p>
          {error && <div className="auth-error">{error}</div>}
          <label className="field">
            <span>Nueva contraseña</span>
            <div className="pass-wrap">
              <input type={show ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus />
              <button type="button" className="pass-eye" onClick={() => setShow(v => !v)}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="field">
            <span>Confirmar contraseña</span>
            <input type={show ? 'text' : 'password'} placeholder="Repite la contraseña"
              value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
          </label>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading || !password || !confirm}>
            {loading ? <Loader2 className="spin" size={20} /> : 'Actualizar contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
