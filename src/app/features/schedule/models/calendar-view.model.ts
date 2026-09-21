/** As visualizações que o seletor oferece. */
export type CalendarView = 'day' | 'three-days' | 'week';

export interface CalendarViewOption {
  id: CalendarView;
  label: string;
  /** Quantos dias a janela mostra, e quantos as setas andam de uma vez. */
  days: number;
  /** O passo das setas por extenso, para o nome acessível: "Uma semana antes". */
  step: string;
}

export const CALENDAR_VIEWS: readonly CalendarViewOption[] = [
  { id: 'day', label: 'Dia', days: 1, step: 'Um dia' },
  // Três dias é o que cabe no celular sem abreviar os nomes: é a visão de partida.
  { id: 'three-days', label: '3 dias', days: 3, step: 'Três dias' },
  { id: 'week', label: 'Semana', days: 7, step: 'Uma semana' },
];

/** A visão de quem nunca escolheu uma, ou cuja escolha guardada não vale mais. */
export const DEFAULT_VIEW: CalendarView = 'three-days';

export function calendarViewOf(view: CalendarView): CalendarViewOption {
  return CALENDAR_VIEWS.find((option) => option.id === view) ?? CALENDAR_VIEWS[1];
}

/** Estreita um texto qualquer, como o lido do storage, para uma visão que existe. */
export function isCalendarView(value: unknown): value is CalendarView {
  return CALENDAR_VIEWS.some((option) => option.id === value);
}
