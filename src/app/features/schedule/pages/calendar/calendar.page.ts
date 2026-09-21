import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { PatientAccessService } from '../../../../core/patient/patient-access.service';
import { DEFAULT_TIMEZONE } from '../../../../core/patient/patient.model';
import { ButtonComponent } from '../../../../core/ui/button/button.component';
import { SpinnerComponent } from '../../../../core/ui/spinner/spinner.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import { formatDayMonth, formatRange } from '../../../../core/utils/date.util';
import { minutesToTime } from '../../../../core/utils/time.util';
import { FamilyMember } from '../../../patients/models/family-member.model';
import { FamilyMembersService } from '../../../patients/services/family-members.service';
import {
  ShiftPrefill,
  ShiftSheetComponent,
  ShiftSubmit,
} from '../../components/shift-sheet/shift-sheet.component';
import { ThreeDayViewComponent } from '../../components/three-day-view/three-day-view.component';
import { Companion } from '../../models/companion.model';
import { CalendarStore } from '../../services/calendar.store';
import { CompanionAssignment, CompanionsService } from '../../services/companions.service';
import { VacantGap } from '../../utils/day-layout.util';

/**
 * A tela principal de quem administra o paciente.
 *
 * O caminho que ela precisa garantir é curto: abrir, enxergar o que está "Vago",
 * tocar e escalar alguém. Tudo o mais é secundário e fica atrás de um toque a mais.
 */
@Component({
  selector: 'app-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CalendarStore],
  imports: [ThreeDayViewComponent, ShiftSheetComponent, ButtonComponent, SpinnerComponent],
  template: `
    <div class="toolbar">
      <button type="button" class="toolbar__nav" (click)="store.previous()">
        <span class="sr-only">Três dias antes</span>
        <span aria-hidden="true">‹</span>
      </button>

      <p class="toolbar__range" aria-live="polite">{{ rangeLabel() }}</p>

      <button type="button" class="toolbar__nav" (click)="store.next()">
        <span class="sr-only">Três dias depois</span>
        <span aria-hidden="true">›</span>
      </button>

      <button
        type="button"
        class="toolbar__today"
        [disabled]="store.isShowingToday()"
        (click)="store.goToToday()"
      >
        Hoje
      </button>
    </div>

    @if (store.isLoading()) {
      <app-spinner label="Carregando a escala…" />
    } @else {
      <div class="add">
        <app-button block variant="secondary" (click)="openNew(null)">Adicionar turno</app-button>
      </div>

      <app-three-day-view
        [days]="store.days()"
        [window]="store.window"
        [timezone]="timezone()"
        (companionChosen)="selectedId.set($event.id)"
        (gapChosen)="openNew($event)"
      />

      <p class="legend">
        <span class="legend__swatch" aria-hidden="true"></span> Escalado
        <span class="legend__swatch legend__swatch--vacant" aria-hidden="true"></span> Vago
      </p>
    }

    @if (selected(); as companion) {
      <app-shift-sheet
        [companion]="companion"
        [members]="members()"
        [dates]="store.visibleDates()"
        [existing]="store.all()"
        [rules]="store.rules()"
        [saving]="saving()"
        (submitted)="update(companion, $event)"
        (removed)="removeCompanion(companion)"
        (dismissed)="selectedId.set(null)"
      />
    } @else if (creating()) {
      <app-shift-sheet
        [prefill]="prefill()"
        [members]="members()"
        [dates]="store.visibleDates()"
        [existing]="store.all()"
        [rules]="store.rules()"
        [saving]="saving()"
        (submitted)="create($event)"
        (dismissed)="creating.set(false)"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .toolbar__nav {
      width: var(--touch-target);
      height: var(--touch-target);
      flex-shrink: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xl);
      color: var(--color-text);
      cursor: pointer;
    }

    .toolbar__nav:hover {
      background: var(--color-surface-sunken);
    }

    .toolbar__range {
      flex: 1;
      text-align: center;
      font-weight: var(--font-weight-medium);
    }

    .toolbar__today {
      min-height: var(--touch-target);
      padding: 0 var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .toolbar__today:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .add {
      padding: var(--space-3) var(--page-gutter);
      border-bottom: 1px solid var(--color-border);
    }

    .legend {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      justify-content: center;
      padding: var(--space-3) var(--page-gutter) var(--space-6);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .legend__swatch {
      width: 1rem;
      height: 1rem;
      border-radius: var(--radius-sm);
      background: var(--color-primary-soft);
      border: 1px solid var(--color-primary);
    }

    .legend__swatch--vacant {
      margin-left: var(--space-3);
      background: var(--color-vacant-bg);
      border-color: var(--color-vacant-border);
      border-style: dashed;
    }
  `,
})
export class CalendarPage {
  /** Vem da rota, via `withComponentInputBinding()`. */
  readonly patientId = input.required<string>();

