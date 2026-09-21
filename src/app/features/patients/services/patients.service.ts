import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, of } from 'rxjs';

import { PATIENTS, patientPath } from '../../../core/firebase/paths';
import { AppUser } from '../../../core/models/app-user.model';
import { USERS } from '../../../core/firebase/paths';
import { DEFAULT_TIMEZONE, Patient } from '../../../core/patient/patient.model';
import { IsoDate } from '../../../core/utils/date.util';

export interface PatientDraft {
  name: string;
  room: string;
  hospital: string | null;
  admissionDate: IsoDate;
  handoffWindowStart: string;
  handoffWindowEnd: string;
  minStayMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private readonly firestore = inject(Firestore);

  /**
   * Pacientes que o usuário administra.
   *
   * Sem `orderBy`: combinar `array-contains` com ordenação por outro campo
   * exigiria índice composto, e a lista tem poucos itens — ordenar em memória sai
   * mais barato do que manter um índice.
   */
  watchMine(uid: string): Observable<Patient[]> {
    const reference = query(
      collection(this.firestore, PATIENTS),
      where('adminIds', 'array-contains', uid),
    );

    return collectionData(reference, { idField: 'id' }).pipe(
      map((patients) => patients as Patient[]),
      map((patients) => [...patients].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))),
    );
  }

  async create(draft: PatientDraft, ownerId: string): Promise<string> {
    const created = await addDoc(collection(this.firestore, PATIENTS), {
      ...draft,
      ownerId,
      // As rules exigem exatamente isto na criação: o criador é o único admin.
      adminIds: [ownerId],
      publicAccessEnabled: true,
      timezone: DEFAULT_TIMEZONE,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return created.id;
  }

  async update(patientId: string, changes: Partial<PatientDraft>): Promise<void> {
    await updateDoc(doc(this.firestore, patientPath(patientId)), {
      ...changes,
      updatedAt: serverTimestamp(),
    });
  }

  /** Liga e desliga o link público. Desligar corta o acesso sem trocar a URL. */
  async setPublicAccess(patientId: string, enabled: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, patientPath(patientId)), {
      publicAccessEnabled: enabled,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Remove um admin. Só o dono consegue, e o dono nunca sai da própria lista —
   * as rules recusariam, e o paciente ficaria sem ninguém para administrá-lo.
   */
  async removeAdmin(patient: Patient, adminId: string): Promise<void> {
    if (adminId === patient.ownerId) {
      throw new Error('O responsável pelo cadastro não pode ser removido.');
    }

    await updateDoc(doc(this.firestore, patientPath(patient.id)), {
      adminIds: patient.adminIds.filter((id) => id !== adminId),
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Apaga o paciente. As subcollections NÃO são apagadas junto — o Firestore não
   * faz cascata, e fazer isso no client exigiria varrer tudo. Como só o dono
   * consegue apagar e as rules dos filhos dependem do documento pai, os órfãos
   * ficam inacessíveis. Fica registrado aqui como dívida conhecida.
   */
  async remove(patientId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, patientPath(patientId)));
  }

  /** Perfis dos admins, para a tela de equipe. */
  watchAdmins(adminIds: readonly string[]): Observable<AppUser[]> {
    if (adminIds.length === 0) {
      return of([]);
    }

    const profiles = adminIds.map((uid) =>
      docData(doc(this.firestore, `${USERS}/${uid}`), { idField: 'id' }).pipe(
        map((user) => (user ?? { id: uid, name: 'Usuário', email: '', photoURL: null }) as AppUser),
      ),
    );

    return combineLatest(profiles);
  }
}
