import { Timestamp } from '@angular/fire/firestore';

export type InviteStatus = 'pending' | 'accepted' | 'revoked';

/**
 * Documento em `invites/{email}_{patientId}` — coleção raiz, não subcollection do
 * paciente. O porquê está em `core/firebase/paths.ts`: só na raiz dá para listar os
 * convites de uma pessoa sem collection group query.
 *
 * O ID é determinístico por dois motivos: a regra de aceite precisa localizar o
 * convite a partir de `request.auth.token.email`, sem ID aleatório, e convidar a
 * mesma pessoa duas vezes sobrescreve em vez de duplicar.
 */
export interface Invite {
  id: string;
  /** Sempre em minúsculas — é comparado com o e-mail do token nas rules. */
  email: string;
  patientId: string;
  /** Desnormalizado: "Você foi convidado para o calendário de Dona Maria". */
  patientName: string;
  invitedBy: string;
  invitedByName: string;
  status: InviteStatus;
  createdAt?: Timestamp;
  acceptedAt?: Timestamp | null;
  acceptedBy?: string | null;
}
