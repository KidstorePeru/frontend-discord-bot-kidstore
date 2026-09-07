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
            <p className="legal-updated">{es ? 'Última actualización: 5 de setiembre de 2026' : 'Last updated: September 5, 2026'}</p>
          </div>
        </div>
        {es ? (<div className="legal-body"><p>Estos Términos y Condiciones regulan el uso del sitio web KidStorePeru y la compra de productos digitales ofrecidos. Al acceder, navegar o comprar, aceptas estos Términos.</p>
            <h2>1. Qué ofrecemos</h2>
            <p>KidStorePeru es una web dedicada a la venta de ítems digitales de Fortnite (skins, packs y cosméticos) y recargas de KidCoins, entregadas dentro del juego mediante la función de regalo (gifting) desde cuentas operativas.</p>
            <h2>2. No afiliación con Epic Games</h2>
            <p>KidStorePeru no está afiliado, patrocinado ni aprobado por Epic Games, Inc. Fortnite y todas las marcas relacionadas son propiedad de Epic Games, Inc. Las referencias se usan solo con fines descriptivos.</p>
            <h2>3. Requisitos del cliente</h2>
            <ul><li>Proporcionar tu Epic Display Name correcto</li><li>Tener tu cuenta habilitada para recibir regalos</li><li>Cumplir los requisitos del juego para recibir regalos</li></ul>
            <h2>4. Métodos de pago</h2>
            <p>KidStorePeru ofrece dos formas de recargar KidCoins:</p>
            <ul>
              <li><strong>Pasarelas automáticas (al instante):</strong> MercadoPago (Perú — tarjetas de crédito/débito y Yape); y en el resto del mundo, dLocal Go (tarjetas internacionales como Visa, Mastercard, Diners y American Express, y métodos de pago locales según tu país), PayPal y criptomonedas. Tus KidCoins se acreditan apenas la pasarela confirma el pago.</li>
              <li><strong>Métodos manuales (con periodo de espera):</strong> en Perú, Yape, Plin y transferencia bancaria (BCP, Interbank, BBVA); en España, Bizum. Con estos métodos verificamos manualmente que tu pago haya llegado antes de liberar tus KidCoins — la entrega no es inmediata.</li>
            </ul>
            <h2>5. Productos disponibles</h2>
            <p>KidStorePeru vende KidCoins (KC), la moneda interna del sitio. Con tus KC compras ítems de la Tienda de Fortnite (skins, packs y cosméticos) directamente desde tu cuenta — no se venden ítems de Fortnite por separado con dinero real.</p>
            <h2>6. Proceso de compra</h2>
            <ol><li>Recargas KidCoins eligiendo una pasarela automática o un método manual</li><li>Si usas una pasarela automática, tus KC se acreditan al instante al confirmarse el pago</li><li>Si usas un método manual, esperas a que verifiquemos tu pago antes de que se acrediten tus KC</li><li>Seleccionas el ítem de la Tienda que deseas comprar con tus KC</li><li>Ingresas tu usuario de Epic Games para la entrega</li><li>Procesamos y gestionamos la entrega dentro del juego</li></ol>
            <h2>7. Notificaciones</h2>
            <p>Recibirás notificaciones por correo electrónico cuando tu pago sea aprobado y cuando tu pedido sea entregado.</p>
            <h2>8. Entrega y contingencias</h2>
            <p>Los tiempos son estimados y pueden variar. La entrega se considera completada cuando el ítem figura entregado dentro del juego. Si no puede completarse por causas ajenas a KidStorePeru, ofrecemos reintentos, cambios o crédito.</p>
            <h2>9. Reembolsos</h2>
            <p>Por la naturaleza digital e inmediata de los productos, no hay reembolsos una vez completada la entrega. Los pagos realizados por MercadoPago o dLocal Go pueden ser disputados directamente a través de la pasarela correspondiente. Los pagos manuales no son reembolsables una vez acreditados los KC. Ver nuestra <Link to="/refunds" className="legal-link">Política de Reembolsos</Link>.</p>
            <h2>10. Contacto</h2>
            <p>Para consultas, contáctanos por nuestros <Link to="/contact" className="legal-link">canales de soporte</Link>.</p></div>) : (<div className="legal-body"><p>These Terms and Conditions govern the use of the KidStorePeru website and the purchase of digital products offered. By accessing, browsing, or purchasing, you accept these Terms.</p>
            <h2>1. What we offer</h2>
            <p>KidStorePeru sells digital Fortnite items (skins, packs, cosmetics) and KidCoins recharges, delivered in-game via the gifting feature from operational accounts.</p>
            <h2>2. No affiliation with Epic Games</h2>
            <p>KidStorePeru is not affiliated with, sponsored by, or endorsed by Epic Games, Inc. Fortnite and all related marks are property of Epic Games, Inc. References are used for descriptive purposes only.</p>
            <h2>3. Customer requirements</h2>
            <ul><li>Provide your correct Epic Display Name</li><li>Have your account enabled to receive gifts</li><li>Meet the game requirements to receive gifts</li></ul>
            <h2>4. Payment methods</h2>
            <p>KidStorePeru offers two ways to recharge KidCoins:</p>
            <ul>
              <li><strong>Automatic gateways (instant):</strong> MercadoPago (Peru — credit/debit cards and Yape); and elsewhere, dLocal Go (international cards such as Visa, Mastercard, Diners, and American Express, plus local payment methods depending on your country), PayPal, and cryptocurrency. Your KidCoins are credited as soon as the gateway confirms payment.</li>
              <li><strong>Manual methods (with a waiting period):</strong> in Peru, Yape, Plin, and bank transfer (BCP, Interbank, BBVA); in Spain, Bizum. With these methods we manually verify your payment arrived before releasing your KidCoins — delivery is not immediate.</li>
            </ul>
            <h2>5. Available products</h2>
            <p>KidStorePeru sells KidCoins (KC), the site's internal currency. You use your KC to buy items from the Fortnite Store (skins, packs, and cosmetics) directly from your account — Fortnite items are not sold separately for real money.</p>
            <h2>6. Purchase process</h2>
            <ol><li>Recharge KidCoins by choosing an automatic gateway or a manual method</li><li>If using an automatic gateway, your KC are credited instantly once payment is confirmed</li><li>If using a manual method, you wait while we verify your payment before your KC are credited</li><li>Select the Store item you want to buy with your KC</li><li>Enter your Epic Games username for delivery</li><li>We process and manage in-game delivery</li></ol>
            <h2>7. Notifications</h2>
            <p>You will receive email notifications when your payment is approved and when your order is delivered.</p>
            <h2>8. Delivery and contingencies</h2>
            <p>Delivery times are estimates and may vary. Delivery is considered complete when the item appears delivered in-game. If delivery cannot be completed due to causes outside KidStorePeru, we offer retries, exchanges, or credit.</p>
            <h2>9. Refunds</h2>
            <p>Due to the immediate digital nature of products, no refunds are issued once delivery is complete. Payments made via MercadoPago or dLocal Go can be disputed directly through the corresponding gateway. Manual payments are non-refundable once KC are credited. See our <Link to="/refunds" className="legal-link">Refund Policy</Link>.</p>
            <h2>10. Contact</h2>
            <p>For inquiries, contact us through our <Link to="/contact" className="legal-link">support channels</Link>.</p></div>)}
      </div>
    </div>
  );
}
