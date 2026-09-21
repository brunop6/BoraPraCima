import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { authErrorMessage, isUserCancelled } from '../../../../core/auth/auth-errors';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FieldComponent],
  template: `
    <div class="page">
      <header class="intro">
        <h1>Bora Pra Cima</h1>
        <p>Entre para organizar a escala de acompanhantes.</p>
      </header>

      <div class="stack">
        <app-button variant="secondary" size="lg" block [loading]="googleLoading()" (click)="withGoogle()">
          Entrar com o Google
        </app-button>

        <p class="divider"><span>ou com e-mail e senha</span></p>

        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <app-field for="email" label="E-mail" [error]="errorFor('email')">
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
              [attr.aria-invalid]="errorFor('email') ? 'true' : null"
            />
          </app-field>

          <app-field for="password" label="Senha" [error]="errorFor('password')">
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="errorFor('password') ? 'true' : null"
            />
          </app-field>

          @if (failure()) {
            <p class="failure" role="alert">{{ failure() }}</p>
          }

          <app-button type="submit" size="lg" block [loading]="loading()">Entrar</app-button>
        </form>

        <div class="links">
          <a routerLink="/recuperar-senha">Esqueci minha senha</a>
          <a routerLink="/cadastrar">Criar uma conta</a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .intro {
      margin-bottom: var(--space-6);
      text-align: center;
    }

    .intro p {
      margin-top: var(--space-2);
      color: var(--color-text-muted);
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
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-4);
    }

    .links a {
      min-height: var(--touch-target);
      display: inline-flex;
      align-items: center;
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly googleLoading = signal(false);
  protected readonly failure = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected errorFor(control: 'email' | 'password'): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }

    if (control === 'email') {
      return field.hasError('required') ? 'Digite seu e-mail.' : 'Esse e-mail não parece válido.';
    }
    return 'Digite sua senha.';
  }

  protected async withGoogle(): Promise<void> {
    this.failure.set(null);
    this.googleLoading.set(true);

    try {
      await this.auth.signInWithGoogle();
      await this.goToApp();
    } catch (error) {
      // Fechar o pop-up é uma decisão do usuário, não um erro a alarmar.
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

    const { email, password } = this.form.getRawValue();

    try {
      await this.auth.signInWithEmail(email, password);
      await this.goToApp();
    } catch (error) {
      this.failure.set(authErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** Volta para onde o guard interrompeu, se houver. */
  private async goToApp(): Promise<void> {
    const redirect = new URLSearchParams(location.search).get('redirect');
    await this.router.navigateByUrl(redirect || '/pacientes');
  }
}
