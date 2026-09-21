import { Timestamp } from '@angular/fire/firestore';

/**
 * Documento em `patients/{pid}/familyMembers/{id}`.
 *
 * É um doc próprio, e não um item de array no paciente, porque o nome é referenciado
 * por dezenas de turnos: com ID estável, corrigir "Tia Marta" para "Marta" é uma
 * edição só. E por guardar telefone, a coleção nunca é lida pelo link público — a
 * tela pública usa `Companion.familyMemberName`.
 *
 * Importante: um familiar NÃO é um usuário do sistema. A maior parte da família não
 * vai criar conta; só precisa aparecer no calendário.
 */
export interface FamilyMember {
  id: string;
  name: string;
  /** Opcional, só para os admins. Nunca sai no link público. */
  phone: string | null;
  /** Desativado some das opções de escala, sem apagar o histórico. */
  active: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
