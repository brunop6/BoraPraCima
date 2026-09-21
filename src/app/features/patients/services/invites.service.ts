import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  arrayUnion,
  collection,
  collectionData,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { INVITES, invitePath, normalizeEmail, patientPath } from '../../../core/firebase/paths';
import { Patient } from '../../../core/patient/patient.model';
import { Invite } from '../models/invite.model';

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private readonly firestore = inject(Firestore);

  /** Convites de um paciente, para a tela de equipe. */
  watchForPatient(patientId: string): Observable<Invite[]> {
    const reference = query(
      collection(this.firestore, INVITES),
      where('patientId', '==', patientId),
    );

    return collectionData(reference, { idField: 'id' }).pipe(
      map((invites) => invites as Invite[]),
      map((invites) => invites.filter((invite) => invite.status !== 'accepted')),
    );
  }

  /** Convites pendentes endereçados a este e-mail, em qualquer paciente. */
  watchPendingFor(email: string): Observable<Invite[]> {
    const reference = query(
      collection(this.firestore, INVITES),
      where('email', '==', normalizeEmail(email)),
      where('status', '==', 'pending'),
    );

    return collectionData(reference, { idField: 'id' }).pipe(
      map((invites) => invites as Invite[]),
    );
  }

  /**
   * Convida alguém para administrar o paciente.
   *
   * `setDoc` com ID determinístico em vez de `addDoc`: convidar a mesma pessoa duas
   * vezes reaproveita o convite em vez de criar um duplicado — e reenviar é
   * exatamente o que alguém faz quando acha que a primeira tentativa não chegou.
   */
  async invite(
    patient: Patient,
    email: string,
    invitedBy: string,
    invitedByName: string,
  ): Promise<void> {
    const normalized = normalizeEmail(email);

    await setDoc(doc(this.firestore, invitePath(normalized, patient.id)), {
      email: normalized,
      patientId: patient.id,
      patientName: patient.name,
      invitedBy,
      invitedByName,
      status: 'pending',
      createdAt: serverTimestamp(),
      acceptedAt: null,
      acceptedBy: null,
    });
  }

  async revoke(inviteId: string): Promise<void> {
    await updateDoc(doc(this.firestore, `${INVITES}/${inviteId}`), { status: 'revoked' });
  }

  async remove(inviteId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `${INVITES}/${inviteId}`));
  }

  /**
   * Aceita o convite e vira admin.
   *
   * A ordem importa: o paciente é atualizado PRIMEIRO, porque a regra que autoriza
   * essa escrita exige que o convite ainda esteja `pending`. Marcar o convite antes
   * fecharia a porta na própria cara.
   *
   * `arrayUnion` em vez de ler a lista e reescrevê-la: quem está aceitando ainda não
   * é admin e, portanto, não tem permissão para LER o paciente. O servidor faz a
   * concatenação, e a regra confere que o resultado é exatamente a lista anterior
   * com o uid novo no fim.
   */
  async accept(invite: Invite, uid: string): Promise<void> {
    await updateDoc(doc(this.firestore, patientPath(invite.patientId)), {
      adminIds: arrayUnion(uid),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(this.firestore, `${INVITES}/${invite.id}`), {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: uid,
    });
  }
}
