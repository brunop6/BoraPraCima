import { Routes } from '@angular/router';

import { guestGuard } from '../../core/auth/auth.guard';

/**
 * Telas de entrada. O `guestGuard` evita que quem já está logado caia de novo no
 * login ao tocar num link antigo.
 */
export const AUTH_ROUTES: Routes = [
  {
    path: 'entrar',
    canActivate: [guestGuard],
    title: 'Entrar — Bora Pra Cima',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastrar',
    canActivate: [guestGuard],
    title: 'Criar conta — Bora Pra Cima',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'recuperar-senha',
    canActivate: [guestGuard],
    title: 'Recuperar senha — Bora Pra Cima',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
];
