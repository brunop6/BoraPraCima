import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map, startWith } from 'rxjs';

import { memberColorOf } from '../../../../core/color/member-color';
import { HandoffRules } from '../../../../core/patient/handoff-rules';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { FieldComponent } from '../../../../core/ui/field/field.component';
import { SheetComponent } from '../../../../core/ui/sheet/sheet.component';
import { IsoDate, formatDayMonth, weekdayLong } from '../../../../core/utils/date.util';
import {
  Time,
  crossesMidnight,
  formatDuration,
  formatMinutes,
  isValidTime,
} from '../../../../core/utils/time.util';
import { FamilyMember } from '../../../patients/models/family-member.model';
import { Companion } from '../../models/companion.model';
import { describeShiftIssues, validateShift } from '../../utils/shift-rules.util';

/** Data e horários que o painel abre preenchidos ao tocar numa lacuna. */
export interface ShiftPrefill {
  date: IsoDate;
  startTime: Time;
  endTime: Time;
}

/** Quem vai fazer o turno: alguém já cadastrado ou um nome novo a cadastrar. */
export type MemberChoice =
  | { kind: 'existing'; member: FamilyMember }
  | { kind: 'new'; name: string };

export interface ShiftSubmit {
  date: IsoDate;
  startTime: Time;
  endTime: Time;
  who: MemberChoice;
}

/**
 * O painel de um turno: criar um novo ou editar um existente.
 *
 * Toda a edição acontece aqui, em um painel só: quem faz o turno, data e horários,
 * cadastrar um familiar que ainda não existe e apagar. Espalhar isso por telas
 * diferentes obrigaria quem tem pouca prática digital a aprender um caminho para
 * cada tarefa.
 *
 * As regras do hospital (janela de revezamento, permanência mínima, sobreposição)
 * são conferidas a cada tecla e o botão de salvar só habilita quando o turno vale.
 * O componente não escreve no Firestore: emite a intenção e a página decide.
 */
@Component({
  selector: 'app-shift-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SheetComponent, ButtonComponent, FieldComponent],
  template: `
    <app-sheet [title]="title()" [subtitle]="subtitle()" (dismissed)="dismissed.emit()">
      <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
        <fieldset class="who">
          <legend>Quem vai acompanhar</legend>

          <div class="options" role="radiogroup" aria-label="Quem vai acompanhar">
            @for (member of choosableMembers(); track member.id) {
              <button
                type="button"
                class="option"
                role="radio"
                [attr.aria-checked]="selectedMemberId() === member.id"
                [class.is-selected]="selectedMemberId() === member.id"
                [disabled]="saving()"
                (click)="pick(member.id)"
              >
                <span class="option__mark" aria-hidden="true">
                  {{ selectedMemberId() === member.id ? '●' : '○' }}
                </span>
                <span class="option__name">{{ member.name }}</span>
                <span
                  class="option__color"
                  aria-hidden="true"
                  [style.background]="colorOf(member)"
                ></span>
              </button>
            }
          </div>

          @if (choosableMembers().length === 0) {
            <p class="hint">Ninguém cadastrado ainda. Escreva o nome de quem vai acompanhar.</p>
          }

          <app-field for="new-member" label="Ou cadastrar alguém novo">
            <input
              id="new-member"
              type="text"
              formControlName="newName"
              placeholder="Nome de quem vai acompanhar"
              autocomplete="off"
              (input)="selectedMemberId.set(null)"
            />
          </app-field>
        </fieldset>

        <app-field for="shift-date" label="Dia em que começa">
          <select id="shift-date" formControlName="date">
            @for (date of dateOptions(); track date) {
              <option [value]="date">{{ dateLabel(date) }}</option>
            }
          </select>
        </app-field>

        <div class="times">
          <app-field for="start-time" label="Chega às">
            <input id="start-time" type="time" formControlName="startTime" />
          </app-field>

          <app-field for="end-time" label="Sai às">
            <input id="end-time" type="time" formControlName="endTime" />
          </app-field>
        </div>

        <p class="hint">
          Troca entre {{ rules().windowStart }} e {{ rules().windowEnd }}, com pelo menos
          {{ minimumLabel() }} de permanência.
        </p>

        @if (summary(); as text) {
          <p class="summary">{{ text }}</p>
        }

        @if (messages().length > 0) {
          <ul class="problems" role="alert">
            @for (message of messages(); track message) {
              <li><span aria-hidden="true">⚠</span> {{ message }}</li>
            }
          </ul>
        }

        <app-button type="submit" block [disabled]="!canSave()" [loading]="saving()">
          {{ companion() ? 'Salvar turno' : 'Adicionar turno' }}
        </app-button>

        @if (companion()) {
          <app-button variant="danger" block [loading]="saving()" (click)="removed.emit()">
            Apagar este turno
          </app-button>
        }
      </form>
    </app-sheet>
  `,
  styles: `
    .who {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      border: 0;
    }

    legend {
      padding: 0;
      margin-bottom: var(--space-2);
      font-weight: var(--font-weight-semibold);
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .option {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      /* Lista de toque, não de leitura: alvos grandes e bem separados. */
      min-height: var(--touch-target);
      padding: var(--space-2) var(--space-3);
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      text-align: left;
      cursor: pointer;
    }

    .option.is-selected {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }

    .option__mark {
      font-size: var(--font-size-lg);
      line-height: 1;
      color: var(--color-primary);
    }

    .option__name {
      flex: 1;
      font-size: var(--font-size-md);
    }

    /* Só reforço: quem é continua dito pelo nome. */
    .option__color {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-full);
    }

    .times {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }

    .hint {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .summary {
      margin: 0;
      font-weight: var(--font-weight-medium);
    }

    .problems {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--color-danger);
      font-size: var(--font-size-sm);
    }
  `,
})
export class ShiftSheetComponent implements OnInit {
  /** Presente ao editar um turno existente; ausente ao criar. */
  readonly companion = input<Companion | null>(null);
  /** Ao criar a partir de uma lacuna, o que ela já sabe. */
  readonly prefill = input<ShiftPrefill | null>(null);
  readonly members = input.required<FamilyMember[]>();
  /** Os dias em que o turno pode começar: os visíveis, cujos vizinhos estão carregados. */
  readonly dates = input.required<IsoDate[]>();
  /** Turnos carregados, para a conferência de sobreposição. */
  readonly existing = input.required<Companion[]>();
  readonly rules = input.required<HandoffRules>();
  readonly saving = input(false);

