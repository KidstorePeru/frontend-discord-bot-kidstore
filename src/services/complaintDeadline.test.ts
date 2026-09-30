import { describe, it, expect } from 'vitest';
import { complaintDeadlineInfo } from './complaintDeadline';

// Cómo se muestra el plazo legal (15 días hábiles) de cada reclamo en el panel.
describe('complaintDeadlineInfo', () => {
  const base = { status: 'pendiente', deadline_label: 'lun 19/10/2026' };

  it('con margen: verde, días hábiles restantes y fecha de vencimiento', () => {
    expect(complaintDeadlineInfo({ ...base, business_days_left: 10 })).toMatchObject({
      text: 'Quedan 10 días hábiles', detail: 'vence el lun 19/10/2026', tone: 'ok',
    });
  });

  it('3 días hábiles o menos: urgente (ámbar)', () => {
    expect(complaintDeadlineInfo({ ...base, business_days_left: 3 })?.tone).toBe('urgent');
    expect(complaintDeadlineInfo({ ...base, business_days_left: 1 })).toMatchObject({ text: 'Quedan 1 día hábil', tone: 'urgent' });
  });

  it('vence hoy o ya vencido: rojo', () => {
    expect(complaintDeadlineInfo({ ...base, business_days_left: 0 })).toMatchObject({ text: 'Vence hoy', tone: 'overdue' });
    expect(complaintDeadlineInfo({ ...base, business_days_left: -2 })).toMatchObject({
      text: 'Vencido hace 2 días hábiles', detail: 'venció el lun 19/10/2026', tone: 'overdue',
    });
  });

  it('respondido, cerrado o sin datos del backend: no muestra plazo', () => {
    expect(complaintDeadlineInfo({ ...base, status: 'respondido', business_days_left: 2 })).toBeNull();
    expect(complaintDeadlineInfo({ ...base, status: 'cerrado', business_days_left: -1 })).toBeNull();
    expect(complaintDeadlineInfo({ status: 'pendiente' })).toBeNull();
  });
});
