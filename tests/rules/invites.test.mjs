import { after, before, beforeEach, describe, it } from 'node:test';

import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

import {
  FieldValue,
  INVITEE,
  OWNER,
  PRIVATE_PATIENT,
  PUBLIC_PATIENT,
  STRANGER,
  as,
  asGuest,
  createTestEnvironment,
  seed,
} from './helpers.mjs';

/**
 * O aceite de convite é a única escrita do sistema feita por quem ainda NÃO é
 * admin. É também a regra mais fácil de afrouxar demais sem perceber — daí a
 * quantidade de testes negativos aqui.
 */
describe('convites e virada para admin', () => {
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

  it('o convidado enxerga o próprio convite', async () => {
    const db = as(testEnv, INVITEE);

    await assertSucceeds(
      db.collection('invites').where('email', '==', INVITEE.email).where('status', '==', 'pending').get(),
    );
  });

  it('um terceiro NÃO enxerga convites alheios', async () => {
    const db = as(testEnv, STRANGER);
    await assertFails(db.collection('invites').where('email', '==', INVITEE.email).get());
  });

  it('com convite pendente, o convidado vira admin', async () => {
    const db = as(testEnv, INVITEE);

    await assertSucceeds(
      db.doc(`patients/${PRIVATE_PATIENT}`).update({
        adminIds: FieldValue.arrayUnion(INVITEE.uid),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('na mesma escrita, o convidado NÃO consegue mexer em outro campo', async () => {
    const db = as(testEnv, INVITEE);

    await assertFails(
      db.doc(`patients/${PRIVATE_PATIENT}`).update({
        adminIds: FieldValue.arrayUnion(INVITEE.uid),
        room: 'invadido',
      }),
    );
  });

  it('o convidado NÃO consegue assumir o lugar de dono', async () => {
    const db = as(testEnv, INVITEE);

    await assertFails(
      db.doc(`patients/${PRIVATE_PATIENT}`).update({
        adminIds: FieldValue.arrayUnion(INVITEE.uid),
        ownerId: INVITEE.uid,
      }),
    );
  });

  it('o convidado NÃO consegue entrar num paciente para o qual não foi convidado', async () => {
    const db = as(testEnv, INVITEE);

    await assertFails(
      db.doc(`patients/${PUBLIC_PATIENT}`).update({
        adminIds: FieldValue.arrayUnion(INVITEE.uid),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('sem convite nenhum, ninguém se adiciona como admin', async () => {
    const db = as(testEnv, STRANGER);

    await assertFails(
      db.doc(`patients/${PRIVATE_PATIENT}`).update({
        adminIds: FieldValue.arrayUnion(STRANGER.uid),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('o convidado NÃO adiciona um terceiro junto consigo', async () => {
    const db = as(testEnv, INVITEE);

    await assertFails(
      db.doc(`patients/${PRIVATE_PATIENT}`).update({
        adminIds: FieldValue.arrayUnion(INVITEE.uid, STRANGER.uid),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });

  it('o convidado marca o próprio convite como aceito', async () => {
    const db = as(testEnv, INVITEE);

    await assertSucceeds(
      db.doc(`invites/${INVITEE.email}_${PRIVATE_PATIENT}`).update({
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
        acceptedBy: INVITEE.uid,
      }),
    );
  });

  it('o convidado NÃO marca o convite em nome de outra pessoa', async () => {
    const db = as(testEnv, INVITEE);

    await assertFails(
      db.doc(`invites/${INVITEE.email}_${PRIVATE_PATIENT}`).update({
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
        acceptedBy: STRANGER.uid,
      }),
    );
  });

  it('só admin cria convite, e o ID precisa casar com e-mail e paciente', async () => {
    const ownerDb = as(testEnv, OWNER);

    await assertSucceeds(
      ownerDb.doc(`invites/${STRANGER.email}_${PUBLIC_PATIENT}`).set({
        email: STRANGER.email,
        patientId: PUBLIC_PATIENT,
        patientName: 'Dona Maria',
        invitedBy: OWNER.uid,
        invitedByName: 'Dono',
        status: 'pending',
        acceptedAt: null,
        acceptedBy: null,
      }),
    );

    // ID que não corresponde ao e-mail: abriria caminho para forjar convites.
    await assertFails(
      ownerDb.doc(`invites/qualquer-coisa`).set({
        email: STRANGER.email,
        patientId: PUBLIC_PATIENT,
        patientName: 'Dona Maria',
        invitedBy: OWNER.uid,
        invitedByName: 'Dono',
        status: 'pending',
      }),
    );
  });

  it('quem não é admin NÃO cria convite', async () => {
    const db = as(testEnv, STRANGER);

    await assertFails(
      db.doc(`invites/${STRANGER.email}_${PUBLIC_PATIENT}`).set({
        email: STRANGER.email,
        patientId: PUBLIC_PATIENT,
        patientName: 'Dona Maria',
        invitedBy: STRANGER.uid,
        invitedByName: 'Invasor',
        status: 'pending',
      }),
    );
  });

  it('deslogado não toca em convites', async () => {
    const db = asGuest(testEnv);

    await assertFails(db.doc(`invites/${INVITEE.email}_${PRIVATE_PATIENT}`).get());
    await assertFails(
      db.doc(`invites/${INVITEE.email}_${PRIVATE_PATIENT}`).update({ status: 'accepted' }),
    );
  });
});
