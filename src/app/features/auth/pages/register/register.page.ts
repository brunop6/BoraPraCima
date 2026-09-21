import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { authErrorMessage, isUserCancelled } from '../../../../core/auth/auth-errors';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { GoogleLogoComponent } from '../../components/google-logo/google-logo.component';

/** Senha mínima do Firebase Auth. */
const MIN_PASSWORD_LENGTH = 6;

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    GoogleLogoComponent,
    ButtonComponent,
    FieldComponent,
  ],
  template: `
    <app-auth-layout compact>
      <header class="intro">
        <span class="intro__plate">
          <img ngSrc="marca/chale.png" alt="" width="222" height="168" priority />
        </span>
        <div class="intro__text">
          <h1>Criar conta</h1>
          <p>Depois de entrar, você cadastra o paciente e monta a escala.</p>
        </div>
      </header>

      <div class="stack">
        <app-button variant="secondary" size="lg" block [loading]="googleLoading()" (click)="withGoogle()">
          <app-google-logo />Criar conta com o Google
        </app-button>

        <p class="divider"><span>ou com e-mail e senha</span></p>

        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <app-field for="name" label="Seu nome" [error]="errorFor('name')">
            <input id="name" type="text" formControlName="name" autocomplete="name" />
          </app-field>

          <app-field for="email" label="E-mail" [error]="errorFor('email')">
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
            />
          </app-field>

          <app-field
            for="password"
            label="Senha"
            hint="Pelo menos 6 caracteres."
            [error]="errorFor('password')"
          >
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
          </app-field>

          @if (failure()) {
            <p class="failure" role="alert">{{ failure() }}</p>
          }

          <app-button type="submit" size="lg" block [loading]="loading()">Criar conta</app-button>
        </form>
      </div>

      <nav authLinks class="links" aria-label="Outras opções">
        <a routerLink="/entrar">Já tenho conta</a>
      </nav>
    </app-auth-layout>
  `,
  styles: `
    .intro {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
    }

    /**
     * A ilustração é raster com fundo creme próprio: vai sobre a placa bege nos
     * dois temas, sem recolorir nem cortar em círculo.
     */
    .intro__plate {
      flex: none;
      padding: var(--space-2);
      border-radius: var(--radius-lg);
      background: var(--marca-bege-claro);
      line-height: 0;
    }

    .intro__plate img {
      width: 4.5rem;
      height: auto;
    }

    .intro__text p {
      margin-top: var(--space-1);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .divider {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }

    .failure {
      padding: var(--space-3);
      background: var(--color-danger-soft);
      border-radius: var(--radius-sm);
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }

    .links {
      display: flex;
      justify-content: center;
      margin-top: var(--space-4);
    }

    .links a {
      min-height: var(--touch-target);
      display: inline-flex;
      align-items: center;
      font-weight: var(--font-weight-medium);
    }
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly googleLoading = signal(false);
  protected readonly failure = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  protected errorFor(control: 'name' | 'email' | 'password'): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }

    if (control === 'name') {
      return 'Escreva seu nome.';
    }
    if (control === 'email') {
      return field.hasError('required') ? 'Digite seu e-mail.' : 'Esse e-mail não parece válido.';
    }
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  protected async withGoogle(): Promise<void> {
    this.failure.set(null);
    this.googleLoading.set(true);

    try {
      await this.auth.signInWithGoogle();
      await this.router.navigateByUrl('/pacientes');
    } catch (error) {
      if (!isUserCancelled(error)) {
        this.failure.set(authErrorMessage(error));
      }
    } finally {
      this.googleLoading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.failure.set(null);
    this.loading.set(true);

    const { name, email, password } = this.form.getRawValue();

    try {
      await this.auth.registerWithEmail(name, email, password);
      await this.router.navigateByUrl('/pacientes');
    } catch (error) {
      this.failure.set(authErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
