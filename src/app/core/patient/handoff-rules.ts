import { Time, isValidTime, timeToMinutes } from '../utils/time.util';
import { Patient } from './patient.model';

/**
 * Regras de revezamento do hospital: a troca de acompanhante só acontece dentro
 * de uma janela, e quem sai precisa ter ficado um mínimo de tempo corrido.
 *
 * Vivem em `core/patient` porque `patients` as edita (cadastro e ajustes) e
 * `schedule` as aplica nos turnos, e as duas features não se importam.
 */
export interface HandoffRules {
  /** Primeira hora em que um turno pode começar ou terminar. */
  windowStart: Time;
  /** Última hora em que um turno pode começar ou terminar. Sempre depois do início. */
  windowEnd: Time;
  /** Permanência mínima de cada turno, em minutos corridos. */
  minStayMinutes: number;
}

export const DEFAULT_HANDOFF_RULES: HandoffRules = {
  windowStart: '06:00',
  windowEnd: '21:00',
  minStayMinutes: 360,
};

export const MIN_STAY_LIMITS = { min: 30, max: 1440 } as const;

type PatientHandoffFields = Pick<
  Patient,
  'handoffWindowStart' | 'handoffWindowEnd' | 'minStayMinutes'
>;

/** Pacientes antigos não têm os campos: caem nos padrões em vez de quebrar. */
export function handoffRulesOf(patient: Partial<PatientHandoffFields>): HandoffRules {
  return {
    windowStart: patient.handoffWindowStart ?? DEFAULT_HANDOFF_RULES.windowStart,
    windowEnd: patient.handoffWindowEnd ?? DEFAULT_HANDOFF_RULES.windowEnd,
    minStayMinutes: patient.minStayMinutes ?? DEFAULT_HANDOFF_RULES.minStayMinutes,
  };
}

/** Campos como o documento do paciente os guarda. */
export function toPatientFields(rules: HandoffRules): Required<PatientHandoffFields> {
  return {
    handoffWindowStart: rules.windowStart,
    handoffWindowEnd: rules.windowEnd,
    minStayMinutes: rules.minStayMinutes,
  };
}

/** Mensagens em português; lista vazia significa que as regras são válidas. */
export function validateHandoffRules(rules: HandoffRules): string[] {
  const issues: string[] = [];

  if (!isValidTime(rules.windowStart) || !isValidTime(rules.windowEnd)) {
    issues.push('Informe a janela no formato HH:mm.');
  } else if (timeToMinutes(rules.windowStart) >= timeToMinutes(rules.windowEnd)) {
    issues.push('O fim da janela precisa ser depois do início.');
  }

  const { min, max } = MIN_STAY_LIMITS;
  if (
    !Number.isInteger(rules.minStayMinutes) ||
    rules.minStayMinutes < min ||
    rules.minStayMinutes > max
  ) {
    issues.push(`A permanência mínima precisa estar entre ${min} minutos e 24 horas.`);
  }

  return issues;
}
