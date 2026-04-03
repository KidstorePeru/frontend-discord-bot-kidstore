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
        {es ? (<div className="legal-body"><p>KidStorePeru está comprometido con la seguridad de los datos de nuestros usuarios.</p>
            <div className="legal-highlight"><strong>Aviso:</strong> Esta política puede cambiar con el tiempo. Te recomendamos revisar esta página periódicamente.</div>
            <h2>Información que recopilamos</h2>
            <ul><li>Nombre de usuario Epic Games</li><li>Dirección de correo electrónico</li><li>Historial de compras y recargas</li><li>Método de pago utilizado (no almacenamos datos de tarjetas)</li></ul>
            <h2>Cómo usamos tu información</h2>
            <ul><li>Procesar y completar tus pedidos</li><li>Mantener un registro de transacciones</li><li>Enviar notificaciones por correo sobre aprobación de pagos y entregas</li><li>Mejorar nuestros productos y servicios</li></ul>
            <h2>Pasarelas de pago y datos financieros</h2>
            <p>Cuando pagas mediante MercadoPago, PayPal o NOWPayments, tus datos financieros (números de tarjeta, datos bancarios, direcciones de billetera cripto) son procesados exclusivamente por la pasarela correspondiente. <strong>KidStorePeru nunca ve, almacena ni tiene acceso a tus números de tarjeta ni datos bancarios.</strong> Cada pasarela tiene su propia política de privacidad y seguridad.</p>
            <p>Los pagos manuales (Yape, Plin, BCP, Interbank, BBVA, Bizum) son verificados por nuestro equipo. Solo registramos la referencia del pago, nunca datos sensibles de tu cuenta bancaria.</p>
            <h2>Seguridad</h2>
            <p>KidStorePeru utiliza sistemas de seguridad actualizados. Tu contraseña se almacena de forma cifrada y nunca se comparte.</p>
            <h2>Cookies</h2>
            <p>Usamos cookies esenciales para el funcionamiento del sitio (sesión, idioma y tema). No usamos cookies de seguimiento publicitario.</p>
            <h2>Tus derechos</h2>
            <ul><li>Puedes solicitar acceso, corrección o eliminación de tus datos</li><li>No vendemos ni cedemos tu información a terceros</li></ul>
            <h2>Contacto</h2>
            <p>Para consultas sobre privacidad, contáctanos a través de nuestros <Link to="/contact" className="legal-link">canales de soporte</Link>.</p></div>) : (<div className="legal-body"><p>KidStorePeru is committed to the security of our users' data.</p>
            <div className="legal-highlight"><strong>Notice:</strong> This policy may change over time. We recommend reviewing this page periodically.</div>
            <h2>Information we collect</h2>
            <ul><li>Epic Games username</li><li>Email address</li><li>Purchase and recharge history</li><li>Payment method used (we do not store card data)</li></ul>
            <h2>How we use your information</h2>
            <ul><li>Process and complete your orders</li><li>Maintain a transaction record</li><li>Send email notifications about payment approvals and deliveries</li><li>Improve our products and services</li></ul>
            <h2>Payment gateways and financial data</h2>
            <p>When you pay via MercadoPago, PayPal, or NOWPayments, your financial data (card numbers, bank details, crypto wallet addresses) is processed exclusively by the corresponding gateway. <strong>KidStorePeru never sees, stores, or has access to your card numbers or bank details.</strong> Each gateway has its own privacy and security policy.</p>
            <p>Manual payments (Yape, Plin, BCP, Interbank, BBVA, Bizum) are verified by our team. We only record the payment reference, never sensitive bank account data.</p>
            <h2>Security</h2>
            <p>KidStorePeru uses up-to-date security systems. Your password is stored encrypted and never shared.</p>
            <h2>Cookies</h2>
            <p>We use essential cookies for site functionality (session, language, and theme). We do not use advertising tracking cookies.</p>
            <h2>Your rights</h2>
            <ul><li>You may request access, correction, or deletion of your data</li><li>We do not sell or share your information with third parties</li></ul>
            <h2>Contact</h2>
            <p>For privacy inquiries, contact us through our <Link to="/contact" className="legal-link">support channels</Link>.</p></div>)}
      </div>
    </div>
  );
}
