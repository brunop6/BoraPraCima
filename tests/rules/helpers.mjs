import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

/**
 * `@firebase/rules-unit-testing` entrega contextos com a API compat do Firestore,
 * então `FieldValue` vem daqui — e não de `firebase/firestore` nem de
 * `firebase-admin`, que não funcionariam com esses contextos.
 */
export const FieldValue = firebase.firestore.FieldValue;

const RULES_PATH = fileURLToPath(new URL('../../firestore.rules', import.meta.url));

export const PROJECT_ID = 'bora-pra-cima-rules-test';

export const OWNER = { uid: 'owner-uid', email: 'owner@example.com' };
export const CO_ADMIN = { uid: 'coadmin-uid', email: 'coadmin@example.com' };
export const INVITEE = { uid: 'invitee-uid', email: 'invitee@example.com' };
export const STRANGER = { uid: 'stranger-uid', email: 'stranger@example.com' };

export const PUBLIC_PATIENT = 'patient-public';
export const PRIVATE_PATIENT = 'patient-private';

export async function createTestEnvironment() {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

/** Autentica com uid E e-mail: as regras de convite dependem do e-mail do token. */
export function as(testEnv, user) {
  return testEnv.authenticatedContext(user.uid, { email: user.email }).firestore();
}

export function asGuest(testEnv) {
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Popula o banco ignorando as regras.
 *
 * Dois pacientes: um com o link público ligado, outro desligado. É a diferença
 * que quase todos os testes exercitam.
 */
export async function seed(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await db.doc(`patients/${PUBLIC_PATIENT}`).set({
      name: 'Dona Maria',
      room: '312-B',
      hospital: 'Hospital Central',
      admissionDate: '2026-09-18',
      ownerId: OWNER.uid,
      adminIds: [OWNER.uid, CO_ADMIN.uid],
      publicAccessEnabled: true,
      timezone: 'America/Sao_Paulo',
      handoffWindowStart: '06:00',
      handoffWindowEnd: '21:00',
      minStayMinutes: 360,
    });

    await db.doc(`patients/${PRIVATE_PATIENT}`).set({
      name: 'Seu João',
      room: '104',
      hospital: null,
      admissionDate: '2026-09-19',
      ownerId: OWNER.uid,
      adminIds: [OWNER.uid],
      publicAccessEnabled: false,
      timezone: 'America/Sao_Paulo',
      handoffWindowStart: '06:00',
      handoffWindowEnd: '21:00',
      minStayMinutes: 360,
    });

    for (const patientId of [PUBLIC_PATIENT, PRIVATE_PATIENT]) {
      await db.doc(`patients/${patientId}/companions/shift1`).set({
        date: '2026-09-24',
        startTime: '15:00',
        endTime: '21:00',
        familyMemberId: 'member1',
        familyMemberName: 'Tia Marta',
        familyMemberColor: '#1565c0',
        familyMemberTransparency: 40,
        note: null,
      });

      await db.doc(`patients/${patientId}/familyMembers/member1`).set({
        name: 'Tia Marta',
        phone: '11999999999',
        color: '#1565c0',
        transparency: 40,
        active: true,
      });
    }

    // Convite pendente do dono para INVITEE, no paciente privado.
    await db.doc(`invites/${INVITEE.email}_${PRIVATE_PATIENT}`).set({
      email: INVITEE.email,
      patientId: PRIVATE_PATIENT,
      patientName: 'Seu João',
      invitedBy: OWNER.uid,
      invitedByName: 'Dono',
      status: 'pending',
      acceptedAt: null,
      acceptedBy: null,
    });
  });
}
