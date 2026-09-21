import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, map, of, switchMap, timer } from 'rxjs';

import { handoffRulesOf } from '../../../core/patient/handoff-rules';
import { DEFAULT_TIMEZONE, Patient } from '../../../core/patient/patient.model';
import { IsoDate, addDays, datesFrom, formatMonthYear, todayIso, weekDates } from '../../../core/utils/date.util';
import { nowMinutes } from '../../../core/utils/time.util';
import { CalendarView, DEFAULT_VIEW, calendarViewOf } from '../models/calendar-view.model';
import { Companion } from '../models/companion.model';
import { DayLayout, FULL_DAY_WINDOW, layoutDay } from '../utils/day-layout.util';
import { CalendarViewPreference } from './calendar-view-preference.service';
import { CompanionsService } from './companions.service';

/**
 * Estado da janela de dias visível no calendário.
 *
 * Fica num store em vez de dentro da página porque as duas telas — a privada e a
 * pública pelo link — mostram exatamente a mesma coisa. Cada página fornece a sua
 * instância (`providers: [CalendarStore]`), então navegar entre pacientes não
 * carrega estado de um para o outro.
 */
@Injectable()
export class CalendarStore {
  private readonly companionsService = inject(CompanionsService);
  private readonly preference = inject(CalendarViewPreference);

  readonly patientId = signal('');
  readonly anchorDate = signal<IsoDate>(todayIso());

  /** Abre na visão que a pessoa escolheu da última vez neste navegador, se houver. */
  readonly view = signal<CalendarView>(this.preference.read() ?? DEFAULT_VIEW);

  private readonly option = computed(() => calendarViewOf(this.view()));

  /** Quantos dias as setas andam, e o texto delas para leitor de tela. */
  readonly stepDays = computed(() => this.option().days);
  readonly stepLabel = computed(() => this.option().step);

  /**
   * O paciente, para a internação, o fuso e as regras de revezamento. Quem monta a
   * página o entrega aqui; enquanto for `null`, nada é pintado como vago.
   */
  readonly patient = signal<Patient | null>(null);

  readonly rules = computed(() => handoffRulesOf(this.patient() ?? {}));

  /**
   * A semana é sempre de domingo a sábado, seja qual for o dia âncora; dia e 3 dias
   * começam exatamente nele.
   */
  readonly visibleDates = computed(() =>
    this.view() === 'week' ? weekDates(this.anchorDate()) : datesFrom(this.anchorDate(), this.stepDays()),
  );

  /** `Setembro/2026`, do primeiro dia visível: a semana que cruza o mês fica com o de onde parte. */
  readonly monthLabel = computed(() => formatMonthYear(this.visibleDates()[0]));

  /**
   * Carrega um dia a mais de cada lado: a véspera traz o turno que vira a noite e
   * ocupa o começo da primeira coluna, e o dia seguinte é vizinho de um turno que
   * começa no último dia visível — a validação de sobreposição precisa dos dois.
   */
  private readonly source = computed(() => {
    const dates = this.visibleDates();
    return {
      patientId: this.patientId(),
      from: addDays(dates[0], -1),
      to: addDays(dates[dates.length - 1], 1),
    };
  });

  /** Tique de um minuto: o "vago" de hoje começa no agora, e o agora anda. */
  private readonly clock = toSignal(timer(0, 60_000).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });

  /** `null` enquanto carrega — distinguir de "carregou e está vazio" importa aqui. */
  private readonly companions = toSignal(
    toObservable(this.source).pipe(
      switchMap(({ patientId, from, to }): Observable<Companion[] | null> =>
        patientId ? this.companionsService.watchRange(patientId, from, to) : of([]),
      ),
    ),
    { initialValue: null as Companion[] | null },
  );

  readonly isLoading = computed(() => this.companions() === null);
  readonly hasCompanions = computed(() => (this.companions()?.length ?? 0) > 0);

  /**
   * Os turnos carregados, crus.
   *
   * A página guarda só o ID do turno aberto no painel e reencontra o documento
   * aqui — assim o painel enxerga a versão mais recente e fecha sozinho se outro
   * admin apagar aquele turno enquanto ele está aberto.
   */
  readonly all = computed(() => this.companions() ?? []);

  /** Sem lacunas antes de sabermos a internação: desconhecido não é vago. */
  private readonly vacancyContext = computed(() => {
    this.clock();
    const patient = this.patient();

    return {
      admissionDate: patient?.admissionDate ?? '9999-12-31',
      today: todayIso(),
      nowMinutes: nowMinutes(patient?.timezone ?? DEFAULT_TIMEZONE),
    };
  });

  readonly window = FULL_DAY_WINDOW;

  readonly days = computed<DayLayout[]>(() => {
    const companions = this.companions() ?? [];
    const context = this.vacancyContext();

    return this.visibleDates().map((date) => layoutDay(date, companions, this.window, context));
  });

  next(): void {
    this.anchorDate.update((date) => addDays(date, this.stepDays()));
  }

  previous(): void {
    this.anchorDate.update((date) => addDays(date, -this.stepDays()));
  }

  /**
   * Trocar de visualização volta para hoje: quem muda de "3 dias" para "Semana"
   * quer ver a semana de agora, não a que estava navegando. Tocar na que já está
   * marcada também volta, e é o caminho de volta para hoje sem um botão só para isso.
   *
   * A escolha é guardada; só ela, porque é o gesto da pessoa. Abrir na visão padrão
   * não grava nada.
   */
  setView(view: CalendarView): void {
    this.view.set(view);
    this.preference.write(view);
    this.anchorDate.set(todayIso());
  }
}
