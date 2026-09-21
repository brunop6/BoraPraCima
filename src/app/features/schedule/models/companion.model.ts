import { Timestamp } from '@angular/fire/firestore';

import { IsoDate } from '../../../core/utils/date.util';
import { Time } from '../../../core/utils/time.util';

/**
 * Documento em `patients/{pid}/companions/{id}`: um turno de um acompanhante.
 *
 * Os turnos são a única fonte de cobertura. Não existe turno "vago" armazenado:
 * vago é a lacuna entre dois turnos, calculada em `day-layout.util.ts`.
 *
 * `date` é o dia em que o turno COMEÇA. Quando `endTime <= startTime` ele termina
 * no dia seguinte, e o calendário desenha a continuação na coluna daquele dia.
 * Início e fim precisam cair dentro da janela de revezamento do paciente, e a
 * duração precisa respeitar a permanência mínima (`shift-rules.util.ts`).
 */
export interface Companion {
  id: string;
  date: IsoDate;
  startTime: Time;
  endTime: Time;
  familyMemberId: string;
  /**
   * Desnormalizado de propósito: a tela pública não pode ler `familyMembers`
   * (que guarda telefone), então o nome precisa viajar junto com o turno.
   * Mantido em dia por `FamilyMembersService.rename`.
   */
  familyMemberName: string;
  note: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}
