import { after, before, beforeEach, describe, it } from 'node:test';

import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

import {
  CO_ADMIN,
  FieldValue,
  OWNER,
  PUBLIC_PATIENT,
  as,
  createTestEnvironment,
  seed,
} from './helpers.mjs';

/**
 * Os outros arquivos testam as regras com payloads escritos à mão. Este testa os
 * payloads que os services realmente escrevem.
 *
 * A diferença importa: uma regra pode estar correta em tese e mesmo assim recusar
 * o que o app manda, por um campo a mais ou a menos. Sem isto, o erro só apareceria
 * na primeira vez que alguém tentasse usar o sistema de verdade.
 *
 * Se algum destes falhar, o service correspondente e a regra saíram de sincronia.
 */
describe('payloads dos services contra as rules', () => {
  let testEnv;

  before(async () => {
    testEnv = await createTestEnvironment();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seed(testEnv);
  });

  it('PatientsService.create', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.collection('patients').add({
        name: 'Paciente Novo',
        room: '500',
        hospital: null,
        admissionDate: '2026-09-21',
        ownerId: CO_ADMIN.uid,
        adminIds: [CO_ADMIN.uid],
        publicAccessEnabled: true,
        timezone: 'America/Sao_Paulo',
        handoffWindowStart: '06:00',
        handoffWindowEnd: '21:00',
        minStayMinutes: 360,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('PatientsService.create recusa quem tenta nascer admin de si e de outro', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertFails(
      db.collection('patients').add({
        name: 'Paciente Novo',
        room: '500',
        hospital: null,
        admissionDate: '2026-09-21',
        ownerId: CO_ADMIN.uid,
        adminIds: [CO_ADMIN.uid, OWNER.uid],
        publicAccessEnabled: true,
        timezone: 'America/Sao_Paulo',
      }),
    );
  });

  it('PatientsService.update e setPublicAccess', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.doc(`patients/${PUBLIC_PATIENT}`).update({
        name: 'Dona Maria Aparecida',
        room: '410-A',
        hospital: 'Hospital Central',
        admissionDate: '2026-09-18',
        handoffWindowStart: '07:00',
        handoffWindowEnd: '20:00',
        minStayMinutes: 480,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await assertSucceeds(
      db.doc(`patients/${PUBLIC_PATIENT}`).update({
        publicAccessEnabled: false,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('PatientsService.removeAdmin só funciona para o dono', async () => {
    const ownerDb = as(testEnv, OWNER);
    const coAdminDb = as(testEnv, CO_ADMIN);

    // Um admin comum não mexe na lista de responsáveis.
    await assertFails(
      coAdminDb.doc(`patients/${PUBLIC_PATIENT}`).update({
        adminIds: [OWNER.uid],
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await assertSucceeds(
      ownerDb.doc(`patients/${PUBLIC_PATIENT}`).update({
        adminIds: [OWNER.uid],
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('CompanionsService.create — turno com o acompanhante já definido', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.collection(`patients/${PUBLIC_PATIENT}/companions`).add({
        date: '2026-10-01',
        startTime: '21:00',
        endTime: '06:00',
        familyMemberId: 'member1',
        familyMemberName: 'Tia Marta',
        note: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: CO_ADMIN.uid,
      }),
    );
  });

  it('CompanionsService.changeMember — troca quem faz o turno', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.doc(`patients/${PUBLIC_PATIENT}/companions/shift1`).update({
        familyMemberId: 'member2',
        familyMemberName: 'Primo Léo',
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: CO_ADMIN.uid,
      }),
    );
  });

  it('CompanionsService.updateTimes — muda a data e o horário só daquele turno', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.doc(`patients/${PUBLIC_PATIENT}/companions/shift1`).update({
        date: '2026-09-25',
        startTime: '14:00',
        endTime: '21:00',
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: CO_ADMIN.uid,
      }),
    );
  });

  it('FamilyMembersService.remove — apaga os turnos do familiar e depois o cadastro', async () => {
    const db = as(testEnv, CO_ADMIN);
    const batch = db.batch();

    batch.delete(db.doc(`patients/${PUBLIC_PATIENT}/companions/shift1`));
    await assertSucceeds(batch.commit());

    await assertSucceeds(db.doc(`patients/${PUBLIC_PATIENT}/familyMembers/member1`).delete());
  });

  it('FamilyMembersService.create e rename com propagação', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.collection(`patients/${PUBLIC_PATIENT}/familyMembers`).add({
        name: 'Primo Léo',
        phone: null,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await assertSucceeds(
      db.doc(`patients/${PUBLIC_PATIENT}/familyMembers/member1`).update({
        name: 'Marta',
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    // A propagação do nome para os turnos já escalados.
    await assertSucceeds(
      db.doc(`patients/${PUBLIC_PATIENT}/companions/shift1`).update({
        familyMemberName: 'Marta',
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('InvitesService.invite', async () => {
    const db = as(testEnv, OWNER);
    const email = 'tio@example.com';

    await assertSucceeds(
      db.doc(`invites/${email}_${PUBLIC_PATIENT}`).set({
        email,
        patientId: PUBLIC_PATIENT,
        patientName: 'Dona Maria',
        invitedBy: OWNER.uid,
        invitedByName: 'Dono',
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        acceptedAt: null,
        acceptedBy: null,
      }),
    );
  });

  it('AuthService.upsertUserDocument', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.doc(`users/${CO_ADMIN.uid}`).set({
        name: 'Co Admin',
        email: CO_ADMIN.email,
        photoURL: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    await assertFails(
      db.doc(`users/${OWNER.uid}`).set({
        name: 'Sequestro de perfil',
        email: OWNER.email,
        photoURL: null,
      }),
    );
  });
});
