import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import {
  DEFAULT_TRANSPARENCY,
  memberColorOf,
  nextFreeMemberColor,
  transparencyOf,
} from '../../../../core/color/member-color';
import { PatientAccessService } from '../../../../core/patient/patient-access.service';
import { DEFAULT_TIMEZONE } from '../../../../core/patient/patient.model';
import { SpinnerComponent } from '../../../../core/ui/spinner/spinner.component';
import { ToastService } from '../../../../core/ui/toast/toast.service';
import { formatDayMonth } from '../../../../core/utils/date.util';
import { minutesToTime } from '../../../../core/utils/time.util';
import { FamilyMember } from '../../../patients/models/family-member.model';
import { FamilyMembersService } from '../../../patients/services/family-members.service';
import {
  ShiftPrefill,
  ShiftSheetComponent,
  ShiftSubmit,
} from '../../components/shift-sheet/shift-sheet.component';
import { CalendarToolbarComponent } from '../../components/calendar-toolbar/calendar-toolbar.component';
import { ThreeDayViewComponent } from '../../components/three-day-view/three-day-view.component';
import { ViewSwitcherComponent } from '../../components/view-switcher/view-switcher.component';
import { Companion } from '../../models/companion.model';
import { CALENDAR_VIEWS } from '../../models/calendar-view.model';
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
  imports: [
    ThreeDayViewComponent,
    ShiftSheetComponent,
    SpinnerComponent,
    ViewSwitcherComponent,
    CalendarToolbarComponent,
  ],
  template: `
    <app-view-switcher
      [options]="views"
      [value]="store.view()"
      (changed)="store.setView($event)"
    />

    <app-calendar-toolbar
      [month]="store.monthLabel()"
      [step]="store.stepLabel()"
      (previous)="store.previous()"
      (next)="store.next()"
    />

    @if (store.isLoading()) {
      <app-spinner label="Carregando a escala…" />
    } @else {
      <app-three-day-view
        [days]="store.days()"
        [window]="store.window"
        [timezone]="timezone()"
        (companionChosen)="selectedId.set($event.id)"
        (gapChosen)="openNew($event)"
      />

      <!-- Só o "+": o nome acessível é que diz o que ele faz. -->
      <button type="button" class="add" aria-label="Adicionar turno" (click)="openNew(null)">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
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

    /**
     * Flutua no canto inferior direito, acima da barra de abas. Verde cheio com
     * sombra: é o que paira por cima do calendário, e nada mais na tela usa isso.
     */
    .add {
      position: fixed;
      right: max(var(--space-4), env(safe-area-inset-right));
      bottom: calc(var(--tabbar-height) + var(--space-4) + env(safe-area-inset-bottom));
      z-index: var(--z-header);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      padding: 0;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      /* No escuro o verde do botão encosta no dos cards: o contorno o destaca. */
      border: 1px solid var(--color-primary-edge);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-2);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .add:hover {
      background: var(--color-primary-hover);
    }

    /* O anel de foco precisa do afastamento pintado para não sumir no verde. */
    .add:focus-visible {
      /* O foco global troca o raio para --radius-sm; o botão continua redondo. */
      border-radius: var(--radius-full);
      outline-offset: 2px;
      box-shadow: 0 0 0 2px var(--color-surface), var(--shadow-2);
    }
  `,
})
export class CalendarPage {
  /** Vem da rota, via `withComponentInputBinding()`. */
  readonly patientId = input.required<string>();

  protected readonly store = inject(CalendarStore);
  protected readonly views = CALENDAR_VIEWS;

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
      const { id, name, color, transparency } = submit.who.member;
      return {
        id,
        name,
        color: memberColorOf(id, color),
        transparency: transparencyOf(transparency),
      };
    }

    // Quem nasce aqui já entra com uma cor que ninguém da família usa ainda.
    const color = nextFreeMemberColor(this.members().map((member) => member.color));
    const transparency = DEFAULT_TRANSPARENCY;
    const id = await this.familyMembers.create(this.patientId(), submit.who.name, {
      color,
      transparency,
    });
    return { id, name: submit.who.name, color, transparency };
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
