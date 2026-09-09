import { Link } from 'react-router-dom';
import { Compass, Home, ShoppingBag } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';

export default function NotFound() {
  const { lang } = useLang();
  const es = lang === 'es';

  // noindex — antes esta página (y cualquier URL rota que cayera acá) se
  // indexaba con el título y la descripción de la portada, como si fuera
  // contenido real.
  useSEO({ title: es ? 'Página no encontrada' : 'Page not found', noindex: true });

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-icon"><Compass size={30} /></div>
        <span className="notfound-code">404</span>
        <h1>{es ? 'Página no encontrada' : 'Page not found'}</h1>
        <p>
          {es
            ? 'La página que buscas no existe o fue movida. Revisa el enlace o vuelve al inicio.'
            : "The page you're looking for doesn't exist or was moved. Check the link or head back home."}
        </p>
        <div className="notfound-actions">
          <Link to="/" className="btn btn-primary"><Home size={16} /> {es ? 'Ir al inicio' : 'Go home'}</Link>
          <Link to="/store" className="btn btn-ghost"><ShoppingBag size={16} /> {es ? 'Ir a la tienda' : 'Go to store'}</Link>
        </div>
      </div>
    </div>
  );
}