  readonly submitted = output<ShiftSubmit>();
  readonly removed = output<void>();
  readonly dismissed = output<void>();

  protected readonly selectedMemberId = signal<string | null>(null);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    date: '',
    startTime: '',
    endTime: '',
    newName: '',
  });

  private readonly values = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly title = computed(() => {
    const companion = this.companion();
    return companion
      ? `${weekdayLong(companion.date)}, ${formatDayMonth(companion.date)}`
      : 'Novo turno';
  });

  protected readonly subtitle = computed(() =>
    this.companion()?.familyMemberName ?? 'Quem fica, quando chega e quando sai',
  );

  /** O familiar já escalado continua na lista mesmo se foi desativado depois. */
  protected readonly choosableMembers = computed(() => {
    const assigned = this.companion()?.familyMemberId;
    return this.members().filter((member) => member.active || member.id === assigned);
  });

  /** Editar um turno de ontem (a continuação na primeira coluna) precisa do dia dele. */
  protected readonly dateOptions = computed(() => {
    const own = this.companion()?.date;
    const dates = this.dates();
    return own && !dates.includes(own) ? [own, ...dates] : dates;
  });

  protected readonly minimumLabel = computed(() => formatMinutes(this.rules().minStayMinutes));

  private readonly complete = computed(() => {
    const { date, startTime, endTime } = this.values();
    return !!date && isValidTime(startTime) && isValidTime(endTime);
  });

  protected readonly messages = computed(() => {
    if (!this.complete()) {
      return [];
    }

    const candidate = this.candidate();
    const issues = validateShift(candidate, this.existing(), this.rules());
    return describeShiftIssues(issues, candidate, this.rules());
  });

  protected readonly summary = computed(() => {
    if (!this.complete()) {
      return null;
    }

    const { startTime, endTime } = this.values();
    const nextDay = crossesMidnight(startTime, endTime) ? ', termina no dia seguinte' : '';
    return `Fica ${formatDuration(startTime, endTime)}${nextDay}.`;
  });

  private readonly hasMember = computed(
    () => this.selectedMemberId() !== null || this.values().newName.trim().length >= 2,
  );

  protected readonly canSave = computed(
    () => this.complete() && this.messages().length === 0 && this.hasMember() && !this.saving(),
  );

  ngOnInit(): void {
    const companion = this.companion();
    const start = companion ?? this.prefill();

    this.form.patchValue({
      date: start?.date ?? this.dates()[0],
      startTime: start?.startTime ?? '',
      endTime: start?.endTime ?? '',
    });
    this.selectedMemberId.set(companion?.familyMemberId ?? null);
  }

  protected dateLabel(date: IsoDate): string {
    return `${weekdayLong(date)}, ${formatDayMonth(date)}`;
  }

  protected colorOf(member: FamilyMember): string {
    return memberColorOf(member.id, member.color);
  }

  protected pick(memberId: string): void {
    this.selectedMemberId.set(memberId);
    this.form.controls.newName.reset('');
  }

  protected submit(): void {
    if (!this.canSave()) {
      return;
    }

    const { date, startTime, endTime, newName } = this.form.getRawValue();
    const member = this.members().find((option) => option.id === this.selectedMemberId());

    this.submitted.emit({
      date,
      startTime,
      endTime,
      who: member ? { kind: 'existing', member } : { kind: 'new', name: newName.trim() },
    });
  }

  private candidate() {
    const { date, startTime, endTime } = this.values();
    return { id: this.companion()?.id, date, startTime, endTime };
  }
}
