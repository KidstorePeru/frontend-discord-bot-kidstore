import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Check, Loader2, Search, Trash2, Store } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useWishlist } from '../context/WishlistContext';
import { searchCosmetics, type CosmeticResult } from '../services/api';
import { useSEO } from '../hooks/useSEO';

const nf = new Intl.NumberFormat('es-PE');

function fmtDay(iso: string | undefined, es: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Día de tienda (la tienda cambia a las 00:00 UTC): se muestra en UTC para
  // que coincida con la fecha de la tienda, no con la hora de Lima del cambio.
  return d.toLocaleDateString(es ? 'es-PE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Lista de deseos («Avísame cuando vuelva»): buscar cualquier objeto que haya
// estado en la tienda y seguirlo; cuando vuelve llega un aviso a la campana,
// por correo y por Discord (según las preferencias del cliente).
export default function Wishlist() {
  const { lang } = useLang();
  const es = lang === 'es';
  const { items, limit, has, toggle, remove, reload } = useWishlist();

  useSEO({
    title: es ? 'Lista de deseos' : 'Wishlist',
    description: es ? 'Te avisamos cuando tus objetos favoritos vuelvan a la tienda de Fortnite.' : "We'll let you know when your favorite items are back in the Fortnite shop.",
    noindex: true,
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CosmeticResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'error' } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Búsqueda con pausa de 350 ms mientras se escribe; cada búsqueda nueva
  // cancela la anterior.
  useEffect(() => {
    const q = query.trim();
    abortRef.current?.abort();
    if (q.length < 2) { setResults(null); setSearching(false); setSearchError(false); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchCosmetics(q, ctrl.signal);
        if (!ctrl.signal.aborted) { setResults(res); setSearchError(false); }
      } catch {
        if (!ctrl.signal.aborted) { setResults(null); setSearchError(true); }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  const follow = async (r: CosmeticResult) => {
    const result = await toggle({ itemId: r.item_id, name: r.name, type: r.item_type, image: r.image });
    if (result === 'added') { setMessage({ text: es ? `Listo: te avisaremos cuando ${r.name} vuelva.` : `Done: we'll let you know when ${r.name} is back.`, type: 'ok' }); void reload(); }
    else if (result === 'removed') setMessage({ text: es ? `Ya no sigues ${r.name}.` : `You're no longer following ${r.name}.`, type: 'ok' });
    else if (result === 'full') setMessage({ text: es ? `Tu lista está llena (${limit} objetos). Quita alguno para agregar otro.` : `Your list is full (${limit} items). Remove one to add another.`, type: 'error' });
    else setMessage({ text: es ? 'No se pudo actualizar tu lista. Intenta de nuevo.' : "Couldn't update your list. Try again.", type: 'error' });
  };

  const onRemove = async (itemId: string, name: string) => {
    const ok = await remove(itemId);
    setMessage(ok
      ? { text: es ? `Quitaste ${name} de tu lista.` : `You removed ${name} from your list.`, type: 'ok' }
      : { text: es ? 'No se pudo quitar. Intenta de nuevo.' : "Couldn't remove it. Try again.", type: 'error' });
  };

  const count = items?.length ?? 0;

  return (
    <div className="wish-page">
      <header className="wish-header">
        <div className="wish-header-icon"><BellRing size={24} /></div>
        <div>
          <h1>{es ? 'Lista de deseos' : 'Wishlist'}</h1>
          <p>
            {es
              ? 'Sigue los objetos que quieres y te avisamos en la web, por correo y por Discord cuando vuelvan a la tienda.'
              : "Follow the items you want and we'll let you know on the site, by email, and on Discord when they're back in the shop."}
          </p>
        </div>
        <span className="wish-count">{count} / {limit}</span>
      </header>

      {message && (
        <div className={`wish-message ${message.type === 'error' ? 'is-error' : ''}`} role="status">{message.text}</div>
      )}

      <section className="wish-card">
        <h2><Search size={18} /> {es ? 'Buscar un objeto' : 'Find an item'}</h2>
        <div className="wish-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={es ? 'Skin, pico, gesto, planeador…' : 'Skin, pickaxe, emote, glider…'}
            aria-label={es ? 'Buscar un objeto de Fortnite' : 'Search for a Fortnite item'}
            maxLength={50}
          />
          {searching && <Loader2 size={16} className="spin" />}
        </div>
        <p className="wish-hint">
          {es
            ? 'Solo aparecen objetos que alguna vez estuvieron en la tienda. Lo exclusivo del Pase de Batalla o de eventos no vuelve.'
            : 'Only items that have been in the shop before show up. Battle Pass and event exclusives never come back.'}
        </p>

        {searchError && <p className="wish-empty">{es ? 'El buscador no está disponible ahora. Intenta en unos minutos.' : 'Search is unavailable right now. Try again in a few minutes.'}</p>}
        {results && results.length === 0 && !searching && (
          <p className="wish-empty">{es ? 'No encontramos objetos de la tienda con ese nombre.' : "We couldn't find shop items with that name."}</p>
        )}
        {results && results.length > 0 && (
          <ul className="wish-results">
            {results.map((r) => {
              const on = has(r.item_id);
              return (
                <li key={r.item_id} className="wish-result">
                  <img src={r.image} alt="" loading="lazy" className="wish-thumb" />
                  <div className="wish-info">
                    <strong>{r.name}</strong>
                    <span>{r.item_type}{r.last_seen ? ` · ${es ? 'Última vez' : 'Last seen'}: ${fmtDay(r.last_seen, es)}` : ''}</span>
                  </div>
                  <button type="button" className={`btn btn-sm ${on ? 'btn-ghost' : 'btn-primary'}`} onClick={() => void follow(r)} aria-pressed={on}>
                    {on ? <><Check size={14} /> {es ? 'Siguiendo' : 'Following'}</> : <><Bell size={14} /> {es ? 'Avísame' : 'Notify me'}</>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="wish-card">
        <h2><Bell size={18} /> {es ? 'Lo que sigues' : "What you're following"}</h2>
        {items === null ? (
          <div className="wish-empty"><Loader2 size={18} className="spin" /></div>
        ) : items.length === 0 ? (
          <p className="wish-empty">
            {es
              ? 'Tu lista está vacía. Busca un objeto arriba o pulsa la campana de cualquier tarjeta de la tienda.'
              : 'Your list is empty. Search for an item above or tap the bell on any shop card.'}
          </p>
        ) : (
          <ul className="wish-results">
            {items.map((it) => (
              <li key={it.item_id} className="wish-result">
                {it.image ? <img src={it.image} alt="" loading="lazy" className="wish-thumb" /> : <span className="wish-thumb wish-thumb--empty"><Bell size={18} /></span>}
                <div className="wish-info">
                  <strong>{it.name}</strong>
                  {it.in_shop ? (
                    <span className="wish-in-shop">
                      {es ? 'En la tienda hoy' : 'In the shop today'}
                      {it.price_kc != null ? ` · ${nf.format(it.price_kc)} KC` : ''}
                    </span>
                  ) : (
                    <span>{es ? 'Te avisaremos cuando vuelva' : "We'll let you know when it's back"}</span>
                  )}
                </div>
                {it.in_shop && (
                  <Link to="/store" className="btn btn-sm btn-primary"><Store size={14} /> {es ? 'Comprar' : 'Buy'}</Link>
                )}
                <button
                  type="button"
                  className="wish-remove"
                  onClick={() => void onRemove(it.item_id, it.name)}
                  aria-label={es ? `Quitar ${it.name} de la lista` : `Remove ${it.name} from the list`}
                  title={es ? 'Quitar' : 'Remove'}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="wish-hint">
          {es ? 'Elige cómo te avisamos en ' : 'Choose how we notify you in '}
          <Link to="/notifications">{es ? 'Notificaciones' : 'Notifications'}</Link>.
        </p>
      </section>
    </div>
  );
}
