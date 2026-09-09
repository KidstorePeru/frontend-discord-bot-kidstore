import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';

export default function Refunds() {
  const { lang } = useLang();
  const es = lang === 'es';

  useSEO({
    title: es ? 'Política de Reembolsos' : 'Refund Policy',
    description: es
      ? 'Cuándo y cómo KidStorePeru reembolsa un pedido que no se pudo entregar.'
      : "When and how KidStorePeru refunds an order that couldn't be delivered.",
  });

  return (
    <div className="legal-page">
      <div className="legal-inner">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>
        <div className="legal-header">
          <div className="legal-icon" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b',borderColor:'rgba(245,158,11,0.2)'}}><RefreshCw size={28}/></div>
          <div>
            <h1>{es ? 'Política de Reembolsos' : 'Refund Policy'}</h1>
            <p className="legal-updated">{es ? 'Última actualización: 8 de setiembre de 2026' : 'Last updated: September 8, 2026'}</p>
          </div>
        </div>
        {es ? (
          <div className="legal-body">
            <div className="legal-highlight legal-highlight-warning"><strong>Importante:</strong> Al comprar en KidStorePeru, aceptas esta política.</div>

            <h2>1. Todas las compras son finales</h2>
            <p>Debido a la naturaleza digital de los productos, <strong>todas las compras son finales</strong>. No realizamos reembolsos al método de pago original salvo lo indicado en la sección de pagos por pasarela.</p>

            <h2>2. Cómo protegemos cada compra (antifraude)</h2>
            <p>Antes de entregar cualquier ítem, nuestro sistema aplica varias verificaciones automáticas para evitar cobros indebidos, entregas incorrectas o uso fraudulento de tu cuenta:</p>
            <ul>
              <li><strong>Precio e ítem verificados contra el catálogo real:</strong> el nombre, imagen y precio de cada producto se obtienen directamente de la API oficial de Fortnite en el momento de la compra — nunca confiamos en datos enviados desde el navegador, así que no es posible manipular un pedido para pagar menos o recibir un ítem distinto.</li>
              <li><strong>Espera de seguridad de 48 horas en amistades nuevas:</strong> nuestras cuentas bot solo envían regalos a cuentas de Epic Games con las que llevan más de 48 horas de amistad (verificado con la propia API de Epic). Esto evita que alguien use una cuenta recién agregada para intentar desviar un regalo.</li>
              <li><strong>Cada pedido pertenece solo a su dueño:</strong> tus pedidos, pagos y recargas solo son visibles y accesibles desde tu propia cuenta autenticada; no existe forma de consultar o modificar el pedido de otro cliente cambiando un número en la URL.</li>
              <li><strong>Verificación de pagos manuales antes de acreditar:</strong> los pagos por Yape, Plin o transferencia bancaria se confirman manualmente contra el comprobante real antes de acreditar KidCoins — nunca se acredita saldo por una simple declaración del cliente.</li>
              <li><strong>Bloqueo automático tras intentos fallidos:</strong> las cuentas y direcciones IP que muestran patrones de intentos repetidos o sospechosos quedan bloqueadas temporalmente.</li>
            </ul>

            <h2>3. Evidencia de entrega</h2>
            <p>Cuando un pedido se marca como <strong>enviado</strong>, guardamos la respuesta original que nos entrega Epic Games confirmando que el regalo fue procesado hacia la cuenta indicada, junto con la fecha y hora exactas. Esta confirmación:</p>
            <ul>
              <li>Es un registro independiente generado por Epic Games, no por nosotros, lo que la hace una prueba sólida de que el ítem sí se entregó.</li>
              <li>Se conserva de forma interna y se usa como evidencia si tu pasarela de pago, banco o billetera digital abre una disputa o contracargo sobre la transacción.</li>
              <li>Se refleja en tu <strong>comprobante</strong> (disponible desde tu panel) como "Entrega confirmada por Epic Games" junto con la fecha.</li>
            </ul>
            <p>Si Epic Games no confirma la entrega, el pedido no se marca como enviado y tu compra queda protegida por las condiciones de reembolso de esta política.</p>

            <h2>4. Pagos por pasarela (MercadoPago, dLocal Go, PayPal, criptomonedas)</h2>
            <p>Si realizaste el pago a través de MercadoPago (Perú) o dLocal Go, PayPal o criptomonedas (resto del mundo), puedes abrir una disputa o reclamo directamente con la pasarela correspondiente según sus propios plazos y condiciones. KidStorePeru colaborará proporcionando la información necesaria (incluyendo la evidencia de entrega descrita arriba) para resolver el caso.</p>

            <h2>5. Pagos manuales (Yape, Plin, BCP, Interbank, BBVA — Perú; Bizum — España)</h2>
            <p>Los pagos manuales pasan por un periodo de espera mientras verificamos que el pago haya llegado — recién ahí se acreditan tus KidCoins. Una vez acreditados, <strong>no son reembolsables</strong>. Si tu pago manual todavía no fue verificado, puedes solicitar la cancelación.</p>

            <h2>6. Reembolsos en crédito</h2>
            <p>Si corresponde un reembolso interno, se realizará <strong>exclusivamente como KidCoins</strong> para usar en KidStorePeru. El crédito no es canjeable por dinero.</p>

            <h2>7. Cuándo puede corresponder un reembolso en crédito</h2>
            <ul><li><strong>No entrega:</strong> No se pudo completar por causas atribuibles a KidStorePeru</li><li><strong>Error de producto:</strong> Se entregó un ítem distinto al comprado en la Tienda</li><li><strong>Duplicación de cobro:</strong> Cargo duplicado por el mismo pedido</li><li><strong>Cancelación previa:</strong> El pedido aún no fue procesado</li></ul>

            <h2>8. Casos en que NO corresponde reembolso</h2>
            <ul><li>El pedido figura como entregado dentro del juego, respaldado por la evidencia de entrega de Epic Games</li><li>Se proporcionaron datos incorrectos (usuario de Epic mal escrito) y la entrega ya se efectuó a esa cuenta</li><li>Restricciones o sanciones impuestas por Epic Games sobre la cuenta del comprador</li><li>Arrepentimiento o cambio de opinión una vez procesado</li><li>KidCoins ya acreditados por un pago manual verificado</li></ul>

            <h2>9. Notificaciones</h2>
            <p>Recibirás una notificación por correo electrónico cuando tu pago sea aprobado y otra cuando tu pedido sea entregado.</p>

            <h2>10. Tus derechos como consumidor (INDECOPI)</h2>
            <p>Como consumidor en Perú, tienes los derechos reconocidos por el <strong>Código de Protección y Defensa del Consumidor (Ley N° 29571)</strong>, y esta política no reemplaza ni limita esos derechos. En particular:</p>
            <ul>
              <li>Tienes derecho a presentar un reclamo o queja a través de nuestro <Link to="/libro-de-reclamaciones" className="legal-link">Libro de Reclamaciones Virtual</Link>, disponible de forma gratuita para todos los usuarios.</li>
              <li>Si no llegamos a un acuerdo directo, puedes acudir a <strong>INDECOPI</strong> (Instituto Nacional de Defensa de la Competencia y de la Protección de la Propiedad Intelectual) para presentar tu reclamo ante la autoridad de protección al consumidor.</li>
              <li>Registrar un reclamo en nuestro Libro de Reclamaciones no impide acudir directamente a INDECOPI u otra vía que consideres pertinente.</li>
            </ul>
            <p className="legal-note">Este documento es una guía informativa de buena fe y no constituye asesoría legal definitiva. Si tienes dudas específicas sobre tus derechos, te recomendamos asesorarte con un abogado o contador especializado en Perú.</p>

            <h2>11. Cómo solicitar un reembolso</h2>
            <ol><li>Contáctanos por nuestros <Link to="/contact" className="legal-link">canales de soporte</Link> o a través del <Link to="/libro-de-reclamaciones" className="legal-link">Libro de Reclamaciones</Link></li><li>Incluye: número de pedido, email, método de pago utilizado, descripción del problema y capturas</li></ol>
          </div>
        ) : (
          <div className="legal-body">
            <div className="legal-highlight legal-highlight-warning"><strong>Important:</strong> By purchasing at KidStorePeru, you accept this policy.</div>

            <h2>1. All purchases are final</h2>
            <p>Due to the digital nature of the products, <strong>all purchases are final</strong>. We do not issue refunds to the original payment method except as noted in the gateway payments section.</p>

            <h2>2. How we protect every purchase (anti-fraud)</h2>
            <p>Before any item is delivered, our system runs several automatic checks to prevent wrongful charges, incorrect deliveries, or fraudulent use of your account:</p>
            <ul>
              <li><strong>Price and item verified against the real catalog:</strong> each product's name, image, and price are pulled directly from Fortnite's official API at the time of purchase — we never trust data sent from the browser, so an order cannot be manipulated to pay less or receive a different item.</li>
              <li><strong>48-hour safety wait on new friendships:</strong> our bot accounts only send gifts to Epic Games accounts they've been friends with for more than 48 hours (verified with Epic's own API). This prevents someone from using a newly added account to try to redirect a gift.</li>
              <li><strong>Every order belongs only to its owner:</strong> your orders, payments, and recharges are only visible and accessible from your own authenticated account — there is no way to view or modify another customer's order by changing a number in the URL.</li>
              <li><strong>Manual payments are verified before crediting:</strong> Yape, Plin, or bank transfer payments are manually confirmed against the real receipt before KidCoins are credited — balance is never credited on a customer's claim alone.</li>
              <li><strong>Automatic lockout after failed attempts:</strong> accounts and IP addresses showing repeated or suspicious attempt patterns are temporarily locked.</li>
            </ul>

            <h2>3. Delivery evidence</h2>
            <p>When an order is marked as <strong>sent</strong>, we store the original response Epic Games gives us confirming the gift was processed to the specified account, along with the exact date and time. This confirmation:</p>
            <ul>
              <li>Is an independent record generated by Epic Games, not by us, making it strong proof the item was actually delivered.</li>
              <li>Is kept internally and used as evidence if your payment gateway, bank, or digital wallet opens a dispute or chargeback on the transaction.</li>
              <li>Is reflected on your <strong>receipt</strong> (available from your dashboard) as "Delivery confirmed by Epic Games" along with the timestamp.</li>
            </ul>
            <p>If Epic Games does not confirm delivery, the order is not marked as sent and your purchase remains protected under this policy's refund conditions.</p>

            <h2>4. Gateway payments (MercadoPago, dLocal Go, PayPal, cryptocurrency)</h2>
            <p>If you paid via MercadoPago (Peru) or dLocal Go, PayPal, or cryptocurrency (rest of the world), you can open a dispute or claim directly with the corresponding gateway according to their own timelines and conditions. KidStorePeru will cooperate by providing the necessary information (including the delivery evidence described above) to resolve the case.</p>

            <h2>5. Manual payments (Yape, Plin, BCP, Interbank, BBVA — Peru; Bizum — Spain)</h2>
            <p>Manual payments go through a waiting period while we verify the payment arrived — only then are your KidCoins credited. Once credited, they are <strong>non-refundable</strong>. If your manual payment hasn't been verified yet, you may request cancellation.</p>

            <h2>6. Credit refunds</h2>
            <p>If an internal refund is warranted, it will be issued <strong>exclusively as KidCoins</strong> to use at KidStorePeru. Credit is not redeemable for cash.</p>

            <h2>7. When a credit refund may apply</h2>
            <ul><li><strong>Non-delivery:</strong> Delivery could not be completed due to KidStorePeru's fault</li><li><strong>Wrong product:</strong> A different item was delivered than the one bought in the Store</li><li><strong>Duplicate charge:</strong> Duplicate charge for the same order</li><li><strong>Pre-processing cancellation:</strong> Order has not yet been processed</li></ul>

            <h2>8. Cases where NO refund applies</h2>
            <ul><li>The order shows as delivered in-game, backed by Epic Games' delivery evidence</li><li>Incorrect data was provided (misspelled Epic username) and delivery was completed to that account</li><li>Restrictions or bans imposed by Epic Games on the buyer's account</li><li>Change of mind once the order is processed</li><li>KidCoins already credited from a verified manual payment</li></ul>

            <h2>9. Notifications</h2>
            <p>You will receive an email notification when your payment is approved and another when your order is delivered.</p>

            <h2>10. Your rights as a consumer (INDECOPI)</h2>
            <p>As a consumer in Peru, you have the rights recognized under the <strong>Consumer Protection and Defense Code (Law N° 29571)</strong>, and this policy does not replace or limit those rights. In particular:</p>
            <ul>
              <li>You have the right to file a claim or complaint through our <Link to="/libro-de-reclamaciones" className="legal-link">Virtual Complaints Book</Link> (Libro de Reclamaciones Virtual), available free of charge to all users.</li>
              <li>If we don't reach a direct agreement, you may go to <strong>INDECOPI</strong> (Peru's National Institute for the Defense of Competition and Protection of Intellectual Property) to file your complaint with the consumer protection authority.</li>
              <li>Filing a claim in our Complaints Book does not prevent you from going directly to INDECOPI or any other avenue you consider appropriate.</li>
            </ul>
            <p className="legal-note">This document is a good-faith informational guide and does not constitute definitive legal advice. If you have specific questions about your rights, we recommend consulting a lawyer or accountant specialized in Peru.</p>

            <h2>11. How to request a refund</h2>
            <ol><li>Contact us through our <Link to="/contact" className="legal-link">support channels</Link> or through the <Link to="/libro-de-reclamaciones" className="legal-link">Complaints Book</Link></li><li>Include: order number, email, payment method used, problem description, and screenshots</li></ol>
          </div>
        )}
      </div>
    </div>
  );
}
