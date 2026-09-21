import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Exige sessão ativa. Aguarda o Firebase restaurar a sessão antes de decidir —
 * sem isso, recarregar a página chutaria o usuário para o login.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = await auth.waitForUser();
  if (user) {
    return true;
  }

  return router.createUrlTree(['/entrar'], { queryParams: { redirect: state.url } });
};

/** O contrário: mantém quem já está logado fora das telas de login e cadastro. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = await auth.waitForUser();
  return user ? router.createUrlTree(['/pacientes']) : true;
};
