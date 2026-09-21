import { IsoDate, addDays } from '../../../core/utils/date.util';
import { MINUTES_IN_DAY, crossesMidnight, durationMinutes, timeToMinutes } from '../../../core/utils/time.util';
import { Companion } from '../models/companion.model';

/** Um turno (ou o pedaço dele que cai neste dia) já posicionado na coluna, em %. */
export interface PositionedCompanion {
  companion: Companion;
  /** Distância do topo da coluna, em %. */
  top: number;
  /** Altura, em %. */
  height: number;
  /** Faixa horizontal, em %, para turnos que se sobrepõem. */
  left: number;
  width: number;
  /** Termina no dia seguinte — o card mostra um indicador. */
  overnight: boolean;
  /** É a continuação de um turno que começou na véspera. */
  continuesFromPrevious: boolean;
}

/** Trecho do dia sem ninguém. É o único jeito de o sistema falar em "vago". */
export interface VacantGap {
  date: IsoDate;
  startMinutes: number;
  endMinutes: number;
  top: number;
  height: number;
}

export interface DayLayout {
  date: IsoDate;
  items: PositionedCompanion[];
  gaps: VacantGap[];
}

/** A faixa de horas desenhada no eixo lateral. */
export interface HourWindow {
  startMinutes: number;
  endMinutes: number;
  /** Rótulos de hora cheia dentro da faixa. */
  hours: number[];
}

/**
 * Quanta largura cada coluna do calendário tem, o que decide o que cabe no card.
 * `wide` é um dia só, `regular` são três e `compact` é a semana: sete colunas de
 * cerca de 48px num celular, onde só cabem nome e horários curtos.
 */
export type ColumnDensity = 'wide' | 'regular' | 'compact';

export function densityOf(dayCount: number): ColumnDensity {
  if (dayCount <= 1) {
    return 'wide';
  }
  return dayCount <= 3 ? 'regular' : 'compact';
}

/** O calendário mostra o dia inteiro: a cobertura é contínua, inclusive à noite. */
export const FULL_DAY_WINDOW: HourWindow = {
  startMinutes: 0,
  endMinutes: MINUTES_IN_DAY,
  hours: Array.from({ length: 25 }, (_, hour) => hour),
};

/** De onde vem a noção de "já passou" e "antes da internação" ao decidir o que é vago. */
export interface VacancyContext {
  admissionDate: IsoDate;
  today: IsoDate;
  /** Minutos desde a meia-noite, no fuso do paciente. */
  nowMinutes: number;
}

interface Segment {
  companion: Companion;
  start: number;
  end: number;
  overnight: boolean;
  continuesFromPrevious: boolean;
}

/**
 * Posiciona os turnos de um dia e calcula as lacunas.
 *
 * `companions` deve trazer também os turnos da véspera: um que começa às 21:00 e
 * termina às 06:00 ocupa 00:00–06:00 deste dia, e sem ele essas horas apareceriam
 * como vagas. Turnos que não tocam o dia são ignorados.
 *
 * Só vale como "vago" o que ainda pode ser preenchido: não se pinta de vago o que
 * veio antes da internação nem o que já passou.
 */
export function layoutDay(
  date: IsoDate,
  companions: readonly Companion[],
  window: HourWindow,
  context: VacancyContext,
): DayLayout {
  const segments = segmentsOf(date, companions);

  const span = Math.max(window.endMinutes - window.startMinutes, 1);
  const lanes = assignLanes(segments);
  const laneCount = Math.max(...lanes.values(), 0) + 1;

  const items = segments.map((segment) => {
    const top = clamp(((segment.start - window.startMinutes) / span) * 100, 0, 100);
    const height = ((segment.end - segment.start) / span) * 100;
    const lane = lanes.get(segment.companion.id) ?? 0;

    return {
      companion: segment.companion,
      // Clampeado: um turno fora da faixa visível não pode vazar da coluna.
      top,
      height: clamp(height, 0, 100 - top),
      left: (lane / laneCount) * 100,
      width: 100 / laneCount,
      overnight: segment.overnight,
      continuesFromPrevious: segment.continuesFromPrevious,
    };
  });

  const gaps = vacantGaps(date, segments, context).map((gap) => ({
    date,
    startMinutes: gap.start,
    endMinutes: gap.end,
    top: ((gap.start - window.startMinutes) / span) * 100,
    height: ((gap.end - gap.start) / span) * 100,
  }));

  return { date, items, gaps };
}

/** Os pedaços de turno que caem em `date`, do começo do dia ao fim. */
function segmentsOf(date: IsoDate, companions: readonly Companion[]): Segment[] {
  const yesterday = addDays(date, -1);
  const segments: Segment[] = [];

  for (const companion of companions) {
    const start = timeToMinutes(companion.startTime);
    const length = durationMinutes(companion.startTime, companion.endTime);
    const overnight = crossesMidnight(companion.startTime, companion.endTime);

    if (companion.date === date) {
      // Turno que vira a noite é desenhado até a meia-noite; o resto vai para o dia seguinte.
      segments.push({
        companion,
        start,
        end: Math.min(start + length, MINUTES_IN_DAY),
        overnight,
        continuesFromPrevious: false,
      });
    } else if (companion.date === yesterday) {
      const tail = start + length - MINUTES_IN_DAY;
      if (tail > 0) {
        segments.push({
          companion,
          start: 0,
          end: tail,
          overnight: false,
          continuesFromPrevious: true,
        });
      }
    }
  }

  return segments.sort((a, b) => a.start - b.start);
}

/** O complemento dos turnos em `[0, 1440)`, sem o que já passou nem o anterior à internação. */
function vacantGaps(
  date: IsoDate,
  segments: readonly Segment[],
  context: VacancyContext,
): { start: number; end: number }[] {
  if (date < context.admissionDate || date < context.today) {
    return [];
  }

  // Hoje, só o que ainda está por vir pode ser preenchido.
  const floor = date === context.today ? context.nowMinutes : 0;

  const gaps: { start: number; end: number }[] = [];
  let cursor = floor;

  for (const segment of segments) {
    if (segment.start > cursor) {
      gaps.push({ start: cursor, end: segment.start });
    }
    cursor = Math.max(cursor, segment.end);
  }

  if (cursor < MINUTES_IN_DAY) {
    gaps.push({ start: cursor, end: MINUTES_IN_DAY });
  }

  return gaps;
}

/**
 * Distribui os trechos em faixas verticais, reaproveitando a primeira livre.
 *
 * Com a validação de sobreposição isto quase nunca acontece, mas dois responsáveis
 * criando turnos ao mesmo tempo podem gerar o conflito, e dois cards empilhados um
 * sobre o outro esconderiam informação.
 */
function assignLanes(segments: readonly Segment[]): Map<string, number> {
  const lanes = new Map<string, number>();
  const laneEnds: number[] = [];

  for (const segment of segments) {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= segment.start);
    if (lane === -1) {
      lane = laneEnds.length;
    }

    laneEnds[lane] = segment.end;
    lanes.set(segment.companion.id, lane);
  }

  return lanes;
}

/** Posição vertical de um instante dentro da faixa, em % — usado na linha do "agora". */
export function positionOf(minutes: number, window: HourWindow): number | null {
  if (minutes < window.startMinutes || minutes > window.endMinutes) {
    return null;
  }

  const span = Math.max(window.endMinutes - window.startMinutes, 1);
  return ((minutes - window.startMinutes) / span) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
