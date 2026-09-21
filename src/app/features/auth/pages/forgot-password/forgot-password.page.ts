import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { authErrorMessage } from '../../../../core/auth/auth-errors';
import { AuthService } from '../../../../core/auth/auth.service';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-forgot-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterLink,
    AuthLayoutComponent,
    ButtonComponent,
    FieldComponent,
  ],
  template: `
    <app-auth-layout compact>
      <header class="intro">
        <!-- Enviado o link, a serra dá lugar ao fusquinha: o link já está a caminho. -->
        <span class="intro__plate">
          @if (sent()) {
            <img ngSrc="marca/fusquinha.png" alt="" width="226" height="141" />
          } @else {
            <img ngSrc="marca/natureza.png" alt="" width="195" height="167" priority />
          }
        </span>
        <div class="intro__text">
          <h1>Esqueci minha senha</h1>
          <p>Enviamos um link para você criar uma senha nova.</p>
        </div>
      </header>

      @if (sent()) {
        <div class="sent" role="status">
          <p><strong>Link enviado.</strong></p>
          <p>
            Procure a mensagem na caixa de entrada de {{ sentTo() }}. Se não estiver lá, veja
            também o spam ou o lixo eletrônico.
          </p>
        </div>
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
        </form>
      }

      <nav authLinks class="links" aria-label="Outras opções">
        <a routerLink="/entrar">{{ sent() ? 'Voltar para entrar' : 'Voltar' }}</a>
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
