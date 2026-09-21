import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';

import { provideFirebase } from './core/firebase/firebase.providers';
import { routes } from './app.routes';

registerLocaleData(localePt, 'pt-BR');

/**
 * Separado de `appConfig` para que o spec exercite exatamente o que o app usa.
 *
 * `paramsInheritanceStrategy: 'always'` é o que entrega `patientId` às telas de
 * `familiares`, `equipe` e `ajustes`. O padrão (`emptyOnly`) só repassa os
 * parâmetros do pai a filhos de caminho vazio ou a pais sem componente; aqui o pai
 * é o `PatientShellComponent`, então essas telas recebiam `patientId` indefinido,
 * consultavam `patients/undefined/...` e as rules respondiam "permissão insuficiente".
 */
export const routerFeatures = [
  // Parâmetros de rota chegam nos componentes como `input()`, sem ActivatedRoute.
  withComponentInputBinding(),
  withRouterConfig({ paramsInheritanceStrategy: 'always' }),
  withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, ...routerFeatures),
    provideFirebase(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
