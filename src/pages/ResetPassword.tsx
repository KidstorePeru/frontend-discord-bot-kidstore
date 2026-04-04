import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { forgotPassword, resetPassword } from '../services/api';
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2, Mail, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [params]  = useSearchParams();
  const token     = params.get('token') || '';
  const navigate  = useNavigate();
  const { lang }  = useLang();
  const es        = lang === 'es';

  // Estado para cuando ya tenemos token (pantalla de nueva contraseña)
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [show,      setShow]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);

  // Estado para cuando NO tenemos token (pantalla de solicitar enlace)
  const [reqEmail,  setReqEmail]  = useState('');
  const [reqLoading,setReqLoading]= useState(false);
  const [reqError,  setReqError]  = useState('');
  const [reqSent,   setReqSent]   = useState(false);

  // ── Pantalla: solicitar enlace (sin token) ──
  if (!token) {
    if (reqSent) {
      return (
        <div className="auth-page">
          <div className="auth-panel">
            <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
            <h2 className="auth-panel-title">
              {es ? 'Revisa tu' : 'Check your'}<br />
              <span>{es ? 'correo' : 'email'}</span>
            </h2>
            <p className="auth-panel-sub">
              {es
                ? 'Te enviamos un enlace para restablecer tu contraseña. Expira en 10 minutos.'
                : 'We sent you a link to reset your password. It expires in 10 minutes.'}
            </p>
          </div>
          <div className="auth-right">
            <div className="auth-card">
              <div className="auth-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                <Mail size={24} />
              </div>
              <h1>{es ? '¡Enlace enviado!' : 'Link sent!'}</h1>
              <p className="auth-sub">
                {es
                  ? <span>Revisa tu correo <strong>{reqEmail}</strong> y haz clic en el enlace para restablecer tu contraseña.</span>
                  : <span>Check your email <strong>{reqEmail}</strong> and click the link to reset your password.</span>}
              </p>
              <div style={{
                padding: '14px 16px', borderRadius: 12, marginBottom: 20,
                background: 'rgba(245,158,11,0.07)', border: '1.5px solid rgba(245,158,11,0.25)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '0.83rem', lineHeight: 1.55, color: 'var(--text-secondary)' }}>
                  {es
                    ? '⏰ El enlace expira en 10 minutos. Revisa también tu carpeta de spam.'
                    : '⏰ The link expires in 10 minutes. Also check your spam folder.'}
                </p>
              </div>
              <Link to="/login" className="btn btn-primary btn-full" style={{ marginBottom: 0 }}>
                <ArrowLeft size={16} /> {es ? 'Volver al login' : 'Back to login'}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    async function handleRequestReset(e: FormEvent) {
      e.preventDefault(); setReqError(''); setReqLoading(true);
      try {
        await forgotPassword(reqEmail.trim(), lang);
        setReqSent(true);
      } catch {
        // Siempre mostramos éxito para no revelar si el email existe
        setReqSent(true);
      } finally { setReqLoading(false); }
    }

    return (
      <div className="auth-page">
        <div className="auth-panel">
          <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
          <h2 className="auth-panel-title">
            {es ? '¿Olvidaste tu' : 'Forgot your'}<br />
            <span>{es ? 'contraseña?' : 'password?'}</span>
          </h2>
          <p className="auth-panel-sub">
            {es
              ? 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.'
              : 'Enter your email address and we\'ll send you a link to reset your password.'}
          </p>
          <div className="auth-panel-features">
            <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'El enlace expira en 10 minutos' : 'Link expires in 10 minutes'}</div>
            <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Revisa también tu carpeta de spam' : 'Also check your spam folder'}</div>
            <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Tu cuenta permanece segura' : 'Your account stays secure'}</div>
          </div>
        </div>

        <div className="auth-right">
          <form className="auth-card" onSubmit={handleRequestReset}>
            <div className="auth-icon"><KeyRound size={24} /></div>
            <h1>{es ? 'Recuperar contraseña' : 'Reset password'}</h1>
            <p className="auth-sub">
              {es
                ? 'Ingresa el correo asociado a tu cuenta y te enviaremos las instrucciones.'
                : 'Enter the email associated with your account and we\'ll send you instructions.'}
            </p>

            {reqError && <div className="auth-error"><AlertCircle size={15} />{reqError}</div>}

            <label className="field">
              <span><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />
                {es ? 'Correo electrónico' : 'Email address'}
              </span>
              <input
                type="email"
                placeholder={es ? 'tu@correo.com' : 'your@email.com'}
                value={reqEmail}
                onChange={e => setReqEmail(e.target.value)}
                required autoFocus
              />
            </label>

            <button className="btn btn-primary btn-full" type="submit" disabled={reqLoading || !reqEmail}>
              {reqLoading
                ? <><Loader2 className="spin" size={18} /> {es ? 'Enviando...' : 'Sending...'}</>
                : <><Mail size={16} /> {es ? 'Enviar enlace de recuperación' : 'Send recovery link'}</>}
            </button>

            <p className="auth-footer">
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowLeft size={13} /> {es ? 'Volver al login' : 'Back to login'}
              </Link>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Pantalla: nueva contraseña (con token) ──
  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
          <h2 className="auth-panel-title">
            {es ? '¡Contraseña' : 'Password'}<br />
            <span>{es ? 'actualizada!' : 'updated!'}</span>
          </h2>
          <p className="auth-panel-sub">
            {es
              ? 'Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.'
              : 'Your password has been successfully reset. You can now log in.'}
          </p>
        </div>
        <div className="auth-right">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div className="auth-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', margin: '0 auto 20px' }}>
              <CheckCircle2 size={24} />
            </div>
            <h1>{es ? '¡Listo!' : 'Done!'}</h1>
            <p className="auth-sub" style={{ marginBottom: 24 }}>
              {es ? 'Tu contraseña fue actualizada correctamente. Redirigiendo al login...' : 'Your password was updated successfully. Redirecting to login...'}
            </p>
            <Link to="/login" className="btn btn-primary btn-full">
              {es ? 'Ir al login' : 'Go to login'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (password !== confirm) {
      setError(es ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (es ? 'Token inválido o expirado' : 'Invalid or expired token'));
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <img src="/logotipo.png" alt="KidStorePeru" className="auth-panel-logo" />
        <h2 className="auth-panel-title">
          {es ? 'Nueva' : 'New'}<br />
          <span>{es ? 'contraseña' : 'password'}</span>
        </h2>
        <p className="auth-panel-sub">
          {es
            ? 'Elige una contraseña segura de al menos 8 caracteres para proteger tu cuenta.'
            : 'Choose a secure password of at least 8 characters to protect your account.'}
        </p>
        <div className="auth-panel-features">
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'Usa letras, números y símbolos' : 'Use letters, numbers and symbols'}</div>
          <div className="auth-panel-feat"><div className="auth-panel-feat-dot" />{es ? 'No compartas tu contraseña' : 'Never share your password'}</div>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-icon"><KeyRound size={24} /></div>
          <h1>{es ? 'Nueva contraseña' : 'New password'}</h1>
          <p className="auth-sub">
            {es
              ? 'Elige una contraseña segura de al menos 8 caracteres.'
              : 'Choose a secure password of at least 8 characters.'}
          </p>

          {error && <div className="auth-error"><AlertCircle size={15} />{error}</div>}

          <label className="field">
            <span><KeyRound size={11} style={{ display: 'inline', marginRight: 4 }} />
              {es ? 'Nueva contraseña' : 'New password'}
            </span>
            <div className="pass-wrap">
              <input
                type={show ? 'text' : 'password'}
                placeholder={es ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required minLength={8} autoFocus
              />
              <button type="button" className="pass-eye" onClick={() => setShow(v => !v)}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="field">
            <span><KeyRound size={11} style={{ display: 'inline', marginRight: 4 }} />
              {es ? 'Confirmar contraseña' : 'Confirm password'}
            </span>
            <input
              type={show ? 'text' : 'password'}
              placeholder={es ? 'Repite la contraseña' : 'Repeat your password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required minLength={8}
            />
          </label>

          {password && confirm && password !== confirm && (
            <p style={{ margin: '-8px 0 8px', fontSize: '0.8rem', color: 'var(--red-500)' }}>
              {es ? '⚠️ Las contraseñas no coinciden' : '⚠️ Passwords do not match'}
            </p>
          )}

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading || !password || !confirm || password !== confirm}
          >
            {loading
              ? <><Loader2 className="spin" size={18} /> {es ? 'Actualizando...' : 'Updating...'}</>
              : <><CheckCircle2 size={16} /> {es ? 'Actualizar contraseña' : 'Update password'}</>}
          </button>

          <p className="auth-footer">
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={13} /> {es ? 'Volver al login' : 'Back to login'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
