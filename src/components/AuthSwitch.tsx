import { LogIn, UserPlus } from 'lucide-react';
import { useLang } from '../context/LangContext';
import SegTabs from './SegTabs';

/**
 * Control segmentado Ingresar / Crear cuenta que va arriba de la tarjeta de
 * autenticación. Navega entre /login y /register (ambas rutas están
 * pre-cargadas, así que el cambio es inmediato). Solo presentación.
 */
export default function AuthSwitch({ current }: { current: 'login' | 'register' }) {
  const { lang } = useLang();
  const es = lang === 'es';
  return (
    <SegTabs
      className="auth-switch"
      activeKey={current}
      ariaLabel={es ? 'Ingresar o crear cuenta' : 'Log in or sign up'}
      items={[
        { key: 'login',    to: '/login',    label: <><LogIn size={15} /> {es ? 'Ingresar' : 'Log in'}</> },
        { key: 'register', to: '/register', label: <><UserPlus size={15} /> {es ? 'Crear cuenta' : 'Sign up'}</> },
      ]}
    />
  );
}
