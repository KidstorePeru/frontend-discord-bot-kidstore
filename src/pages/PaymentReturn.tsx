import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { getPaymentStatus, capturePayPalPayment } from '../services/api';
import { CheckCircle, XCircle, Loader2, ArrowRight, Copy, CheckCircle as Check2, MessageCircle, ShieldCheck, Clock } from 'lucide-react';

type PayState = 'loading' | 'pending' | 'processing' | 'success' | 'error';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const { lang } = useLang();
  const { refresh } = useAuth();
  const es = lang === 'es';

  const paymentId = params.get('id') || '';
  const status = params.get('status') || '';
  const gateway = params.get('gateway') || '';
  const paypalToken = params.get('token') || '';

  const [state, setState] = useState<PayState>('loading');
  const [productName, setProductName] = useState('');
  const [kcAmount, setKcAmount] = useState(0);
  const [activationCode, setActivationCode] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!paymentId) { setState('error'); return; }
    async function process() {
      try {
        if (gateway === 'paypal' && paypalToken) {
          setState('processing');
          await capturePayPalPayment(paymentId, paypalToken);
        }
        setState('processing');
        const check = async (attempts: number): Promise<void> => {
          const res = await getPaymentStatus(paymentId);
          const tx = res.transaction as Record<string, unknown>;
          setProductName(tx.product_name as string || '');
          setKcAmount(tx.kc_amount as number || 0);
          if (tx.activation_code) setActivationCode(tx.activation_code as string);
          if (tx.payment_type) setPaymentType(tx.payment_type as string);
          const s = tx.status as string;
          if (s === 'approved' || s === 'fulfilled') { setState('success'); refresh(); return; }
          if (s === 'failed' || s === 'expired') { setState('error'); return; }
          if (attempts > 0) { await new Promise(r => setTimeout(r, 2500)); return check(attempts - 1); }
          setState('pending');
        };
        await check(8);
      } catch { setState(status === 'failure' ? 'error' : 'pending'); }
    }
    process();
  }, [paymentId, gateway, paypalToken, status, refresh]);

  function copyCode() {
    navigator.clipboard.writeText(activationCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const steps = [
    { label: es ? 'Pago enviado' : 'Payment sent' },
    { label: es ? 'Verificando' : 'Verifying' },
    { label: es ? 'Confirmado' : 'Confirmed' },
  ];
  const activeStep = state === 'loading' || state === 'pending' ? 0 : state === 'processing' ? 1 : state === 'success' ? 2 : -1;

  return (
    <div className="pr-page">
      <div className="pr-container">

        {/* Stepper */}
        {state !== 'error' && (
          <div className="pr-stepper">
            {steps.map((step, i) => (
              <div key={i} className="pr-step-group">
                <div className={`pr-step-circle ${i < activeStep ? 'done' : i === activeStep ? 'active' : ''}`}>
                  {i < activeStep ? <CheckCircle size={20}/> : i === activeStep && (state === 'processing' || state === 'loading') ? <Loader2 size={18} className="spin"/> : <span>{i + 1}</span>}
                </div>
                <span className={`pr-step-label ${i <= activeStep ? 'on' : ''}`}>{step.label}</span>
                {i < steps.length - 1 && <div className={`pr-step-line ${i < activeStep ? 'done' : ''}`}/>}
              </div>
            ))}
          </div>
        )}

        {/* Content card */}
        <div className="pr-card">

          {/* Loading */}
          {state === 'loading' && (
            <div className="pr-center">
              <Loader2 size={48} className="spin pr-icon-accent"/>
              <h1>{es ? 'Conectando...' : 'Connecting...'}</h1>
            </div>
          )}

          {/* Processing */}
          {state === 'processing' && (
            <div className="pr-center">
              <div className="pr-pulse-ring">
                <Loader2 size={40} className="spin"/>
              </div>
              <h1>{es ? 'Procesando tu pago' : 'Processing your payment'}</h1>
              <p>{es ? 'Estamos verificando la transaccion con la pasarela de pago. Esto puede tardar unos segundos.' : 'We\'re verifying the transaction with the payment gateway. This may take a few seconds.'}</p>
            </div>
          )}

          {/* Pending */}
          {state === 'pending' && (
            <div className="pr-center">
              <Clock size={52} className="pr-icon-warning"/>
              <h1>{es ? 'Pago pendiente' : 'Payment pending'}</h1>
              <p>{es ? 'Tu pago esta siendo verificado. Te notificaremos por email cuando se confirme.' : 'Your payment is being verified. We\'ll notify you by email when confirmed.'}</p>
              <Link to="/dashboard" className="btn btn-primary pr-btn">{es ? 'Ir al dashboard' : 'Go to dashboard'} <ArrowRight size={14}/></Link>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="pr-center">
              <div className="pr-success-icon">
                <ShieldCheck size={44}/>
              </div>
              <h1>{es ? 'Pago confirmado!' : 'Payment confirmed!'}</h1>
              <p className="pr-product-name">{productName}</p>

              {kcAmount > 0 && (
                <div className="pr-kc-badge">+{kcAmount.toLocaleString()} KC</div>
              )}

              {paymentType === 'product_purchase' && activationCode && (
                <div className="pr-activation-box">
                  <span className="pr-activation-label">{es ? 'Tu codigo de activacion' : 'Your activation code'}</span>
                  <div className="pr-activation-code-row">
                    <span className="pr-activation-code">{activationCode}</span>
                    <button onClick={copyCode} className="pr-copy-btn">
                      {copied ? <><Check2 size={14}/> {es ? 'Copiado!' : 'Copied!'}</> : <><Copy size={14}/> {es ? 'Copiar' : 'Copy'}</>}
                    </button>
                  </div>

                  <div className="pr-how-to">
                    <strong>{es ? 'Como activar tu producto:' : 'How to activate:'}</strong>
                    <div className="pr-steps-mini">
                      <div><span className="pr-mini-num">1</span> {es ? 'Abre el chatbot' : 'Open the chatbot'} <span className="pr-mini-hint">({es ? 'esquina inferior derecha' : 'bottom right corner'})</span></div>
                      <div><span className="pr-mini-num">2</span> {es ? 'Escribe' : 'Type'} <code>!activar {activationCode}</code></div>
                      <div><span className="pr-mini-num">3</span> {es ? 'Vincula tu cuenta Epic y listo!' : 'Link your Epic account and done!'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pr-actions">
                {paymentType === 'product_purchase' && activationCode && (
                  <button onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot', { detail: { code: activationCode, product: productName } }))} className="btn btn-primary pr-btn">
                    <MessageCircle size={15}/> {es ? 'Abrir chatbot y activar' : 'Open chatbot & activate'}
                  </button>
                )}
                <Link to="/dashboard" className="btn btn-ghost pr-btn">
                  {es ? 'Ir al dashboard' : 'Dashboard'} <ArrowRight size={14}/>
                </Link>
              </div>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="pr-center">
              <XCircle size={52} className="pr-icon-error"/>
              <h1>{es ? 'Pago no completado' : 'Payment not completed'}</h1>
              <p>{es ? 'No se realizo ningun cargo a tu cuenta. Puedes intentar de nuevo.' : 'No charges were made to your account. You can try again.'}</p>
              <div className="pr-actions">
                <Link to="/store" className="btn btn-primary pr-btn">{es ? 'Volver a la tienda' : 'Back to store'}</Link>
                <Link to="/contact" className="btn btn-ghost pr-btn">{es ? 'Contactar soporte' : 'Contact support'}</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
