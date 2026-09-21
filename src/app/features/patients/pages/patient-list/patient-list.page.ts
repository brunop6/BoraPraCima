import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { Patient } from '../../../../core/patient/patient.model';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { EmptyStateComponent } from '../../../../core/ui/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../../core/ui/spinner/spinner.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import { formatLong } from '../../../../core/utils/date.util';
import { Invite } from '../../models/invite.model';
import { InvitesService } from '../../services/invites.service';
import { PatientsService } from '../../services/patients.service';

/**
 * Porta de entrada de quem está logado.
 *
 * Os convites pendentes aparecem aqui mesmo, no topo, em vez de numa tela própria:
 * quem foi convidado entra no app justamente para aceitar, e obrigar essa pessoa a
 * procurar um menu seria o passo onde ela desistiria.
 */
@Component({
  selector: 'app-patient-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, EmptyStateComponent, SpinnerComponent],
  template: `
    <div class="page">
      <header class="header">
        <div>
          <p class="header__hello">Olá, {{ firstName() }}</p>
          <h1>Pacientes</h1>
        </div>

        <button type="button" class="header__exit" (click)="signOut()">Sair</button>
      </header>

      @if (invites().length > 0) {
        <section class="invites">
          <h2 class="invites__title">Convites para você</h2>

          @for (invite of invites(); track invite.id) {
            <div class="invite">
              <p class="invite__text">
                <strong>{{ invite.invitedByName }}</strong> convidou você para ajudar na escala de
                <strong>{{ invite.patientName }}</strong>.
              </p>

              <app-button
                block
                [loading]="acceptingId() === invite.id"
                (click)="accept(invite)"
              >
                Aceitar convite
              </app-button>
            </div>
          }
        </section>
      }

      @if (patients() === null) {
        <app-spinner label="Carregando…" />
      } @else if (patients()!.length === 0) {
        <app-empty-state
          illustration="marca/chale.png"
          title="Nenhum paciente ainda"
          description="Peça para alguém adicionar o seu e-mail como responsável, ou cadastre quem está internado para montar a escala de acompanhantes e compartilhar o calendário com a família."
        >
          <app-button block size="lg" routerLink="/pacientes/novo">Cadastrar paciente</app-button>
        </app-empty-state>
      } @else {
        <ul class="patients">
          @for (patient of patients(); track patient.id) {
            <li>
              <a class="patient" [routerLink]="['/pacientes', patient.id]">
                <span class="patient__name">{{ patient.name }}</span>
                <span class="patient__meta">
                  Leito {{ patient.room }} · desde {{ since(patient) }}
                </span>
                @if (!patient.publicAccessEnabled) {
                  <span class="patient__badge">Link público desligado</span>
                }
              </a>
            </li>
          }
        </ul>

        <app-button variant="secondary" block routerLink="/pacientes/novo">
          Cadastrar outro paciente
        </app-button>
      }
    </div>
  `,
  styles: `
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
    }

    .header__hello {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .header__exit {
      min-height: var(--touch-target);
      padding: 0 var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .invites {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
      padding: var(--space-4);
      background: var(--color-primary-soft);
      border-radius: var(--radius-md);
    }

    .invites__title {
      font-size: var(--font-size-md);
    }

    .invite {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .invite__text {
      font-size: var(--font-size-sm);
    }

    .patients {
      list-style: none;
      margin: 0 0 var(--space-4);
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .patient {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--color-text);
    }

    .patient:hover {
      border-color: var(--color-primary-mark);
    }

    .patient__name {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }

    .patient__meta {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .patient__badge {
      align-self: flex-start;
      margin-top: var(--space-2);
      padding: 2px var(--space-2);
      background: var(--color-warning-soft);
      border-radius: var(--radius-full);
      color: var(--color-warning);
      font-size: var(--font-size-xs);
    }
  `,
})
export class PatientListPage {
  private readonly auth = inject(AuthService);
  private readonly patientsService = inject(PatientsService);
  private readonly invitesService = inject(InvitesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly firstName = this.auth.firstName;
  protected readonly acceptingId = signal<string | null>(null);

  private readonly uid$ = toObservable(this.auth.uid);
  private readonly email$ = toObservable(this.auth.email);

  /** `null` enquanto carrega — distinguir de "carregou e não há nenhum" importa. */
  protected readonly patients = toSignal(
    this.uid$.pipe(
      switchMap((uid): Observable<Patient[] | null> =>
        uid ? this.patientsService.watchMine(uid) : of([]),
      ),
    ),
    { initialValue: null as Patient[] | null },
  );

  protected readonly invites = toSignal(
    this.email$.pipe(
      switchMap((email) => (email ? this.invitesService.watchPendingFor(email) : of<Invite[]>([]))),
    ),
    { initialValue: [] as Invite[] },
  );

  protected since(patient: Patient): string {
    return formatLong(patient.admissionDate);
  }

  protected async accept(invite: Invite): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) {
      return;
    }

    this.acceptingId.set(invite.id);
    try {
      await this.invitesService.accept(invite, uid);
      this.toast.success(`Agora você ajuda na escala de ${invite.patientName}.`);
    } catch {
      this.toast.error('Não foi possível aceitar o convite. Tente de novo.');
    } finally {
      this.acceptingId.set(null);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    // Navegação explícita: o guard desta rota já passou e não seria reavaliado.
    await this.router.navigateByUrl('/entrar');
  }
}
