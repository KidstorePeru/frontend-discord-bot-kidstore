import { describe, it, expect } from 'vitest';
import { classifyForgotPasswordError } from './ResetPassword';

// Pruebas de regresión del punto 3 del pedido de correcciones: antes, el
// catch de "olvidé mi contraseña" mostraba "¡Enlace enviado!" ante
// CUALQUIER error — incluida una caída de red o el backend caído — porque
// se pensaba (incorrectamente) que así se protegía la privacidad sobre si
// el correo existe. El backend ya hace esa parte (HandlerForgotPassword
// responde 200 con el mismo mensaje tanto si el correo existe como si no),
// así que classifyForgotPasswordError solo necesita distinguir errores
// REALES para mostrar algo útil y nunca afirmar un envío que no ocurrió.

describe('classifyForgotPasswordError', () => {
  it('sin status (fetch nunca tuvo respuesta): error de conexión', () => {
    const msg = classifyForgotPasswordError(new Error('Failed to fetch'), true);
    expect(msg).toMatch(/conectarnos|conexión/i);
  });

  it('sin status, en inglés', () => {
    const msg = classifyForgotPasswordError(new Error('Failed to fetch'), false);
    expect(msg).toMatch(/connect/i);
  });

  it('status 429: límite de intentos', () => {
    const err = Object.assign(new Error('demasiados intentos'), { status: 429 });
    const msg = classifyForgotPasswordError(err, true);
    expect(msg).toMatch(/demasiados intentos/i);
  });

  it('status 500: error de servidor', () => {
    const err = Object.assign(new Error('error interno'), { status: 500 });
    const msg = classifyForgotPasswordError(err, true);
    expect(msg).toMatch(/servidor/i);
  });

  it('status 503: también se trata como error de servidor (>=500)', () => {
    const err = Object.assign(new Error('unavailable'), { status: 503 });
    const msg = classifyForgotPasswordError(err, true);
    expect(msg).toMatch(/servidor/i);
  });

  it('status 400: mensaje genérico de reintento, no de conexión ni de servidor', () => {
    const err = Object.assign(new Error('bad request'), { status: 400 });
    const msg = classifyForgotPasswordError(err, true);
    expect(msg).not.toMatch(/conectarnos|conexión/i);
    expect(msg).not.toMatch(/servidor/i);
    expect(msg).toMatch(/no pudimos procesar/i);
  });

  it('ningún mensaje de error afirma jamás que el enlace se envió', () => {
    const cases: unknown[] = [
      new Error('network'),
      Object.assign(new Error(), { status: 429 }),
      Object.assign(new Error(), { status: 500 }),
      Object.assign(new Error(), { status: 400 }),
    ];
    for (const err of cases) {
      for (const es of [true, false]) {
        const msg = classifyForgotPasswordError(err, es);
        expect(msg.toLowerCase()).not.toMatch(/enviad|sent/);
      }
    }
  });
});
