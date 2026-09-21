import { HandoffRules } from '../../../core/patient/handoff-rules';
import { IsoDate, daysBetween, isValidIsoDate } from '../../../core/utils/date.util';
import {
  MINUTES_IN_DAY,
  Time,
  durationMinutes,
  formatMinutes,
  isValidTime,
  minutesToTime,
  timeToMinutes,
} from '../../../core/utils/time.util';

/** O que a validação precisa saber de um turno, novo ou já salvo. */
export interface ShiftCandidate {
  /** Presente ao editar: o turno não conflita consigo mesmo. */
  id?: string;
  date: IsoDate;
  startTime: Time;
  endTime: Time;
}

export type ShiftIssue = 'invalid-time' | 'outside-window' | 'too-short' | 'overlap';

/** Referência arbitrária: só as diferenças entre datas importam. */
const EPOCH: IsoDate = '2000-01-01';

/**
 * Intervalo em minutos absolutos, atravessando a meia-noite quando o turno vira a
 * noite. É isto que permite comparar turnos de datas diferentes.
 */
export function absoluteRange(shift: ShiftCandidate): { start: number; end: number } {
  const start = daysBetween(EPOCH, shift.date) * MINUTES_IN_DAY + timeToMinutes(shift.startTime);
  return { start, end: start + durationMinutes(shift.startTime, shift.endTime) };
}

/**
 * Regras do hospital aplicadas a um turno. Lista vazia significa que pode salvar.
 *
 * Cada turno é julgado sozinho, contra a janela e contra os vizinhos: editar um
 * turno nunca invalida os que já estavam salvos. `start == end` vale 24 horas.
 */
export function validateShift(
  candidate: ShiftCandidate,
  existing: readonly ShiftCandidate[],
  rules: HandoffRules,
): ShiftIssue[] {
  if (
    !isValidIsoDate(candidate.date) ||
    !isValidTime(candidate.startTime) ||
    !isValidTime(candidate.endTime)
  ) {
    return ['invalid-time'];
  }

  const issues: ShiftIssue[] = [];

  if (
    !isInsideWindow(candidate.startTime, rules) ||
    !isInsideWindow(candidate.endTime, rules)
  ) {
    issues.push('outside-window');
  }

  if (durationMinutes(candidate.startTime, candidate.endTime) < rules.minStayMinutes) {
    issues.push('too-short');
  }

  const range = absoluteRange(candidate);
  const collides = existing.some((other) => {
    if (other.id !== undefined && other.id === candidate.id) {
      return false;
    }
    const otherRange = absoluteRange(other);
    // Encostar (fim de um == início do outro) é a troca de turno: não é conflito.
    return range.start < otherRange.end && otherRange.start < range.end;
  });
  if (collides) {
    issues.push('overlap');
  }

  return issues;
}

function isInsideWindow(time: Time, rules: HandoffRules): boolean {
  const minutes = timeToMinutes(time);
  return minutes >= timeToMinutes(rules.windowStart) && minutes <= timeToMinutes(rules.windowEnd);
}

/**
 * Primeira hora de saída que respeita a permanência mínima e cai na janela, para
 * dizer ao responsável "o fim pode ser a partir de 15:00". `null` se nenhuma serve
 * (início fora da janela, por exemplo).
 */
export function earliestValidEnd(start: Time, rules: HandoffRules): Time | null {
  if (!isValidTime(start)) {
    return null;
  }

  const startMinutes = timeToMinutes(start);
  for (let offset = rules.minStayMinutes; offset <= MINUTES_IN_DAY; offset++) {
    const candidate = minutesToTime(startMinutes + offset);
    if (isInsideWindow(candidate, rules)) {
      return candidate;
    }
  }

  return null;
}

/** Mensagem em português para cada problema, já com os números do hospital. */
export function describeShiftIssues(
  issues: readonly ShiftIssue[],
  candidate: ShiftCandidate,
  rules: HandoffRules,
): string[] {
  return issues.map((issue) => {
    switch (issue) {
      case 'invalid-time':
        return 'Informe a data e os horários de início e fim.';
      case 'outside-window':
        return `A troca só pode ser entre ${rules.windowStart} e ${rules.windowEnd}.`;
      case 'too-short': {
        const minimum = formatMinutes(rules.minStayMinutes);
        const earliest = earliestValidEnd(candidate.startTime, rules);
        return earliest
          ? `Cada acompanhante fica pelo menos ${minimum}. O fim pode ser a partir de ${earliest}.`
          : `Cada acompanhante fica pelo menos ${minimum}.`;
      }
      case 'overlap':
        return 'Este horário se sobrepõe a outro turno.';
    }
  });
}
