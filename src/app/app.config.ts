import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { environment } from '../environments/environment';
import { provideFirebase } from './core/firebase/firebase.providers';
import { AppUpdateService } from './core/pwa/app-update.service';
import { ThemeService } from './core/theme/theme.service';
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

    /**
     * `registerWhenStable` deixa o registro para depois do primeiro desenho: quem
     * abre o link no corredor do hospital vê a escala antes de o app gastar rede
     * baixando o cache para a próxima vez.
     */
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),

    provideAppInitializer(() => inject(ThemeService).start()),
    provideAppInitializer(() => inject(AppUpdateService).start()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
