import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { PatientAccessService } from '../../../../core/patient/patient-access.service';
import { AppUser } from '../../../../core/models/app-user.model';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import { Invite } from '../../models/invite.model';
import { InvitesService } from '../../services/invites.service';
import { PatientsService } from '../../services/patients.service';

/**
 * Quem pode editar a escala deste paciente.
 *
 * Note a diferença em relação à tela de familiares: aqui são contas do sistema com
 * permissão de escrita; lá são apenas nomes que aparecem no calendário. Confundir
 * as duas coisas é o erro mais fácil de cometer neste app, por isso os textos
 * insistem na distinção.
 */
@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, FieldComponent],
  template: `
    <div class="page">
      <p class="intro">
        Responsáveis podem editar a escala e os dados do paciente. Para apenas
        <em>ver</em> o calendário, ninguém precisa de conta — basta o link público.
      </p>

      <section class="block">
        <h2>Responsáveis</h2>

        <ul class="people">
          @for (admin of admins(); track admin.id) {
            <li class="person">
              <div class="person__info">
                <span class="person__name">
                  {{ admin.name }}
                  @if (admin.id === currentUid()) {
                    <span class="person__tag">você</span>
                  }
                </span>
                <span class="person__email">{{ admin.email }}</span>
              </div>

              @if (isOwner() && admin.id !== patient()?.ownerId) {
                <button type="button" class="person__remove" (click)="removeAdmin(admin)">
                  <span class="sr-only">Remover {{ admin.name }}</span>
                  <span aria-hidden="true">✕</span>
                </button>
              } @else if (admin.id === patient()?.ownerId) {
                <span class="person__tag">cadastrou</span>
              }
            </li>
          }
        </ul>
      </section>

      @if (pendingInvites().length > 0) {
        <section class="block">
          <h2>Convites enviados</h2>

          <ul class="people">
            @for (invite of pendingInvites(); track invite.id) {
              <li class="person">
                <div class="person__info">
                  <span class="person__name">{{ invite.email }}</span>
                  <span class="person__email">
                    {{ invite.status === 'revoked' ? 'Cancelado' : 'Aguardando aceitar' }}
                  </span>
                </div>

                <button type="button" class="person__remove" (click)="cancel(invite)">
                  <span class="sr-only">Cancelar convite para {{ invite.email }}</span>
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            }
          </ul>
        </section>
      }

      <section class="block">
        <h2>Convidar responsável</h2>

        <form class="stack" [formGroup]="form" (ngSubmit)="invite()">
          <app-field
            for="invite-email"
            label="E-mail"
            hint="A pessoa verá o convite ao entrar no Bora Pra Cima com esse e-mail."
            [error]="emailError()"
          >
            <input
              id="invite-email"
              type="email"
              formControlName="email"
              inputmode="email"
              autocomplete="off"
            />
          </app-field>

          <app-button type="submit" block [disabled]="form.invalid" [loading]="sending()">
            Enviar convite
          </app-button>
        </form>

        <p class="note">
          O convite não dispara e-mail: avise a pessoa pelo WhatsApp para entrar no site e aceitar.
        </p>
      </section>
    </div>
  `,
  styles: `
    .intro {
      margin-bottom: var(--space-5);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .block {
      margin-bottom: var(--space-6);
    }

    .block h2 {
      margin-bottom: var(--space-3);
      font-size: var(--font-size-md);
    }

    .people {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .person {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .person__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-height: var(--touch-target);
      justify-content: center;
      overflow: hidden;
    }

    .person__name {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: var(--font-weight-medium);
    }

    .person__email {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .person__tag {
      padding: 0 var(--space-2);
      background: var(--color-primary-soft);
      border-radius: var(--radius-full);
      color: var(--color-primary-strong);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-normal);
      white-space: nowrap;
    }

    .person__remove {
      width: var(--touch-target);
      height: var(--touch-target);
      flex-shrink: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .person__remove:hover {
      background: var(--color-danger-soft);
      color: var(--color-danger);
    }

    .note {
      margin-top: var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class TeamPage {
  readonly patientId = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly patientAccess = inject(PatientAccessService);
  private readonly patients = inject(PatientsService);
  private readonly invites = inject(InvitesService);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly sending = signal(false);
  protected readonly currentUid = this.auth.uid;

  private readonly patientId$ = toObservable(this.patientId);

  protected readonly patient = toSignal(
    this.patientId$.pipe(switchMap((id) => this.patientAccess.watch(id))),
    { initialValue: null },
  );

  protected readonly admins = toSignal(
    toObservable(computed(() => this.patient()?.adminIds ?? [])).pipe(
      switchMap((ids) => (ids.length ? this.patients.watchAdmins(ids) : of<AppUser[]>([]))),
    ),
    { initialValue: [] as AppUser[] },
  );

  protected readonly pendingInvites = toSignal(
    this.patientId$.pipe(switchMap((id) => this.invites.watchForPatient(id))),
    { initialValue: [] as Invite[] },
  );

  protected readonly isOwner = computed(() => this.patient()?.ownerId === this.auth.uid());

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected emailError(): string | null {
    const field = this.form.controls.email;
    if (!field.touched || field.valid) {
      return null;
    }
    return field.hasError('required') ? 'Digite o e-mail.' : 'Esse e-mail não parece válido.';
  }

  protected async invite(): Promise<void> {
    const patient = this.patient();
    if (this.form.invalid || !patient) {
      return;
    }

    const email = this.form.getRawValue().email.trim();
    const invitedByName = this.auth.displayName() ?? 'Alguém';
    const uid = this.auth.uid();

    if (!uid) {
      return;
    }

    this.sending.set(true);
    try {
      await this.invites.invite(patient, email, uid, invitedByName);
      this.form.reset({ email: '' });
      this.toast.success(`Convite criado para ${email}. Avise a pessoa para entrar e aceitar.`);
    } catch {
      this.toast.error('Não foi possível criar o convite. Tente de novo.');
    } finally {
      this.sending.set(false);
    }
  }

  protected async cancel(invite: Invite): Promise<void> {
    if (!confirm(`Cancelar o convite para ${invite.email}?`)) {
      return;
    }

    try {
      await this.invites.remove(invite.id);
      this.toast.success('Convite cancelado.');
    } catch {
      this.toast.error('Não foi possível cancelar. Tente de novo.');
    }
  }

  protected async removeAdmin(admin: AppUser): Promise<void> {
    const patient = this.patient();
    if (!patient) {
      return;
    }

    if (!confirm(`Remover ${admin.name} dos responsáveis?\n\nA pessoa deixa de poder editar a escala.`)) {
      return;
    }

    try {
      await this.patients.removeAdmin(patient, admin.id);
      this.toast.success(`${admin.name} não é mais responsável.`);
    } catch {
      this.toast.error('Não foi possível remover. Tente de novo.');
    }
  }
}
