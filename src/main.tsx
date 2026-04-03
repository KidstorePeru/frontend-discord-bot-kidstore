import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/navbar.css';
import './styles/landing.css';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/profile.css';
import './styles/store.css';
import './styles/recharge.css';
import './styles/admin.css';
import './styles/cart.css';
import './styles/chatbot.css';
import './styles/payment-return.css';
import './styles/utilities.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
