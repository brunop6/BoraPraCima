import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { patientAdminGuard } from './core/auth/patient-admin.guard';

/**
 * A composição das rotas fica aqui, na raiz, e não dentro das features.
 *
 * A área de um paciente mistura telas de dois contextos — o calendário vem de
 * `schedule`, familiares e ajustes vêm de `patients`. Montar essa árvore dentro de
 * uma das duas obrigaria a feature a importar a outra; na raiz, cada uma continua
 * ignorando a existência da outra.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pacientes' },

  /**
   * O link público. Fica antes das rotas protegidas e sem nenhum guard — é o
   * caminho de quem só recebeu a URL no WhatsApp e não tem conta.
   */
  {
    path: 'p/:patientId',
    title: 'Escala de acompanhantes',
    loadComponent: () =>
      import('./features/schedule/pages/public-calendar/public-calendar.page').then(
        (m) => m.PublicCalendarPage,
      ),
  },

  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  {
    path: 'pacientes',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Meus pacientes — Bora Pra Cima',
        loadComponent: () =>
          import('./features/patients/pages/patient-list/patient-list.page').then(
            (m) => m.PatientListPage,
          ),
      },
      {
        path: 'novo',
        title: 'Cadastrar paciente — Bora Pra Cima',
        loadComponent: () =>
          import('./features/patients/pages/patient-form/patient-form.page').then(
            (m) => m.PatientFormPage,
          ),
      },
      {
        path: ':patientId',
        canActivate: [patientAdminGuard],
        loadComponent: () =>
          import('./core/layout/patient-shell.component').then((m) => m.PatientShellComponent),
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Calendário — Bora Pra Cima',
            loadComponent: () =>
              import('./features/schedule/pages/calendar/calendar.page').then((m) => m.CalendarPage),
          },
          {
            path: 'familiares',
            title: 'Familiares — Bora Pra Cima',
            loadComponent: () =>
              import('./features/patients/pages/family-members/family-members.page').then(
                (m) => m.FamilyMembersPage,
              ),
          },
          {
            path: 'equipe',
            title: 'Responsáveis — Bora Pra Cima',
            loadComponent: () =>
              import('./features/patients/pages/team/team.page').then((m) => m.TeamPage),
          },
          {
            path: 'ajustes',
            title: 'Ajustes — Bora Pra Cima',
            loadComponent: () =>
              import('./features/patients/pages/patient-settings/patient-settings.page').then(
                (m) => m.PatientSettingsPage,
              ),
          },
        ],
      },
    ],
  },

  {
    path: '**',
    title: 'Página não encontrada — Bora Pra Cima',
    loadComponent: () => import('./core/layout/not-found.page').then((m) => m.NotFoundPage),
  },
];
