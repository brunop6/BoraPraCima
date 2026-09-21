/**
 * Horas como string `'HH:mm'`, pelo mesmo motivo das datas em `date.util.ts`:
 * o que o hospital informou é o que fica guardado.
 *
 * Turnos que viram a noite (19:00 às 07:00) são comuns em enfermaria. A
 * convenção aqui é: quando `end <= start`, o turno termina no dia seguinte.
 */

/** Uma hora no formato `'HH:mm'`. */
export type Time = string;

export const MINUTES_IN_DAY = 1440;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string | null | undefined): value is Time {
  return !!value && TIME_PATTERN.test(value);
}

export function timeToMinutes(time: Time): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): Time {
  const normalized = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(normalized / 60);
  return `${pad(hours)}:${pad(normalized % 60)}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** O turno atravessa a meia-noite e termina no dia seguinte. */
export function crossesMidnight(start: Time, end: Time): boolean {
  return timeToMinutes(end) <= timeToMinutes(start);
}

export function durationMinutes(start: Time, end: Time): number {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  return to > from ? to - from : MINUTES_IN_DAY - from + to;
}

/** `'2h30'`, `'45min'`, `'12h'` — para o resumo do turno. */
export function formatDuration(start: Time, end: Time): string {
  return formatMinutes(durationMinutes(start, end));
}

/** Mesmo formato de `formatDuration`, a partir de uma quantidade de minutos. */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }
  return minutes === 0 ? `${hours}h` : `${hours}h${pad(minutes)}`;
}

/** `'19:00 – 07:00'` (travessão, não hífen: é um intervalo). */
export function formatTimeRange(start: Time, end: Time): string {
  return `${start} – ${end}`;
}

export function compareTimes(a: Time, b: Time): number {
  return timeToMinutes(a) - timeToMinutes(b);
}

/** Hora atual em minutos no fuso de São Paulo — posiciona a linha do "agora". */
export function nowMinutes(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  return timeToMinutes(parts);
}
