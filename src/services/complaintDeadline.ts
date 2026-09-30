// Plazo legal de respuesta de un reclamo (15 días hábiles, Ley N° 29571). El
// backend calcula el vencimiento y los días hábiles que quedan
// (store.ComplaintDeadline / BusinessDaysLeft); esto solo decide cómo mostrarlo
// en el panel admin.

export interface ComplaintDeadlineFields {
  status: string;
  deadline_label?: string;
  business_days_left?: number;
}

export type DeadlineTone = 'overdue' | 'urgent' | 'ok';

export interface DeadlineInfo {
  text: string;
  detail: string;
  tone: DeadlineTone;
  color: string;
}

// Desde cuántos días hábiles restantes (o menos) se resalta como urgente — el
// mismo umbral que los recordatorios por Discord (ComplaintReminderThreshold).
export const COMPLAINT_URGENT_DAYS = 3;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** null si el reclamo ya no corre plazo (respondido/cerrado) o no trae los datos. */
export function complaintDeadlineInfo(c: ComplaintDeadlineFields): DeadlineInfo | null {
  if (c.status !== 'pendiente' || typeof c.business_days_left !== 'number' || !c.deadline_label) return null;
  const left = c.business_days_left;
  if (left < 0) {
    return { text: `Vencido hace ${plural(-left, 'día hábil', 'días hábiles')}`, detail: `venció el ${c.deadline_label}`, tone: 'overdue', color: '#ef4444' };
  }
  if (left === 0) {
    return { text: 'Vence hoy', detail: c.deadline_label, tone: 'overdue', color: '#ef4444' };
  }
  return {
    text: `Quedan ${plural(left, 'día hábil', 'días hábiles')}`,
    detail: `vence el ${c.deadline_label}`,
    tone: left <= COMPLAINT_URGENT_DAYS ? 'urgent' : 'ok',
    color: left <= COMPLAINT_URGENT_DAYS ? '#f59e0b' : '#22c55e',
  };
}
