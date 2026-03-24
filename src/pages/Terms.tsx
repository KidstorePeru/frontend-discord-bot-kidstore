import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Terms() {
  const { lang } = useLang();
  const es = lang === 'es';
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>
        <div className="legal-header">
          <div className="legal-icon"><FileText size={28}/></div>
          <div>
            <h1>{es ? 'Términos y Condiciones' : 'Terms and Conditions'}</h1>
            <p className="legal-updated">{es ? 'Última actualización: 27 de febrero de 2026' : 'Last updated: February 27, 2026'}</p>
          </div>
        </div>
        {es ? (<div className="legal-body"><p>Estos Términos y Condiciones regulan el uso del sitio web KidStorePeru y la compra de productos digitales ofrecidos. Al acceder, navegar o comprar, aceptas estos Términos.</p>
            <h2>1. Qué ofrecemos</h2>
            <p>KidStorePeru es una web dedicada a la venta de ítems digitales de Fortnite (skins, packs y cosméticos) y recargas de KidCoins, entregadas dentro del juego mediante la función de regalo (gifting) desde cuentas operativas.</p>
            <h2>2. No afiliación con Epic Games</h2>
            <p>KidStorePeru no está afiliado, patrocinado ni aprobado por Epic Games, Inc. Fortnite y todas las marcas relacionadas son propiedad de Epic Games, Inc. Las referencias se usan solo con fines descriptivos.</p>
            <h2>3. Requisitos del cliente</h2>
            <ul><li>Proporcionar tu Epic Display Name correcto</li><li>Tener tu cuenta habilitada para recibir regalos</li><li>Cumplir los requisitos del juego para recibir regalos</li></ul>
            <h2>4. Proceso de compra</h2>
            <ol><li>Seleccionas el producto o paquete KC</li><li>Ingresas tus datos para entrega</li><li>Realizas el pago por el método elegido</li><li>Procesamos y gestionamos la entrega dentro del juego</li></ol>
            <h2>5. Entrega y contingencias</h2>
            <p>Los tiempos son estimados y pueden variar. La entrega se considera completada cuando el ítem figura entregado dentro del juego. Si no puede completarse por causas ajenas a KidStorePeru, ofrecemos reintentos, cambios o crédito.</p>
            <h2>6. Reembolsos</h2>
            <p>Por la naturaleza digital e inmediata de los productos, no hay reembolsos una vez completada la entrega. Ver nuestra <Link to="/refunds" className="legal-link">Política de Reembolsos</Link>.</p>
            <h2>7. Contacto</h2>
            <p>Para consultas, contáctanos por nuestros <Link to="/contact" className="legal-link">canales de soporte</Link>.</p></div>) : (<div className="legal-body"><p>These Terms and Conditions govern the use of the KidStorePeru website and the purchase of digital products offered. By accessing, browsing, or purchasing, you accept these Terms.</p>
            <h2>1. What we offer</h2>
            <p>KidStorePeru sells digital Fortnite items (skins, packs, cosmetics) and KidCoins recharges, delivered in-game via the gifting feature from operational accounts.</p>
            <h2>2. No affiliation with Epic Games</h2>
            <p>KidStorePeru is not affiliated with, sponsored by, or endorsed by Epic Games, Inc. Fortnite and all related marks are property of Epic Games, Inc. References are used for descriptive purposes only.</p>
            <h2>3. Customer requirements</h2>
            <ul><li>Provide your correct Epic Display Name</li><li>Have your account enabled to receive gifts</li><li>Meet the game requirements to receive gifts</li></ul>
            <h2>4. Purchase process</h2>
            <ol><li>Select the product or KC package</li><li>Enter your delivery details</li><li>Complete payment via your chosen method</li><li>We process and manage in-game delivery</li></ol>
            <h2>5. Delivery and contingencies</h2>
            <p>Delivery times are estimates and may vary. Delivery is considered complete when the item appears delivered in-game. If delivery cannot be completed due to causes outside KidStorePeru, we offer retries, exchanges, or credit.</p>
            <h2>6. Refunds</h2>
            <p>Due to the immediate digital nature of products, no refunds are issued once delivery is complete. See our <Link to="/refunds" className="legal-link">Refund Policy</Link>.</p>
            <h2>7. Contact</h2>
            <p>For inquiries, contact us through our <Link to="/contact" className="legal-link">support channels</Link>.</p></div>)}
      </div>
    </div>
  );
}
