import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ArrowLeft } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useSEO } from '../hooks/useSEO';

const FAQS_ES = [
  { q: '¿Por qué debo añadir el bot como amigo durante 48 horas?', a: 'Epic Games exige una ventana de amistad de 48 horas antes de poder enviar cualquier regalo. Es una configuración de una sola vez — una vez que agregues los bots, tus próximos pedidos serán mucho más rápidos. Te guiamos paso a paso en nuestra sección de Bots.' },
  { q: '¿Cuánto tarda la entrega después de pagar?', a: 'Una vez confirmado el pago y si el requisito de amistad de 48 horas ya está cumplido, la entrega suele tardar entre 1 y 5 minutos. En momentos de alta demanda puede tardar un poco más. Puedes ver el estado de tu pedido en tiempo real en Mis pedidos.' },
  { q: '¿Qué información necesito para hacer un pedido?', a: 'Solo necesitas tu nombre de usuario de Epic Games (Epic Display Name), que es el nombre visible dentro de Fortnite. También necesitas una cuenta en KidStorePeru y tener KidCoins (KC) suficientes para el ítem que deseas.' },
  { q: '¿Qué son los KidCoins (KC)?', a: 'Los KidCoins son la moneda interna de KidStorePeru. Con ellos puedes comprar cualquier ítem disponible en la tienda. Puedes recargarlos al instante con Mercado Pago (tarjeta de Perú o del extranjero), PayPal o criptomonedas, o de forma manual con Yape, Plin, BCP, Interbank y BBVA (Perú) o Bizum (España).' },
  { q: '¿Por qué cada objeto muestra monedas V y KC?', a: 'Las monedas V son el precio del objeto en la tienda oficial de Fortnite. Tú pagas con KidCoins: 1 moneda V = 1 KC. El botón amarillo de cada objeto muestra exactamente cuántos KC se descuentan de tu saldo al comprarlo.' },
  { q: '¿Qué métodos de pago aceptan?', a: 'Pagos automáticos (al instante): Mercado Pago, con tarjeta de crédito o débito de Perú o de cualquier otro país; y fuera de Perú también PayPal y criptomonedas. La comisión de la pasarela se suma al precio y la ves desglosada antes de pagar (en cripto, la comisión de la red la indica NOWPayments al elegir la moneda). Métodos manuales (con periodo de espera): en Perú, Yape, Plin, BCP, Interbank y BBVA, sin comisión; en España, Bizum, con un pequeño recargo que cubre el envío del dinero a Perú — con estos pagas con los datos indicados, subes tu comprobante en la página de Recargar y lo verificamos a mano antes de liberar tus KC (máximo 30 minutos), así que no es inmediato.' },
  { q: '¿Puedo comprar si mi cuenta es nueva?', a: 'Sí, pero debes asegurarte de que tu cuenta de Fortnite esté habilitada para recibir regalos y haber sido amigo de los bots de KidStorePeru por al menos 48 horas antes de tu primer pedido.' },
  { q: '¿Qué pasa si el ítem que quiero no está disponible?', a: 'La tienda de Fortnite rota diariamente. Agrégalo a tu Lista de deseos (la campana de cada objeto, o el buscador en Lista de deseos) y te avisamos en la web, por correo y por Discord cuando vuelva a la tienda.' },
  { q: '¿A qué bot debo agregar?', a: 'En la sección Bots verás cuántos amigos tiene cada cuenta. Epic permite como máximo 1000 amigos por cuenta: si un bot dice «Llena», ya no puede aceptar tu solicitud, así que agrega otro. Mientras más bots agregues, más rápida será la entrega.' },
  { q: '¿Puedo pedir un reembolso?', a: 'Si no podemos entregar tu pedido (por ejemplo, si el usuario de Epic no existe, ya tienes ese ítem o no agregaste a ninguno de nuestros bots como amigo), te devolvemos los KidCoins a tu saldo automáticamente. Una vez entregado, la compra es final por la naturaleza digital del producto. Si crees que hubo un error de nuestra parte, contáctanos y revisamos tu caso.' },
  { q: '¿En qué horario atienden?', a: 'Nuestro equipo atiende todos los días, las 24 horas.' },
];

