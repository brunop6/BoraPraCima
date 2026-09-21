import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { authErrorMessage, isUserCancelled } from '../../../../core/auth/auth-errors';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';

/** Senha mínima do Firebase Auth. */
const MIN_PASSWORD_LENGTH = 6;

@Component({
  selector: 'app-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FieldComponent],
  template: `
    <div class="page">
      <header class="intro">
        <h1>Criar conta</h1>
        <p>Depois de entrar, você cadastra o paciente e monta a escala.</p>
      </header>

      <div class="stack">
        <app-button variant="secondary" size="lg" block [loading]="googleLoading()" (click)="withGoogle()">
          Criar conta com o Google
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

        <div class="links">
          <a routerLink="/entrar">Já tenho conta</a>
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
      justify-content: center;
      margin-top: var(--space-4);
    }

    .links a {
      min-height: var(--touch-target);
      display: inline-flex;
      align-items: center;
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
