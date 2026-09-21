import { DocumentData, DocumentReference, Firestore, writeBatch } from '@angular/fire/firestore';

/** Limite do Firestore por batch. */
const MAX_OPERATIONS_PER_BATCH = 500;

export type BatchOperation =
  | { kind: 'set'; ref: DocumentReference; data: DocumentData }
  | { kind: 'update'; ref: DocumentReference; data: DocumentData }
  | { kind: 'delete'; ref: DocumentReference };

/**
 * Executa as operações em batches de até 500.
 *
 * Renomear ou apagar um familiar com internação longa passa desse limite
 * sem aviso — e o Firestore rejeita o batch inteiro. Fatiar aqui evita descobrir
 * isso só quando a escala já estiver grande.
 *
 * Os batches são sequenciais e cada um é atômico, mas o conjunto não é: se o
 * terceiro falhar, os dois primeiros já foram gravados. Para os usos deste app
 * (propagar um nome, apagar os turnos de um familiar) isso é aceitável — a operação é
 * idempotente e pode ser repetida.
 */
export async function commitInChunks(
  firestore: Firestore,
  operations: readonly BatchOperation[],
): Promise<void> {
  for (let index = 0; index < operations.length; index += MAX_OPERATIONS_PER_BATCH) {
    const chunk = operations.slice(index, index + MAX_OPERATIONS_PER_BATCH);
    const batch = writeBatch(firestore);

    for (const operation of chunk) {
      if (operation.kind === 'set') {
        batch.set(operation.ref, operation.data);
      } else if (operation.kind === 'update') {
        batch.update(operation.ref, operation.data);
      } else {
        batch.delete(operation.ref);
      }
    }

    await batch.commit();
  }
}
