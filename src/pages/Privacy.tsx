import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { useLang } from '../context/LangContext';

export default function Privacy() {
  const { lang } = useLang();
  const es = lang === 'es';
  return (
    <div className="legal-page">
      <div className="legal-inner">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>
        <div className="legal-header">
          <div className="legal-icon" style={{background:'rgba(6,182,212,0.1)',color:'#06b6d4',borderColor:'rgba(6,182,212,0.2)'}}><Shield size={28}/></div>
          <div>
            <h1>{es ? 'Política de Privacidad' : 'Privacy Policy'}</h1>
            <p className="legal-updated">{es ? 'Tu privacidad es importante para nosotros' : 'Your privacy matters to us'}</p>
          </div>
        </div>
        {es ? (<div className="legal-body"><p>KidStorePeru está comprometido con la seguridad de los datos de nuestros usuarios. Esta política describe qué datos recopilamos realmente y con qué servicios los compartimos — la actualizamos para reflejar cómo funciona el sitio hoy.</p>
            <div className="legal-highlight"><strong>Aviso:</strong> Esta política puede cambiar con el tiempo. Te recomendamos revisar esta página periódicamente.</div>
            <h2>Información que recopilamos</h2>
            <ul>
              <li>Nombre de usuario Epic Games y dirección de correo electrónico</li>
              <li>Teléfono, si lo agregas a tu perfil o a un reclamo (siempre opcional)</li>
              <li>Historial de compras, recargas y transacciones de pago</li>
              <li>Método de pago utilizado (nunca almacenamos números de tarjeta ni datos bancarios — ver más abajo)</li>
              <li>Si inicias sesión o vinculas tu cuenta con Google o Discord: el identificador de esa cuenta, el correo y el nombre de perfil que esos servicios nos entregan al autorizar el acceso</li>
              <li>Si presentas un reclamo o queja en nuestro Libro de Reclamaciones Virtual: nombre completo, tipo y número de documento, correo, teléfono y domicilio (estos dos últimos opcionales), y si indicas que el consumidor es menor de edad, esa condición junto con los datos que hayas incluido en el formulario — es información exigida por la normativa de defensa del consumidor</li>
              <li>Dirección IP, registrada en nuestros logs de seguridad junto con ciertas acciones de la cuenta (inicio de sesión, cambios de contraseña, activación de 2FA, entre otras) para poder investigar actividad sospechosa</li>
              <li>País y divisa aproximados, detectados a partir de tu IP mediante un servicio externo (ver "Servicios de terceros")</li>
            </ul>
            <h2>Cómo usamos tu información</h2>
            <ul><li>Procesar y completar tus pedidos</li><li>Mantener un registro de transacciones</li><li>Enviar notificaciones por correo sobre aprobación de pagos y entregas</li><li>Atender y responder reclamos y quejas conforme a la normativa vigente</li><li>Detectar y prevenir accesos indebidos a tu cuenta</li><li>Mejorar nuestros productos y servicios</li></ul>
            <h2>Pasarelas de pago y datos financieros</h2>
            <p>Cuando pagas mediante MercadoPago (Perú) o dLocal Go (resto del mundo), tus datos financieros (números de tarjeta, datos de Yape u otros métodos locales) son procesados exclusivamente por la pasarela correspondiente. <strong>KidStorePeru nunca ve, almacena ni tiene acceso a tus números de tarjeta ni datos bancarios.</strong> Cada pasarela tiene su propia política de privacidad y seguridad.</p>
            <p>Los pagos manuales (Yape, Plin, BCP, Interbank y BBVA en Perú; Bizum en España) son verificados por nuestro equipo. Solo registramos la referencia del pago, nunca datos sensibles de tu cuenta bancaria.</p>
            <h2>Servicios de terceros</h2>
            <p>Además de las pasarelas de pago, usamos estos servicios externos, cada uno con su propia política de privacidad que no controlamos:</p>
            <ul>
              <li><strong>Google y Discord</strong> — para iniciar sesión o vincular tu cuenta ("Continuar con Google/Discord"). Recibimos de ellos los datos de perfil que autorices al conectar.</li>
              <li><strong>ipapi.co</strong> — le enviamos tu dirección IP para detectar automáticamente tu país y divisa y así mostrarte precios de referencia correctos. No usamos este dato para ningún otro fin de nuestro lado.</li>
              <li><strong>Facebook</strong> — las reseñas de clientes que se muestran en la portada son publicaciones reales incrustadas directamente desde Facebook con su widget oficial. Al cargar esas publicaciones, tu navegador se conecta a servidores de Facebook, que pueden aplicar su propia recolección de datos sobre esa conexión — es algo fuera de nuestro control, sujeto a la política de privacidad de Facebook.</li>
              <li><strong>Discord (bot)</strong> — si vinculas tu cuenta de Discord, nuestro bot puede enviarte notificaciones y responder a los comandos que le envíes en los canales o mensajes directos habilitados para eso.</li>
              <li><strong>Proveedor de envío de correo</strong> — usamos un servicio externo de envío de correo transaccional para entregarte confirmaciones de pago, códigos de verificación y notificaciones de pedidos.</li>
            </ul>
            <h2>Seguridad</h2>
            <p>KidStorePeru utiliza sistemas de seguridad actualizados. Tu contraseña se almacena de forma cifrada y nunca se comparte.</p>
            <h2>Cookies y almacenamiento local</h2>
            <p>Usamos cookies y almacenamiento local esenciales para el funcionamiento del sitio (sesión, idioma, tema, carrito). No colocamos cookies de seguimiento publicitario propias — pero, como se explica arriba, los widgets incrustados de terceros (como las publicaciones de Facebook) pueden establecer sus propias cookies que no controlamos.</p>
            <h2>Retención de datos</h2>
            <p>Conservamos tu información mientras tu cuenta esté activa y el tiempo adicional que exija la normativa aplicable (por ejemplo, los registros de pagos y reclamos, que respaldan tu historial de compras y nuestras obligaciones de defensa del consumidor). No tenemos un plazo fijo único de eliminación automática para todos los tipos de datos: si quieres que evaluemos borrar información específica, contáctanos y lo revisamos caso por caso.</p>
            <h2>Tus derechos</h2>
            <ul><li>Puedes solicitar acceso, corrección o eliminación de tus datos</li><li>Puedes eliminar tu cuenta desde tu perfil, o pedirnos que lo hagamos por ti</li><li>No vendemos tu información a nadie. Sí la compartimos con los servicios puntuales descritos arriba (pasarelas de pago, Google/Discord, ipapi.co, nuestro proveedor de correo) porque el sitio los necesita para funcionar — nunca con fines publicitarios ni con otros terceros</li></ul>
            <h2>Contacto</h2>
            <p>Para consultas sobre privacidad, contáctanos a través de nuestros <Link to="/contact" className="legal-link">canales de soporte</Link>.</p></div>) : (<div className="legal-body"><p>KidStorePeru is committed to the security of our users' data. This policy describes what data we actually collect and which services we share it with — updated to reflect how the site works today.</p>
            <div className="legal-highlight"><strong>Notice:</strong> This policy may change over time. We recommend reviewing this page periodically.</div>
            <h2>Information we collect</h2>
            <ul>
              <li>Epic Games username and email address</li>
              <li>Phone number, if you add it to your profile or a complaint (always optional)</li>
              <li>Purchase, recharge, and payment transaction history</li>
              <li>Payment method used (we never store card numbers or bank details — see below)</li>
              <li>If you sign in or link your account with Google or Discord: that account's identifier, and the email and profile name those services provide when you authorize access</li>
              <li>If you submit a complaint or grievance through our Virtual Complaints Book: full name, document type and number, email, phone, and address (the last two optional), and if you indicate the consumer is a minor, that status along with whatever you included in the form — required by consumer-protection regulations</li>
              <li>IP address, recorded in our security logs alongside certain account actions (login, password changes, 2FA activation, among others) so we can investigate suspicious activity</li>
              <li>Approximate country and currency, detected from your IP through a third-party service (see "Third-party services")</li>
            </ul>
            <h2>How we use your information</h2>
            <ul><li>Process and complete your orders</li><li>Maintain a transaction record</li><li>Send email notifications about payment approvals and deliveries</li><li>Handle and respond to complaints and grievances as required by law</li><li>Detect and prevent unauthorized access to your account</li><li>Improve our products and services</li></ul>
            <h2>Payment gateways and financial data</h2>
            <p>When you pay via MercadoPago (Peru) or dLocal Go (rest of the world), your financial data (card numbers, Yape details, or other local payment methods) is processed exclusively by the corresponding gateway. <strong>KidStorePeru never sees, stores, or has access to your card numbers or bank details.</strong> Each gateway has its own privacy and security policy.</p>
            <p>Manual payments (Yape, Plin, BCP, Interbank and BBVA in Peru; Bizum in Spain) are verified by our team. We only record the payment reference, never sensitive bank account data.</p>
            <h2>Third-party services</h2>
            <p>Besides payment gateways, we use these external services, each with its own privacy policy we don't control:</p>
            <ul>
              <li><strong>Google and Discord</strong> — to sign in or link your account ("Continue with Google/Discord"). We receive whatever profile data you authorize when connecting.</li>
              <li><strong>ipapi.co</strong> — we send your IP address to automatically detect your country and currency, so we can show correct reference prices. We don't use this data for any other purpose on our end.</li>
              <li><strong>Facebook</strong> — the customer reviews shown on the homepage are real posts embedded directly from Facebook via their official widget. Loading those posts connects your browser to Facebook's servers, which may apply their own data collection to that connection — something outside our control, subject to Facebook's privacy policy.</li>
              <li><strong>Discord (bot)</strong> — if you link your Discord account, our bot can send you notifications and respond to commands you send it in the channels or direct messages enabled for that.</li>
              <li><strong>Email delivery provider</strong> — we use a third-party transactional email service to deliver payment confirmations, verification codes, and order notifications.</li>
            </ul>
            <h2>Security</h2>
            <p>KidStorePeru uses up-to-date security systems. Your password is stored encrypted and never shared.</p>
            <h2>Cookies and local storage</h2>
            <p>We use essential cookies and local storage for site functionality (session, language, theme, cart). We don't set our own advertising tracking cookies — but as noted above, embedded third-party widgets (like Facebook posts) may set their own cookies we don't control.</p>
            <h2>Data retention</h2>
            <p>We keep your information while your account is active, plus whatever additional time applicable regulations require (for example, payment and complaint records, which back up your purchase history and our consumer-protection obligations). We don't have one single fixed automatic-deletion period for every kind of data — if you'd like us to consider deleting specific information, contact us and we'll review it case by case.</p>
            <h2>Your rights</h2>
            <ul><li>You may request access, correction, or deletion of your data</li><li>You can delete your account from your profile, or ask us to do it for you</li><li>We don't sell your information to anyone. We do share it with the specific services described above (payment gateways, Google/Discord, ipapi.co, our email provider) because the site needs them to work — never for advertising purposes or with any other third party</li></ul>
            <h2>Contact</h2>
            <p>For privacy inquiries, contact us through our <Link to="/contact" className="legal-link">support channels</Link>.</p></div>)}
      </div>
    </div>
  );
}
