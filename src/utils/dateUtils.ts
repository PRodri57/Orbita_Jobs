export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MONTHS_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const DAYS_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Returns today's date in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD to "14 Oct 2026"
 */
export function formatDateES(dateStr?: string): string {
  if (!dateStr) return 'Sin fecha';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day} ${MONTHS_SHORT_ES[monthIndex] || ''} ${year}`;
}

/**
 * Formats YYYY-MM-DD to "Lunes, 14 de Octubre de 2026"
 */
export function formatFullDateES(dateStr?: string): string {
  if (!dateStr) return 'Sin fecha';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dateObj.getDay()];
  return `${dayName}, ${d} de ${MONTHS_ES[m - 1]} de ${y}`;
}

/**
 * Calculates days remaining from today to target date:
 * > 0 : in the future
 * = 0 : today
 * < 0 : past / overdue
 */
export function getDaysDifference(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const target = new Date(ty, tm - 1, td);
  target.setHours(0, 0, 0, 0);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns a human-friendly relative label in Spanish
 */
export function getRelativeDateLabel(targetDateStr: string): { label: string; status: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future' } {
  const diff = getDaysDifference(targetDateStr);
  if (diff < 0) {
    const abs = Math.abs(diff);
    return {
      label: abs === 1 ? 'Venció ayer' : `Venció hace ${abs} días`,
      status: 'overdue'
    };
  }
  if (diff === 0) {
    return { label: 'Hoy', status: 'today' };
  }
  if (diff === 1) {
    return { label: 'Mañana', status: 'tomorrow' };
  }
  if (diff <= 5) {
    return { label: `En ${diff} días`, status: 'soon' };
  }
  return { label: `En ${diff} días`, status: 'future' };
}
