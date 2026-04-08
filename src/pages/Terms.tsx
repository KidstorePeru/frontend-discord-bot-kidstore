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
            <p className="legal-updated">{es ? 'Última actualización: 8 de abril de 2026' : 'Last updated: April 8, 2026'}</p>
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
            <p>KidStorePeru ofrece múltiples métodos de pago:</p>
            <ul>
              <li><strong>Pasarelas de pago (automáticas):</strong> MercadoPago (tarjetas de crédito/débito, Yape digital), PayPal (tarjetas internacionales) y NOWPayments (criptomonedas: BTC, ETH, USDT y más). Al pagar por pasarela, tus KidCoins o productos se acreditan automáticamente tras la confirmación del pago.</li>
              <li><strong>Métodos manuales:</strong> Yape, Plin, transferencia bancaria (BCP, Interbank, BBVA) y Bizum. Los pagos manuales requieren aprobación del administrador antes de acreditar los KC o procesar el pedido.</li>
            </ul>
            <h2>5. Productos disponibles</h2>
            <p>Además de KidCoins, puedes comprar productos directamente: V-Bucks, Packs de Fortnite, Club Fortnite y Rocket League Credits. Los pagos por pasarela procesan estos pedidos de forma automática.</p>
            <h2>6. Proceso de compra</h2>
            <ol><li>Seleccionas el producto o paquete KC</li><li>Ingresas tus datos para entrega</li><li>Realizas el pago por el método elegido (pasarela o manual)</li><li>Si usas pasarela, los KC se acreditan o el pedido se procesa automáticamente al confirmar el pago</li><li>Si usas método manual, un administrador verifica y aprueba tu pago</li><li>Procesamos y gestionamos la entrega dentro del juego</li></ol>
            <h2>7. Notificaciones</h2>
            <p>Recibirás notificaciones por correo electrónico cuando tu pago sea aprobado y cuando tu pedido sea entregado.</p>
            <h2>8. Entrega y contingencias</h2>
            <p>Los tiempos son estimados y pueden variar. La entrega se considera completada cuando el ítem figura entregado dentro del juego. Si no puede completarse por causas ajenas a KidStorePeru, ofrecemos reintentos, cambios o crédito.</p>
            <h2>9. Reembolsos</h2>
            <p>Por la naturaleza digital e inmediata de los productos, no hay reembolsos una vez completada la entrega. Los pagos realizados por pasarela (MercadoPago, PayPal, NOWPayments) pueden ser disputados directamente a través de la pasarela correspondiente. Los pagos manuales no son reembolsables una vez acreditados los KC. Ver nuestra <Link to="/refunds" className="legal-link">Política de Reembolsos</Link>.</p>
            <h2>10. Contacto</h2>
            <p>Para consultas, contáctanos por nuestros <Link to="/contact" className="legal-link">canales de soporte</Link>.</p></div>) : (<div className="legal-body"><p>These Terms and Conditions govern the use of the KidStorePeru website and the purchase of digital products offered. By accessing, browsing, or purchasing, you accept these Terms.</p>
            <h2>1. What we offer</h2>
            <p>KidStorePeru sells digital Fortnite items (skins, packs, cosmetics) and KidCoins recharges, delivered in-game via the gifting feature from operational accounts.</p>
            <h2>2. No affiliation with Epic Games</h2>
            <p>KidStorePeru is not affiliated with, sponsored by, or endorsed by Epic Games, Inc. Fortnite and all related marks are property of Epic Games, Inc. References are used for descriptive purposes only.</p>
            <h2>3. Customer requirements</h2>
            <ul><li>Provide your correct Epic Display Name</li><li>Have your account enabled to receive gifts</li><li>Meet the game requirements to receive gifts</li></ul>
            <h2>4. Payment methods</h2>
            <p>KidStorePeru offers multiple payment methods:</p>
            <ul>
              <li><strong>Payment gateways (automatic):</strong> MercadoPago (credit/debit cards, digital Yape), PayPal (international cards), and NOWPayments (cryptocurrencies: BTC, ETH, USDT, and more). When paying via a gateway, your KidCoins or products are credited automatically upon payment confirmation.</li>
              <li><strong>Manual methods:</strong> Yape, Plin, bank transfer (BCP, Interbank, BBVA), and Bizum. Manual payments require admin approval before KC are credited or the order is processed.</li>
            </ul>
            <h2>5. Available products</h2>
            <p>In addition to KidCoins, you can purchase products directly: V-Bucks, Fortnite Packs, Fortnite Club, and Rocket League Credits. Gateway payments process these orders automatically.</p>
            <h2>6. Purchase process</h2>
            <ol><li>Select the product or KC package</li><li>Enter your delivery details</li><li>Complete payment via your chosen method (gateway or manual)</li><li>If using a gateway, KC are credited or the order is processed automatically upon payment confirmation</li><li>If using a manual method, an admin verifies and approves your payment</li><li>We process and manage in-game delivery</li></ol>
            <h2>7. Notifications</h2>
            <p>You will receive email notifications when your payment is approved and when your order is delivered.</p>
            <h2>8. Delivery and contingencies</h2>
            <p>Delivery times are estimates and may vary. Delivery is considered complete when the item appears delivered in-game. If delivery cannot be completed due to causes outside KidStorePeru, we offer retries, exchanges, or credit.</p>
            <h2>9. Refunds</h2>
            <p>Due to the immediate digital nature of products, no refunds are issued once delivery is complete. Payments made via gateways (MercadoPago, PayPal, NOWPayments) can be disputed directly through the corresponding gateway. Manual payments are non-refundable once KC are credited. See our <Link to="/refunds" className="legal-link">Refund Policy</Link>.</p>
            <h2>10. Contact</h2>
            <p>For inquiries, contact us through our <Link to="/contact" className="legal-link">support channels</Link>.</p></div>)}
      </div>
    </div>
  );
}
