import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { toPatientFields } from '../../../../core/patient/handoff-rules';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import { todayIso } from '../../../../core/utils/date.util';
import {
  HandoffRulesFieldsComponent,
  createHandoffRulesGroup,
  handoffRulesFrom,
} from '../../components/handoff-rules-fields/handoff-rules-fields.component';
import { PatientsService } from '../../services/patients.service';

@Component({
  selector: 'app-patient-form-page',
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
      <a class="back" routerLink="/pacientes">‹ Voltar</a>

      <h1>Cadastrar paciente</h1>
      <p class="intro">Depois disso você já pode escalar os acompanhantes no calendário.</p>

      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        <app-field for="name" label="Nome do paciente" [error]="errorFor('name')">
          <input id="name" type="text" formControlName="name" autocomplete="off" />
        </app-field>

        <app-field
          for="room"
          label="Leito ou quarto"
          hint="Aparece para quem abrir o link do calendário."
          [error]="errorFor('room')"
        >
          <input id="room" type="text" formControlName="room" autocomplete="off" />
        </app-field>

        <app-field for="hospital" label="Hospital" optional hint="Fica visível só para você e os outros responsáveis.">
          <input id="hospital" type="text" formControlName="hospital" autocomplete="off" />
        </app-field>

        <app-field for="admissionDate" label="Data da internação" [error]="errorFor('admissionDate')">
          <input id="admissionDate" type="date" formControlName="admissionDate" />
        </app-field>

        <app-handoff-rules-fields [group]="handoff" />

        <app-button type="submit" size="lg" block [loading]="saving()">
          Cadastrar e abrir o calendário
        </app-button>
      </form>
    </div>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      min-height: var(--touch-target);
      margin-bottom: var(--space-2);
    }

    .intro {
      margin: var(--space-2) 0 var(--space-5);
      color: var(--color-text-muted);
    }
  `,
})
export class PatientFormPage {
  private readonly auth = inject(AuthService);
  private readonly patients = inject(PatientsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    room: ['', [Validators.required]],
    hospital: [''],
    admissionDate: [todayIso(), [Validators.required]],
  });

  protected readonly handoff = createHandoffRulesGroup();

  protected errorFor(control: 'name' | 'room' | 'admissionDate'): string | null {
    const field = this.form.controls[control];
    if (!field.touched || field.valid) {
      return null;
    }

    const messages = {
      name: 'Escreva o nome do paciente.',
      room: 'Informe o leito ou o quarto.',
      admissionDate: 'Informe a data da internação.',
    };

    return messages[control];
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.handoff.markAllAsTouched();
    if (this.form.invalid || this.handoff.invalid) {
      return;
    }

    const uid = this.auth.uid();
    if (!uid) {
      return;
    }

    this.saving.set(true);
    const { name, room, hospital, admissionDate } = this.form.getRawValue();

    try {
      const patientId = await this.patients.create(
        {
          name: name.trim(),
          room: room.trim(),
          hospital: hospital.trim() || null,
          admissionDate,
          ...toPatientFields(handoffRulesFrom(this.handoff)),
        },
        uid,
      );

      this.toast.success('Paciente cadastrado. Agora é só escalar os acompanhantes.');
      await this.router.navigate(['/pacientes', patientId]);
    } catch {
      this.toast.error('Não foi possível cadastrar. Verifique a conexão e tente de novo.');
    } finally {
      this.saving.set(false);
    }
  }
}
