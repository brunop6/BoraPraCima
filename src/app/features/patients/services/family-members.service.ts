import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { BatchOperation, commitInChunks } from '../../../core/firebase/batch.util';
import { companionsPath, familyMembersPath } from '../../../core/firebase/paths';
import { FamilyMember } from '../models/family-member.model';

@Injectable({ providedIn: 'root' })
export class FamilyMembersService {
  private readonly firestore = inject(Firestore);

  watch(patientId: string): Observable<FamilyMember[]> {
    const reference = query(
      collection(this.firestore, familyMembersPath(patientId)),
      orderBy('name'),
    );

    return collectionData(reference, { idField: 'id' }).pipe(
      map((members) => members as FamilyMember[]),
    );
  }

  async create(patientId: string, name: string, phone: string | null = null): Promise<string> {
    const created = await addDoc(collection(this.firestore, familyMembersPath(patientId)), {
      name: name.trim(),
      phone: phone?.trim() || null,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return created.id;
  }

  /**
   * Renomeia o familiar e propaga o novo nome para os turnos.
   *
   * O nome está duplicado dentro de cada `Companion` porque a tela pública não pode
   * ler esta coleção (que guarda telefone). A duplicação é deliberada, mas custa
   * esta propagação: sem ela, o calendário continuaria exibindo o nome antigo.
   */
  async rename(patientId: string, memberId: string, name: string): Promise<number> {
    const trimmed = name.trim();

    await updateDoc(doc(this.firestore, `${familyMembersPath(patientId)}/${memberId}`), {
      name: trimmed,
      updatedAt: serverTimestamp(),
    });

    return this.updateAssignedCompanions(patientId, memberId, {
      familyMemberName: trimmed,
    });
  }

  async updateContact(patientId: string, memberId: string, phone: string | null): Promise<void> {
    await updateDoc(doc(this.firestore, `${familyMembersPath(patientId)}/${memberId}`), {
      phone: phone?.trim() || null,
      updatedAt: serverTimestamp(),
    });
  }

  /** Desativar tira das opções de escala sem mexer nos turnos já combinados. */
  async setActive(patientId: string, memberId: string, active: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, `${familyMembersPath(patientId)}/${memberId}`), {
      active,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Apaga o familiar e os turnos dele, que voltam a ser lacuna ("Vago").
   *
   * A alternativa — deixar `familyMemberId` apontando para um documento que não
   * existe mais — produziria cards com nome de alguém que sumiu do cadastro, e
   * ninguém conseguiria entender por quê. A tela avisa quantos turnos ficarão
   * vagos antes de confirmar.
   */
  async remove(patientId: string, memberId: string): Promise<number> {
    const snapshot = await getDocs(this.assignedCompanionsQuery(patientId, memberId));

    await commitInChunks(
      this.firestore,
      snapshot.docs.map((document) => ({ kind: 'delete' as const, ref: document.ref })),
    );

    await deleteDoc(doc(this.firestore, `${familyMembersPath(patientId)}/${memberId}`));

    return snapshot.size;
  }

  /** Quantos turnos estão escalados para este familiar. Usado no aviso de exclusão. */
  async countAssignments(patientId: string, memberId: string): Promise<number> {
    const snapshot = await getDocs(this.assignedCompanionsQuery(patientId, memberId));
    return snapshot.size;
  }

  private async updateAssignedCompanions(
    patientId: string,
    memberId: string,
    changes: Record<string, unknown>,
  ): Promise<number> {
    const snapshot = await getDocs(this.assignedCompanionsQuery(patientId, memberId));

    const operations: BatchOperation[] = snapshot.docs.map((document) => ({
      kind: 'update' as const,
      ref: document.ref,
      data: { ...changes, updatedAt: serverTimestamp() },
    }));

    await commitInChunks(this.firestore, operations);

    return operations.length;
  }

  private assignedCompanionsQuery(patientId: string, memberId: string) {
    return query(
      collection(this.firestore, companionsPath(patientId)),
      where('familyMemberId', '==', memberId),
    );
  }
}
