import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import {
  DEFAULT_HANDOFF_RULES,
  HandoffRules,
  MIN_STAY_LIMITS,
  validateHandoffRules,
} from '../../../../core/patient/handoff-rules';
import { FieldComponent } from '../../../../core/ui/field/field.component';

/**
 * Formulário da janela de revezamento. A permanência mínima é digitada em horas
 * (é como o hospital fala) e guardada em minutos, como o restante do sistema.
 */
export type HandoffRulesGroup = FormGroup<{
  windowStart: FormControl<string>;
  windowEnd: FormControl<string>;
  minStayHours: FormControl<number>;
}>;

export function createHandoffRulesGroup(
  rules: HandoffRules = DEFAULT_HANDOFF_RULES,
): HandoffRulesGroup {
  return new FormGroup(
    {
      windowStart: new FormControl(rules.windowStart, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      windowEnd: new FormControl(rules.windowEnd, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      minStayHours: new FormControl(rules.minStayMinutes / 60, {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: handoffRulesValidator },
  );
}

export function handoffRulesFrom(group: HandoffRulesGroup): HandoffRules {
  const { windowStart, windowEnd, minStayHours } = group.getRawValue();
  return {
    windowStart,
    windowEnd,
    minStayMinutes: Math.round(Number(minStayHours) * 60),
  };
}

function handoffRulesValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as HandoffRulesGroup;
  const issues = validateHandoffRules(handoffRulesFrom(group));
  return issues.length > 0 ? { handoff: issues } : null;
}

@Component({
  selector: 'app-handoff-rules-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FieldComponent],
  template: `
    <fieldset class="rules" [formGroup]="group()">
      <legend>Revezamento no hospital</legend>
      <p class="rules__text">
        A troca de acompanhante só pode acontecer dentro desta janela, e quem está no turno
        precisa ter ficado o tempo mínimo antes de sair.
      </p>

      <div class="rules__window">
        <app-field for="windowStart" label="Troca a partir de">
          <input id="windowStart" type="time" formControlName="windowStart" />
        </app-field>

        <app-field for="windowEnd" label="Troca até">
          <input id="windowEnd" type="time" formControlName="windowEnd" />
        </app-field>
      </div>

      <app-field
        for="minStayHours"
        label="Permanência mínima (horas)"
        hint="Quanto tempo seguido cada acompanhante precisa ficar."
      >
        <input
          id="minStayHours"
          type="number"
          inputmode="decimal"
          formControlName="minStayHours"
          [min]="minHours"
          max="24"
          step="0.5"
        />
      </app-field>

      @if (error(); as message) {
        <p class="rules__error" role="alert">
          <span aria-hidden="true">⚠</span> {{ message }}
        </p>
      }
    </fieldset>
  `,
  styles: `
    .rules {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      padding: 0;
      font-weight: var(--font-weight-semibold);
    }

    .rules__text {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }

    .rules__error {
      margin: 0;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }

    .rules__window {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
  `,
})
export class HandoffRulesFieldsComponent {
  readonly group = input.required<HandoffRulesGroup>();

  protected readonly minHours = MIN_STAY_LIMITS.min / 60;

  /** Um único aviso para a janela e o mínimo: as regras se validam em conjunto. */
  protected error(): string | null {
    const group = this.group();
    if (!group.dirty && !group.touched) {
      return null;
    }
    const issues = group.errors?.['handoff'] as string[] | undefined;
    return issues?.[0] ?? null;
  }
}
