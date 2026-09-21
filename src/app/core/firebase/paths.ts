/**
 * Caminhos das coleções em um lugar só.
 *
 * Um erro de digitação em `'companions'` espalhado por cinco services vira um
 * bug silencioso — o Firestore cria a coleção nova sem reclamar. Centralizar
 * transforma isso em erro de compilação.
 */

export const USERS = 'users';
export const PATIENTS = 'patients';

/**
 * Convites ficam na raiz, não em `patients/{pid}/invites`.
 *
 * O motivo é uma limitação concreta do Firestore: para mostrar "você tem um convite
 * pendente" ao usuário que acabou de entrar, é preciso procurar convites em TODOS os
 * pacientes. Isso exigiria uma collection group query, e regras escritas dentro de
 * `match /patients/{pid}/...` não autorizam esse tipo de consulta — só um curinga
 * recursivo autorizaria, e curinga recursivo foi justamente o que se evitou nas
 * rules. Na raiz, é uma query comum por `email`.
 */
export const INVITES = 'invites';

export const patientPath = (patientId: string) => `${PATIENTS}/${patientId}`;

export const familyMembersPath = (patientId: string) => `${patientPath(patientId)}/familyMembers`;
export const companionsPath = (patientId: string) => `${patientPath(patientId)}/companions`;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * `{email}_{patientId}`. Determinístico para que a regra de aceite encontre o
 * convite a partir do e-mail do token, e para que convidar duas vezes a mesma
 * pessoa sobrescreva em vez de duplicar.
 */
export const inviteId = (email: string, patientId: string) =>
  `${normalizeEmail(email)}_${patientId}`;

export const invitePath = (email: string, patientId: string) =>
  `${INVITES}/${inviteId(email, patientId)}`;
