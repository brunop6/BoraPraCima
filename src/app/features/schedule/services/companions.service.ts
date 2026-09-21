import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { companionsPath } from '../../../core/firebase/paths';
import { IsoDate } from '../../../core/utils/date.util';
import { Time } from '../../../core/utils/time.util';
import { Companion } from '../models/companion.model';

/** Quem faz o turno. */
export interface CompanionAssignment {
  id: string;
  name: string;
  color: string;
  transparency: number;
}

/** O que define um turno novo. A validação das regras do hospital roda antes. */
export interface ShiftDraft {
  date: IsoDate;
  startTime: Time;
  endTime: Time;
  member: CompanionAssignment;
}

/** Data e horário de um turno já existente. */
export type ShiftTimes = Pick<ShiftDraft, 'date' | 'startTime' | 'endTime'>;

/** Leitura e escrita dos turnos (`patients/{pid}/companions`). */
@Injectable({ providedIn: 'root' })
export class CompanionsService {
  private readonly firestore = inject(Firestore);

  /**
   * Turnos de um intervalo de datas, em tempo real.
   *
   * Como as datas são strings `'YYYY-MM-DD'`, a comparação lexicográfica coincide
   * com a cronológica e o intervalo vira um `where` simples. Usa o índice composto
   * (date, startTime) declarado em `firestore.indexes.json`.
   */
  watchRange(patientId: string, from: IsoDate, to: IsoDate): Observable<Companion[]> {
    const reference = query(
      collection(this.firestore, companionsPath(patientId)),
      where('date', '>=', from),
      where('date', '<=', to),
      orderBy('date'),
      orderBy('startTime'),
    );

    return collectionData(reference, { idField: 'id' }).pipe(
      map((companions) => companions as Companion[]),
    );
  }

  /**
   * Cria o turno. O ID é aleatório: sem molde semanal não há chave natural, e o
   * conflito entre dois responsáveis é tratado pela validação de sobreposição.
   */
  async create(patientId: string, draft: ShiftDraft, createdBy: string): Promise<string> {
    const created = await addDoc(collection(this.firestore, companionsPath(patientId)), {
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      familyMemberId: draft.member.id,
      // Nome e aparência viajam junto porque a tela pública não pode ler `familyMembers`.
      familyMemberName: draft.member.name,
      familyMemberColor: draft.member.color,
      familyMemberTransparency: draft.member.transparency,
      note: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: createdBy,
    });

    return created.id;
  }

  /** Troca quem faz o turno. Para deixá-lo vago, apague-o: vago é a lacuna. */
  async changeMember(
    patientId: string,
    companionId: string,
    member: CompanionAssignment,
    updatedBy: string,
  ): Promise<void> {
    await updateDoc(this.companionRef(patientId, companionId), {
      familyMemberId: member.id,
      familyMemberName: member.name,
      familyMemberColor: member.color,
      familyMemberTransparency: member.transparency,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  /** Corrige a data e o horário de um turno específico. */
  async updateTimes(
    patientId: string,
    companionId: string,
    times: ShiftTimes,
    updatedBy: string,
  ): Promise<void> {
    await updateDoc(this.companionRef(patientId, companionId), {
      date: times.date,
      startTime: times.startTime,
      endTime: times.endTime,
      updatedAt: serverTimestamp(),
      updatedBy,
    });
  }

  async remove(patientId: string, companionId: string): Promise<void> {
    await deleteDoc(this.companionRef(patientId, companionId));
  }

  private companionRef(patientId: string, companionId: string) {
    return doc(this.firestore, `${companionsPath(patientId)}/${companionId}`);
  }
}
