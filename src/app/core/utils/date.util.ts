/**
 * Datas como string `'YYYY-MM-DD'`, não `Date` nem `Timestamp`.
 *
 * O motivo é concreto: um turno de quinta-feira 22:00 às 06:00 guardado como
 * instante UTC vira sexta-feira no navegador de quem estiver em outro fuso, e a
 * família vê o dia errado. Como string, a data é o que está escrito — e a
 * comparação lexicográfica coincide com a cronológica, o que torna as queries de
 * intervalo triviais.
 *
 * Toda aritmética passa por um `Date` em UTC ao meio-dia: horário de verão nunca
 * chega a deslocar o dia.
 */

/** Uma data no formato `'YYYY-MM-DD'`. */
export type IsoDate = string;

export const TIMEZONE = 'America/Sao_Paulo';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Escritos à mão em vez de via Intl: o pt-BR do Intl devolve 'seg.' com ponto e
// a capitalização muda conforme a versão do ICU do navegador. Aqui é previsível.
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const WEEKDAY_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;
const MONTH_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Hoje em São Paulo. `en-CA` formata como `YYYY-MM-DD`, que é o formato armazenado. */
export function todayIso(): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isValidIsoDate(value: string | null | undefined): value is IsoDate {
  if (!value || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  // Rejeita 2026-02-31: a normalização do Date mudaria o valor.
  return toIsoDate(toUtcNoon(value)) === value;
}

function toUtcNoon(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/** Converte para `Date` (meio-dia UTC) quando algo externo exige um Date. */
export function isoToDate(iso: IsoDate): Date {
  return toUtcNoon(iso);
}

/** Converte um `Date` do usuário (ex.: `<input type="date">`) para `IsoDate`. */
export function dateToIso(date: Date): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const date = toUtcNoon(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/** 0 = domingo … 6 = sábado. */
export function dayOfWeek(iso: IsoDate): number {
  return toUtcNoon(iso).getUTCDay();
}

/** Domingo da semana que contém `iso` — a semana brasileira começa no domingo. */
export function startOfWeek(iso: IsoDate): IsoDate {
  return addDays(iso, -dayOfWeek(iso));
}

export function endOfWeek(iso: IsoDate): IsoDate {
  return addDays(startOfWeek(iso), 6);
}

/** `count` datas consecutivas a partir de `from`, inclusive. */
export function datesFrom(from: IsoDate, count: number): IsoDate[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

/** Os sete dias da semana que contém `iso`. */
export function weekDates(iso: IsoDate): IsoDate[] {
  return datesFrom(startOfWeek(iso), 7);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const diff = toUtcNoon(to).getTime() - toUtcNoon(from).getTime();
  return Math.round(diff / 86_400_000);
}

export function isSameOrBefore(a: IsoDate, b: IsoDate): boolean {
  return a <= b;
}

export function isToday(iso: IsoDate): boolean {
  return iso === todayIso();
}

export function isPast(iso: IsoDate): boolean {
  return iso < todayIso();
}

// ------------------------------------------------------------------ formatação

/** `'Seg'` */
export function weekdayShort(iso: IsoDate): string {
  return WEEKDAY_SHORT[dayOfWeek(iso)];
}

/** `'Segunda-feira'` */
export function weekdayLong(iso: IsoDate): string {
  return WEEKDAY_LONG[dayOfWeek(iso)];
}

/** `'22'` */
export function dayNumber(iso: IsoDate): string {
  return iso.slice(8, 10);
}

/** `'22/09'` */
export function formatDayMonth(iso: IsoDate): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** `'22/09/2026'` */
export function formatFull(iso: IsoDate): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** `'22 de setembro de 2026'` */
export function formatLong(iso: IsoDate): string {
  const month = MONTH_LONG[Number(iso.slice(5, 7)) - 1];
  return `${Number(iso.slice(8, 10))} de ${month} de ${iso.slice(0, 4)}`;
}

/** `'22/09 a 28/09'` */
export function formatRange(from: IsoDate, to: IsoDate): string {
  return `${formatDayMonth(from)} a ${formatDayMonth(to)}`;
}
