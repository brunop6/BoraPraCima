import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, getDoc } from '@angular/fire/firestore';
import { Observable, map, of } from 'rxjs';

import { patientPath } from '../firebase/paths';
import { Patient } from './patient.model';

/**
 * Leitura do paciente, compartilhada entre os contextos.
 *
 * `features/patients` administra o paciente e `features/schedule` só precisa
 * lê-lo; as duas passam por aqui em vez de uma importar a outra. Os guards também
 * usam este service, o que evita que `core` dependa de uma feature.
 */
@Injectable({ providedIn: 'root' })
export class PatientAccessService {
  private readonly firestore = inject(Firestore);

  /** Acompanha o paciente em tempo real. Emite `null` quando não existe ou o acesso é negado. */
  watch(patientId: string): Observable<Patient | null> {
    if (!patientId) {
      return of(null);
    }

    const reference = doc(this.firestore, patientPath(patientId));
    return docData(reference, { idField: 'id' }).pipe(
      map((data) => (data ? (data as Patient) : null)),
    );
  }

  /** Leitura única — para guards, que não devem manter listener aberto. */
  async getOnce(patientId: string): Promise<Patient | null> {
    if (!patientId) {
      return null;
    }

    const snapshot = await getDoc(doc(this.firestore, patientPath(patientId)));
    return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Patient) : null;
  }

  isAdmin(patient: Patient | null, uid: string | null): boolean {
    return !!patient && !!uid && patient.adminIds.includes(uid);
  }
}