  protected readonly store = inject(CalendarStore);

  private readonly auth = inject(AuthService);
  private readonly patientAccess = inject(PatientAccessService);
  private readonly familyMembers = inject(FamilyMembersService);
  private readonly companionsService = inject(CompanionsService);
  private readonly toast = inject(ToastService);

  private readonly patientId$ = toObservable(this.patientId);

  protected readonly selectedId = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly prefill = signal<ShiftPrefill | null>(null);
  protected readonly saving = signal(false);

  private readonly patient = toSignal(
    this.patientId$.pipe(switchMap((id) => this.patientAccess.watch(id))),
    { initialValue: null },
  );

  protected readonly members = toSignal(
    this.patientId$.pipe(switchMap((id) => this.familyMembers.watch(id))),
    { initialValue: [] as FamilyMember[] },
  );

  /**
   * O turno aberto é reencontrado pela lista a cada emissão, em vez de guardado
   * como objeto: o painel sempre mostra a versão atual e se fecha sozinho se
   * outro admin apagar aquele turno enquanto ele está aberto.
   */
  protected readonly selected = computed(
    () => this.store.all().find((companion) => companion.id === this.selectedId()) ?? null,
  );

  protected readonly timezone = computed(() => this.patient()?.timezone ?? DEFAULT_TIMEZONE);

  protected readonly rangeLabel = computed(() => {
    const dates = this.store.visibleDates();
    return formatRange(dates[0], dates[dates.length - 1]);
  });

  constructor() {
    effect(() => this.store.patientId.set(this.patientId()));
    effect(() => this.store.patient.set(this.patient()));
  }

  /** Abre o painel de turno novo, já com os limites da lacuna tocada quando houver. */
  protected openNew(gap: VacantGap | null): void {
    this.prefill.set(
      gap
        ? {
            date: gap.date,
            startTime: minutesToTime(gap.startMinutes),
            endTime: minutesToTime(gap.endMinutes),
          }
        : null,
    );
    this.creating.set(true);
  }

  protected async create(submit: ShiftSubmit): Promise<void> {
    await this.withSaving(async (uid) => {
      const member = await this.resolveMember(submit);

      await this.companionsService.create(
        this.patientId(),
        {
          date: submit.date,
          startTime: submit.startTime,
          endTime: submit.endTime,
          member,
        },
        uid,
      );

      this.creating.set(false);
      this.toast.success(`${member.name} ficou com este turno.`);
    });
  }

  protected async update(companion: Companion, submit: ShiftSubmit): Promise<void> {
    await this.withSaving(async (uid) => {
      const member = await this.resolveMember(submit);
      const timesChanged =
        submit.date !== companion.date ||
        submit.startTime !== companion.startTime ||
        submit.endTime !== companion.endTime;

      if (timesChanged) {
        await this.companionsService.updateTimes(
          this.patientId(),
          companion.id,
          { date: submit.date, startTime: submit.startTime, endTime: submit.endTime },
          uid,
        );
      }

      if (member.id !== companion.familyMemberId) {
        await this.companionsService.changeMember(this.patientId(), companion.id, member, uid);
      }

      this.selectedId.set(null);
      this.toast.success('Turno atualizado.');
    });
  }

  /** Cadastra o familiar na hora, sem ida e volta até a tela de família. */
  private async resolveMember(submit: ShiftSubmit): Promise<CompanionAssignment> {
    if (submit.who.kind === 'existing') {
      return { id: submit.who.member.id, name: submit.who.member.name };
    }

    const id = await this.familyMembers.create(this.patientId(), submit.who.name);
    return { id, name: submit.who.name };
  }

  protected async removeCompanion(companion: Companion): Promise<void> {
    const confirmed = confirm(
      `Apagar o turno de ${companion.familyMemberName} (${companion.startTime} às ${companion.endTime}) em ${formatDayMonth(companion.date)}? O horário volta a ficar vago.`,
    );

    if (!confirmed) {
      return;
    }

    await this.withSaving(async () => {
      await this.companionsService.remove(this.patientId(), companion.id);
      this.selectedId.set(null);
      this.toast.success('Turno apagado.');
    });
  }

  private async withSaving(action: (uid: string) => Promise<void>): Promise<void> {
    const uid = this.auth.uid();
    if (!uid) {
      return;
    }

    this.saving.set(true);
    try {
      await action(uid);
    } catch {
      this.toast.error('Não foi possível salvar. Verifique a conexão e tente de novo.');
    } finally {
      this.saving.set(false);
    }
  }
}
