import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ArrowLeft } from 'lucide-react';
import { useLang } from '../context/LangContext';

const FAQS_ES = [
  { q: '¿Por qué debo añadir el bot como amigo durante 48 horas?', a: 'Epic Games exige una ventana de amistad de 48 horas antes de poder enviar cualquier regalo. Es una configuración de una sola vez — una vez que agregues los bots, tus próximos pedidos serán mucho más rápidos. Te guiamos paso a paso en nuestra sección de Bots.' },
  { q: '¿Cuánto tarda la entrega después de pagar?', a: 'Una vez confirmado el pago y si el requisito de amistad de 48 horas ya está cumplido, la entrega suele tardar entre 1 y 5 minutos. En momentos de alta demanda puede tardar un poco más. Puedes ver el estado de tu pedido en tiempo real desde tu panel.' },
  { q: '¿Qué información necesito para hacer un pedido?', a: 'Solo necesitas tu nombre de usuario de Epic Games (Epic Display Name), que es el nombre visible dentro de Fortnite. También necesitas una cuenta en KidStorePeru y tener KidCoins (KC) suficientes para el ítem que deseas.' },
  { q: '¿Qué son los KidCoins (KC)?', a: 'Los KidCoins son la moneda interna de KidStorePeru. Con ellos puedes comprar cualquier ítem disponible en la tienda. Puedes recargarlos con Yape, Plin, BCP, Interbank, BBVA, PayPal o Binance.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Aceptamos: Yape, Plin, BCP, Interbank, BBVA (transferencia bancaria), PayPal y Binance Pay. Los pagos con Yape y Plin son instantáneos. Las transferencias bancarias pueden tardar unos minutos en verificarse.' },
  { q: '¿Puedo comprar si mi cuenta es nueva?', a: 'Sí, pero debes asegurarte de que tu cuenta de Fortnite esté habilitada para recibir regalos y haber sido amigo de los bots de KidStorePeru por al menos 48 horas antes de tu primer pedido.' },
  { q: '¿Qué pasa si el ítem que quiero no está disponible?', a: 'La tienda de Fortnite rota diariamente. Si el ítem que deseas no está disponible hoy, vuelve a revisar mañana.' },
  { q: '¿Puedo pedir un reembolso?', a: 'Todas las compras son finales por la naturaleza digital del producto. Sin embargo, si hubo un error de nuestra parte, evaluamos el caso y podemos emitir crédito en KidCoins.' },
  { q: '¿En qué horario atienden?', a: 'Nuestro equipo atiende de Lunes a Domingo de 12:00 AM a 9:00 AM (hora Perú).' },
];

const FAQS_EN = [
  { q: 'Why do I need to add the bot as a friend for 48 hours?', a: 'Epic Games requires a 48-hour friendship window before sending any gift. It\'s a one-time setup — once you add the bots, your future orders will be much faster. We guide you step by step in our Bots section.' },
  { q: 'How long does delivery take after payment?', a: 'Once payment is confirmed and the 48-hour friendship requirement is met, delivery usually takes 1 to 5 minutes. During high demand it may take a bit longer. You can track your order status in real time from your panel.' },
  { q: 'What information do I need to place an order?', a: 'You only need your Epic Games username (Epic Display Name) — the name visible inside Fortnite. You also need a KidStorePeru account and enough KidCoins (KC) for the item you want.' },
  { q: 'What are KidCoins (KC)?', a: 'KidCoins are the internal currency of KidStorePeru. You can use them to buy any item available in the store. Recharge them with Yape, Plin, BCP, Interbank, BBVA, PayPal, or Binance.' },
  { q: 'What payment methods do you accept?', a: 'We accept: Yape, Plin, BCP, Interbank, BBVA (bank transfer), PayPal, and Binance Pay. Yape and Plin payments are instant. Bank transfers may take a few minutes to verify.' },
  { q: 'Can I buy if my account is new?', a: 'Yes, but make sure your Fortnite account is enabled to receive gifts and that you\'ve been friends with KidStorePeru\'s bots for at least 48 hours before your first order.' },
  { q: 'What if the item I want is not available?', a: 'The Fortnite store rotates daily. If the item you want isn\'t available today, check back tomorrow.' },
  { q: 'Can I get a refund?', a: 'All purchases are final due to the digital nature of the product. However, if there was an error on our end, we evaluate the case and may issue KidCoins credit.' },
  { q: 'What are your support hours?', a: 'Our team is available Monday to Sunday from 12:00 AM to 9:00 AM (Peru time).' },
];

export default function FAQPage() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = lang === 'es' ? FAQS_ES : FAQS_EN;
  const es = lang === 'es';

  return (
    <div className="legal-page">
      <div className="legal-inner legal-inner-narrow">
        <Link to="/" className="legal-back"><ArrowLeft size={16}/> {es ? 'Volver al inicio' : 'Back to home'}</Link>
        <div className="legal-header">
          <div className="legal-icon"><HelpCircle size={28}/></div>
          <div>
            <h1>{es ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}</h1>
            <p className="legal-updated">{es ? 'Todo lo que necesitas saber antes de hacer tu pedido' : 'Everything you need to know before placing an order'}</p>
          </div>
        </div>
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span>
                <ChevronDown size={18} className="faq-chevron"/>
              </button>
              {open === i && <div className="faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
        <div className="faq-cta">
          <HelpCircle size={20}/>
          <div>
            <strong>{es ? '¿No encontraste lo que buscabas?' : "Didn't find what you were looking for?"}</strong>
            <p>{es ? 'Contáctanos directamente.' : 'Contact us directly.'}</p>
          </div>
          <Link to="/contact" className="btn btn-primary btn-sm">{es ? 'Contactar soporte' : 'Contact support'}</Link>
        </div>
      </div>
    </div>
  );
}
