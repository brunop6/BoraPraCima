import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { handoffRulesOf, toPatientFields } from '../../../../core/patient/handoff-rules';
import { PatientAccessService } from '../../../../core/patient/patient-access.service';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import {
  HandoffRulesFieldsComponent,
  createHandoffRulesGroup,
  handoffRulesFrom,
} from '../../components/handoff-rules-fields/handoff-rules-fields.component';
import { PatientsService } from '../../services/patients.service';

/**
 * Dados do paciente, controle do link público e exclusão.
 *
 * O interruptor do link é o controle mais importante desta tela: é o que permite
 * cortar o acesso de quem já recebeu a URL, sem precisar trocar de endereço.
 */
@Component({
  selector: 'app-patient-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    FieldComponent,
    HandoffRulesFieldsComponent,
  ],
  template: `
    <div class="page">
      <section class="card">
        <h2>Link do calendário</h2>
        <p class="card__text">
          Qualquer pessoa com este link vê a escala, sem precisar de conta. Ninguém consegue
          alterar nada por ele.
        </p>

        <div class="link-box">
          <code class="link-box__url">{{ publicUrl() }}</code>
        </div>

        <div class="card__actions">
          <app-button variant="secondary" block (click)="copyLink()">Copiar link</app-button>

          <app-button variant="ghost" block routerLink="../">Ver o calendário</app-button>
        </div>

        <label class="toggle">
          <input
            type="checkbox"
            [checked]="patient()?.publicAccessEnabled ?? false"
            (change)="togglePublicAccess($event)"
          />
          <span>
            <strong>Link ativo</strong>
            <span class="toggle__hint">
              Ao desligar, quem já tem o link deixa de ver a escala imediatamente.
            </span>
          </span>
        </label>
      </section>

      <section class="card">
        <h2>Responsáveis</h2>
        <p class="card__text">
          Quem pode editar a escala. Para apenas ver o calendário, ninguém precisa de conta.
        </p>

        <app-button variant="secondary" block routerLink="../equipe">
          Gerenciar responsáveis
        </app-button>
      </section>

      <section class="card">
        <h2>Dados do paciente</h2>

        <form class="stack" [formGroup]="form" (ngSubmit)="save()">
          <app-field for="name" label="Nome">
            <input id="name" type="text" formControlName="name" />
          </app-field>

          <app-field for="room" label="Leito ou quarto">
            <input id="room" type="text" formControlName="room" />
          </app-field>

          <app-field for="hospital" label="Hospital" optional>
            <input id="hospital" type="text" formControlName="hospital" />
          </app-field>

          <app-field for="admissionDate" label="Data da internação">
            <input id="admissionDate" type="date" formControlName="admissionDate" />
          </app-field>

          <app-handoff-rules-fields [group]="handoff" />
          <p class="card__text">
            A janela e o mínimo valem para os próximos turnos. Os turnos já marcados não são
            reescritos.
          </p>

          <app-button
            type="submit"
            block
            [disabled]="form.invalid || handoff.invalid"
            [loading]="saving()"
          >
            Salvar
          </app-button>
        </form>
      </section>

      @if (isOwner()) {
        <section class="card card--danger">
          <h2>Apagar paciente</h2>
          <p class="card__text">
            Apaga o cadastro e derruba o link do calendário. Não há como desfazer.
          </p>

          <app-button variant="danger" block [loading]="deleting()" (click)="remove()">
            Apagar {{ patient()?.name }}
          </app-button>
        </section>
      }
    </div>
  `,
  styles: `
    .card {
      margin-bottom: var(--space-5);
      padding: var(--space-4);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }

    .card--danger {
      border-color: var(--color-danger);
    }

    .card h2 {
      margin-bottom: var(--space-2);
      font-size: var(--font-size-md);
    }

    .card__text {
      margin-bottom: var(--space-3);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .card__actions {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .link-box {
      margin-bottom: var(--space-3);
      padding: var(--space-3);
      background: var(--color-surface-sunken);
      border-radius: var(--radius-sm);
      overflow-x: auto;
    }

    .link-box__url {
      font-size: var(--font-size-sm);
      white-space: nowrap;
    }

    .toggle {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
      cursor: pointer;
    }

    .toggle input {
      width: 1.5rem;
      height: 1.5rem;
      margin-top: 2px;
      flex-shrink: 0;
      accent-color: var(--color-primary);
    }

    .toggle span {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .toggle__hint {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class PatientSettingsPage {
  readonly patientId = input.required<string>();

  private readonly auth = inject(AuthService);
  private readonly patientAccess = inject(PatientAccessService);
  private readonly patients = inject(PatientsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly saving = signal(false);
  protected readonly deleting = signal(false);

  protected readonly patient = toSignal(
    toObservable(this.patientId).pipe(switchMap((id) => this.patientAccess.watch(id))),
    { initialValue: null },
  );

  protected readonly isOwner = computed(() => this.patient()?.ownerId === this.auth.uid());

  protected readonly publicUrl = computed(() => `${location.origin}/p/${this.patientId()}`);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    room: ['', [Validators.required]],
    hospital: [''],
    admissionDate: ['', [Validators.required]],
  });

  protected readonly handoff = createHandoffRulesGroup();

  constructor() {
    // Preenche o formulário quando o paciente chega, e só enquanto ninguém estiver
    // editando: reescrever o campo embaixo do dedo de quem digita é pior do que
    // mostrar um valor um segundo desatualizado.
    effect(() => {
      const patient = this.patient();
      if (!patient || this.form.dirty || this.handoff.dirty) {
        return;
      }

      this.form.setValue({
        name: patient.name,
        room: patient.room,
        hospital: patient.hospital ?? '',
        admissionDate: patient.admissionDate,
      });
      const rules = handoffRulesOf(patient);
      this.handoff.setValue({
        windowStart: rules.windowStart,
        windowEnd: rules.windowEnd,
        minStayHours: rules.minStayMinutes / 60,
      });
    });
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.publicUrl());
      this.toast.success('Link copiado. Agora é só colar no grupo da família.');
    } catch {
      // A API de área de transferência falha em contexto não seguro e em alguns
      // navegadores antigos; o link continua visível na tela para copiar à mão.
      this.toast.error('Não foi possível copiar. Selecione o link acima e copie manualmente.');
    }
  }

  protected async togglePublicAccess(event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked;

    try {
      await this.patients.setPublicAccess(this.patientId(), enabled);
      this.toast.success(enabled ? 'Link ativado.' : 'Link desativado.');
    } catch {
      this.toast.error('Não foi possível alterar o link. Tente de novo.');
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.handoff.invalid) {
      return;
    }

    this.saving.set(true);
    const { name, room, hospital, admissionDate } = this.form.getRawValue();

    try {
      await this.patients.update(this.patientId(), {
        name: name.trim(),
        room: room.trim(),
        hospital: hospital.trim() || null,
        admissionDate,
        ...toPatientFields(handoffRulesFrom(this.handoff)),
      });

      this.form.markAsPristine();
      this.handoff.markAsPristine();
      this.toast.success('Dados atualizados.');
    } catch {
      this.toast.error('Não foi possível salvar. Tente de novo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const patient = this.patient();
    if (!patient) {
      return;
    }

    const confirmed = confirm(
      `Apagar o cadastro de ${patient.name}?\n\n` +
        'O link do calendário deixa de funcionar para toda a família. Não há como desfazer.',
    );

    if (!confirmed) {
      return;
    }

    this.deleting.set(true);
    try {
      await this.patients.remove(this.patientId());
      this.toast.success('Paciente apagado.');
      await this.router.navigateByUrl('/pacientes');
    } catch {
      this.toast.error('Não foi possível apagar. Tente de novo.');
    } finally {
      this.deleting.set(false);
    }
  }
}
