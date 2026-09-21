import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PatientAccessService } from '../patient/patient-access.service';
import { AuthService } from './auth.service';

/**
 * Protege as telas de edição de um paciente.
 *
 * Quem está logado mas não é admin daquele paciente vai para a visão pública em
 * vez de levar um erro seco: se o link for público, ainda vê o calendário, que é
 * quase sempre o que a pessoa queria.
 */
export const patientAdminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const access = inject(PatientAccessService);
  const router = inject(Router);

  const user = await auth.waitForUser();
  if (!user) {
    return router.createUrlTree(['/entrar'], { queryParams: { redirect: state.url } });
  }

  const patientId = route.paramMap.get('patientId');
  if (!patientId) {
    return router.createUrlTree(['/pacientes']);
  }

  try {
    const patient = await access.getOnce(patientId);

    if (!patient) {
      return router.createUrlTree(['/pacientes'], { queryParams: { erro: 'nao-encontrado' } });
    }

    return access.isAdmin(patient, user.uid) ? true : router.createUrlTree(['/p', patientId]);
  } catch {
    // permission-denied: o paciente existe mas não é público nem nosso.
    return router.createUrlTree(['/p', patientId]);
  }
};
