import { Timestamp } from '@angular/fire/firestore';

import { IsoDate } from '../utils/date.util';

/**
 * Documento em `patients/{patientId}`.
 *
 * Vive em `core` e não em `features/patients` porque é o *shared kernel* entre os
 * dois contextos: `patients` administra o paciente, `schedule` precisa do nome, do
 * leito e do fuso para montar o calendário. Deixar o tipo em uma das features
 * obrigaria a outra a importá-la.
 */
export interface Patient {
  id: string;
  name: string;
  room: string;
  /** Não aparece na tela pública. */
  hospital: string | null;
  admissionDate: IsoDate;
  /** Criador. Imutável, e o único que pode mexer na lista de admins. */
  ownerId: string;
  /** Base de toda a autorização em firestore.rules. */
  adminIds: string[];
  /** Interruptor do link público. Desligar corta o acesso sem recriar nada. */
  publicAccessEnabled: boolean;
  timezone: string;
  /**
   * Janela de revezamento do hospital e permanência mínima de cada turno. Opcionais
   * porque pacientes anteriores não os têm: leia sempre por `handoffRulesOf`.
   * Ficam legíveis pelo link público, e não são sensíveis.
   */
  handoffWindowStart?: string;
  handoffWindowEnd?: string;
  minStayMinutes?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
