import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Refunds() {
  const { lang } = useLang();
  const es = lang === 'es';
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>
        <div className="legal-header">
          <div className="legal-icon" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b',borderColor:'rgba(245,158,11,0.2)'}}><RefreshCw size={28}/></div>
          <div>
            <h1>{es ? 'Política de Reembolsos' : 'Refund Policy'}</h1>
            <p className="legal-updated">{es ? 'Última actualización: 27 de febrero de 2026' : 'Last updated: February 27, 2026'}</p>
          </div>
        </div>
        {es ? (<div className="legal-body"><div className="legal-highlight legal-highlight-warning"><strong>Importante:</strong> Al comprar en KidStorePeru, aceptas esta política.</div>
            <h2>1. Todas las compras son finales</h2>
            <p>Debido a la naturaleza digital de los productos, <strong>todas las compras son finales</strong>. No realizamos reembolsos al método de pago original.</p>
            <h2>2. Reembolsos en crédito</h2>
            <p>Si corresponde un reembolso, se realizará <strong>exclusivamente como KidCoins</strong> para usar en KidStorePeru. El crédito no es canjeable por dinero.</p>
            <h2>3. Cuándo puede corresponder un reembolso en crédito</h2>
            <ul><li><strong>No entrega:</strong> No se pudo completar por causas atribuibles a KidStorePeru</li><li><strong>Error de producto:</strong> Se entregó un ítem distinto al comprado</li><li><strong>Duplicación de cobro:</strong> Cargo duplicado por el mismo pedido</li><li><strong>Cancelación previa:</strong> El pedido aún no fue procesado</li></ul>
            <h2>4. Casos en que NO corresponde reembolso</h2>
            <ul><li>El pedido figura como entregado dentro del juego</li><li>Se proporcionaron datos incorrectos y la entrega ya se efectuó</li><li>Restricciones o sanciones impuestas por Epic Games</li><li>Arrepentimiento o cambio de opinión una vez procesado</li></ul>
            <h2>5. Cómo solicitar un reembolso</h2>
            <ol><li>Contáctanos por nuestros <Link to="/contact" className="legal-link">canales de soporte</Link></li><li>Incluye: número de pedido, email, descripción del problema y capturas</li></ol></div>) : (<div className="legal-body"><div className="legal-highlight legal-highlight-warning"><strong>Important:</strong> By purchasing at KidStorePeru, you accept this policy.</div>
            <h2>1. All purchases are final</h2>
            <p>Due to the digital nature of the products, <strong>all purchases are final</strong>. We do not issue refunds to the original payment method.</p>
            <h2>2. Credit refunds</h2>
            <p>If a refund is warranted, it will be issued <strong>exclusively as KidCoins</strong> to use at KidStorePeru. Credit is not redeemable for cash.</p>
            <h2>3. When a credit refund may apply</h2>
            <ul><li><strong>Non-delivery:</strong> Delivery could not be completed due to KidStorePeru's fault</li><li><strong>Wrong product:</strong> A different item was delivered</li><li><strong>Duplicate charge:</strong> Duplicate charge for the same order</li><li><strong>Pre-processing cancellation:</strong> Order has not yet been processed</li></ul>
            <h2>4. Cases where NO refund applies</h2>
            <ul><li>The order shows as delivered in-game</li><li>Incorrect data was provided and delivery was completed</li><li>Restrictions or bans imposed by Epic Games</li><li>Change of mind once the order is processed</li></ul>
            <h2>5. How to request a refund</h2>
            <ol><li>Contact us through our <Link to="/contact" className="legal-link">support channels</Link></li><li>Include: order number, email, problem description, and screenshots</li></ol></div>)}
      </div>
    </div>
  );
}
