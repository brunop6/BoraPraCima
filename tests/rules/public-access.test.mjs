import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

import {
  CO_ADMIN,
  PRIVATE_PATIENT,
  PUBLIC_PATIENT,
  STRANGER,
  as,
  asGuest,
  createTestEnvironment,
  seed,
} from './helpers.mjs';

/**
 * O link público é a superfície mais exposta do sistema: circula no WhatsApp e
 * qualquer pessoa pode abri-lo. Estes testes são a única defesa automatizada
 * contra vazar dado demais ou deixar escrever por ali.
 */
describe('acesso público pelo link', () => {
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

  it('deslogado lê o paciente quando o link está ativo', async () => {
    const db = asGuest(testEnv);
    await assertSucceeds(db.doc(`patients/${PUBLIC_PATIENT}`).get());
  });

  it('deslogado lê os turnos quando o link está ativo', async () => {
    const db = asGuest(testEnv);
    await assertSucceeds(db.collection(`patients/${PUBLIC_PATIENT}/companions`).get());
  });

  it('deslogado NÃO lê o paciente quando o link está desligado', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.doc(`patients/${PRIVATE_PATIENT}`).get());
  });

  it('deslogado NÃO lê os turnos quando o link está desligado', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.collection(`patients/${PRIVATE_PATIENT}/companions`).get());
  });

  /**
   * `familyMembers` guarda telefone. Se um curinga recursivo voltar às rules por
   * descuido, este teste é o que avisa.
   */
  it('deslogado NÃO lê familyMembers, nem no paciente público', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.collection(`patients/${PUBLIC_PATIENT}/familyMembers`).get());
  });

  /**
   * `schedules` e `weeks` deixaram de existir. Sem bloco próprio, caem no negado
   * final; se um curinga recursivo voltar, isto avisa.
   */
  it('deslogado NÃO lê schedules nem weeks, que deixaram de existir', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.collection(`patients/${PUBLIC_PATIENT}/schedules`).get());
    await assertFails(db.collection(`patients/${PUBLIC_PATIENT}/weeks`).get());
  });

  it('deslogado lê a janela de revezamento no paciente público', async () => {
    const db = asGuest(testEnv);
    const snapshot = await assertSucceeds(db.doc(`patients/${PUBLIC_PATIENT}`).get());

    assert.equal(snapshot.data().handoffWindowStart, '06:00');
    assert.equal(snapshot.data().minStayMinutes, 360);
  });

  it('deslogado NÃO lê os convites, que contêm e-mails', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.collection('invites').get());
  });

  it('deslogado NÃO consegue enumerar a coleção de pacientes', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.collection('patients').get());
  });

  it('deslogado NÃO escreve em turno nenhum', async () => {
    const db = asGuest(testEnv);

    await assertFails(
      db
        .doc(`patients/${PUBLIC_PATIENT}/companions/shift1`)
        .update({ familyMemberName: 'Invasor' }),
    );
  });

  it('deslogado NÃO cria turnos', async () => {
    const db = asGuest(testEnv);

    await assertFails(
      db.doc(`patients/${PUBLIC_PATIENT}/companions/novo`).set({ date: '2026-09-25' }),
    );
  });

  it('deslogado NÃO altera o paciente', async () => {
    const db = asGuest(testEnv);
    await assertFails(db.doc(`patients/${PUBLIC_PATIENT}`).update({ room: '999' }));
  });

  it('autenticado que não é admin NÃO lê o paciente privado', async () => {
    const db = as(testEnv, STRANGER);
    await assertFails(db.doc(`patients/${PRIVATE_PATIENT}`).get());
  });

  it('autenticado que não é admin NÃO escreve no paciente público', async () => {
    const db = as(testEnv, STRANGER);

    await assertFails(
      db
        .doc(`patients/${PUBLIC_PATIENT}/companions/shift1`)
        .update({ familyMemberName: 'Invasor' }),
    );
  });

  it('admin lê e escreve normalmente', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(db.doc(`patients/${PUBLIC_PATIENT}`).get());
    await assertSucceeds(db.collection(`patients/${PUBLIC_PATIENT}/familyMembers`).get());
    await assertSucceeds(
      db
        .doc(`patients/${PUBLIC_PATIENT}/companions/shift1`)
        .update({ familyMemberId: 'member1', familyMemberName: 'Tia Marta' }),
    );
  });

  it('admin lista apenas os próprios pacientes', async () => {
    const db = as(testEnv, CO_ADMIN);

    await assertSucceeds(
      db.collection('patients').where('adminIds', 'array-contains', CO_ADMIN.uid).get(),
    );

    // Sem o filtro, a query alcançaria pacientes de outras famílias.
    await assertFails(db.collection('patients').get());
  });
});