const FAQS_EN = [
  { q: 'Why do I need to add the bot as a friend for 48 hours?', a: 'Epic Games requires a 48-hour friendship window before sending any gift. It\'s a one-time setup — once you add the bots, your future orders will be much faster. We guide you step by step in our Bots section.' },
  { q: 'How long does delivery take after payment?', a: 'Once payment is confirmed and the 48-hour friendship requirement is met, delivery usually takes 1 to 5 minutes. During high demand it may take a bit longer. You can track your order status in real time in My orders.' },
  { q: 'What information do I need to place an order?', a: 'You only need your Epic Games username (Epic Display Name) — the name visible inside Fortnite. You also need a KidStorePeru account and enough KidCoins (KC) for the item you want.' },
  { q: 'What are KidCoins (KC)?', a: 'KidCoins are the internal currency of KidStorePeru. You can use them to buy any item available in the store. Recharge them instantly with Mercado Pago (a card from Peru or abroad), PayPal, or cryptocurrency, or manually via Yape, Plin, BCP, Interbank, and BBVA (Peru) or Bizum (Spain).' },
  { q: 'Why does each item show V-Bucks and KC?', a: 'V-Bucks are the item\'s price in the official Fortnite store. You pay with KidCoins: 1 V-Buck = 1 KC. The yellow button on each item shows exactly how many KC are deducted from your balance when you buy it.' },
  { q: 'What payment methods do you accept?', a: 'Automatic payments (instant): Mercado Pago, with a credit or debit card from Peru or any other country; and outside Peru also PayPal and cryptocurrency. The gateway fee is added to the price and shown itemized before you pay (for crypto, NOWPayments shows the network fee when you pick the coin). Manual methods (with a waiting period): in Peru, Yape, Plin, BCP, Interbank, and BBVA, with no fee; in Spain, Bizum, with a small fee that covers sending the money to Peru — with these you pay using the details shown, upload your receipt on the Recharge page, and we verify it by hand before releasing your KC (within 30 minutes), so it isn\'t immediate.' },
  { q: 'Can I buy if my account is new?', a: 'Yes, but make sure your Fortnite account is enabled to receive gifts and that you\'ve been friends with KidStorePeru\'s bots for at least 48 hours before your first order.' },
  { q: 'What if the item I want is not available?', a: 'The Fortnite store rotates daily. Add it to your Wishlist (the bell on each item, or the search in Wishlist) and we\'ll let you know on the site, by email, and on Discord when it\'s back in the shop.' },
  { q: 'Which bot should I add?', a: 'In the Bots section you\'ll see how many friends each account has. Epic allows at most 1000 friends per account: if a bot says "Full", it can\'t accept your request, so add another one. The more bots you add, the faster delivery will be.' },
  { q: 'Can I get a refund?', a: 'If we can\'t deliver your order (for example, the Epic username doesn\'t exist, you already own the item, or you didn\'t add any of our bots as a friend), your KidCoins are automatically returned to your balance. Once delivered, the purchase is final due to the digital nature of the product. If you think we made a mistake, contact us and we\'ll review your case.' },
  { q: 'What are your support hours?', a: 'Our team is available every day, 24 hours a day.' },
];

export default function FAQPage() {
  const { lang } = useLang();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = lang === 'es' ? FAQS_ES : FAQS_EN;
  const es = lang === 'es';

  useSEO({
    title: es ? 'Preguntas frecuentes' : 'FAQ',
    description: es
      ? 'Resolvemos tus dudas sobre KidStorePeru: entregas, KidCoins, métodos de pago, reembolsos y más.'
      : 'Answers to your questions about KidStorePeru: deliveries, KidCoins, payment methods, refunds, and more.',
  });

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
