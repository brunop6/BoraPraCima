import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { authErrorMessage } from '../../../../core/auth/auth-errors';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';

@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, FieldComponent],
  template: `
    <div class="page">
      <header class="intro">
        <h1>Esqueci minha senha</h1>
        <p>Enviamos um link para você criar uma senha nova.</p>
      </header>

      @if (sent()) {
        <div class="sent" role="status">
          <p><strong>Link enviado.</strong></p>
          <p>
            Procure a mensagem na caixa de entrada de {{ sentTo() }}. Se não estiver lá, veja
            também o spam ou o lixo eletrônico.
          </p>
        </div>

        <a class="back" routerLink="/entrar">Voltar para entrar</a>
      } @else {
        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <app-field for="email" label="E-mail" [error]="emailError()">
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              inputmode="email"
            />
          </app-field>

          @if (failure()) {
            <p class="failure" role="alert">{{ failure() }}</p>
          }

          <app-button type="submit" size="lg" block [loading]="loading()">
            Enviar link
          </app-button>

          <a class="back" routerLink="/entrar">Voltar</a>
        </form>
      }
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

    .sent {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
      background: var(--color-success-soft);
      border-radius: var(--radius-md);
      color: var(--color-success);
    }

    .failure {
      padding: var(--space-3);
      background: var(--color-danger-soft);
      border-radius: var(--radius-sm);
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }

    .back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: var(--touch-target);
      margin-top: var(--space-4);
    }
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly sentTo = signal('');
  protected readonly failure = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected emailError(): string | null {
    const field = this.form.controls.email;
    if (!field.touched || field.valid) {
      return null;
    }
    return field.hasError('required') ? 'Digite seu e-mail.' : 'Esse e-mail não parece válido.';
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.failure.set(null);
    this.loading.set(true);

    const email = this.form.getRawValue().email.trim();

    try {
      await this.auth.sendPasswordReset(email);
      this.sentTo.set(email);
      this.sent.set(true);
    } catch (error) {
      this.failure.set(authErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
