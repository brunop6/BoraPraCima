import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {
  IsoDate,
  dayNumber,
  isPast,
  isToday,
  weekdayLong,
  weekdayShort,
} from '../../../../core/utils/date.util';
import { minutesToTime, nowMinutes } from '../../../../core/utils/time.util';
import { Companion } from '../../models/companion.model';
import { DayLayout, HourWindow, VacantGap, densityOf, positionOf } from '../../utils/day-layout.util';
import { CompanionCardComponent } from '../companion-card/companion-card.component';
import { VacantGapComponent } from '../vacant-gap/vacant-gap.component';

/**
 * A tela principal: os dias lado a lado, com eixo de horas à esquerda.
 *
 * Um dia, três ou sete: quantas colunas há é o tamanho de `days()`. Três é a visão
 * de partida, porque é o que cabe num celular sem que os nomes virem abreviações —
 * e é a mesma leitura que a família já conhece da agenda do telefone. A semana
 * espreme sete colunas na largura da tela em vez de rolar de lado, para que o
 * cabeçalho dos dias continue fixo; por isso os cards ficam compactos nela (veja
 * `ColumnDensity`).
 *
 * O mesmo componente serve a visão privada e a pública; `readonly` desliga os
 * toques. Duplicar essa tela para a versão pública garantiria que as duas
 * divergissem com o tempo.
 */
@Component({
  selector: 'app-three-day-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompanionCardComponent, VacantGapComponent],
  template: `
    <div
      class="calendar"
      [class.is-wide]="density() === 'wide'"
      [class.is-compact]="density() === 'compact'"
      [style.--columns]="days().length"
    >
      <div class="calendar__header">
        <div class="calendar__axis-head" aria-hidden="true"></div>

        @for (day of days(); track day.date) {
          <div
            class="calendar__day"
            [class.is-today]="today(day.date)"
            [class.is-past]="past(day.date)"
          >
            <!-- "Hoje" escrito: o amarelo sozinho não diz qual é o dia. -->
            <span class="calendar__weekday">{{ weekdayLabel(day.date) }}</span>
            <span class="calendar__daynumber">{{ dayOf(day.date) }}</span>
          </div>
        }
      </div>

      <div class="calendar__body" [style.height.rem]="bodyHeight()">
        <div class="calendar__axis">
          @for (hour of window().hours; track hour) {
            <span class="calendar__hour">{{ hourLabel(hour) }}</span>
          }
        </div>

        <div class="calendar__grid" [style.--hour-height]="hourHeightRem() + 'rem'">
          @for (day of days(); track day.date) {
            <div class="calendar__column" [class.is-past]="past(day.date)">
              @if (today(day.date) && nowPosition() !== null) {
                <div class="calendar__now" [style.top.%]="nowPosition()" aria-hidden="true"></div>
              }

              @for (gap of day.gaps; track gap.startMinutes) {
                <app-vacant-gap
                  [gap]="gap"
                  [density]="density()"
                  [readonly]="readonly()"
                  (chosen)="gapChosen.emit($event)"
                />
              }

              @for (item of day.items; track item.companion.id) {
                <app-companion-card
                  [item]="item"
                  [density]="density()"
                  [readonly]="readonly()"
                  [past]="past(day.date)"
                  (chosen)="companionChosen.emit($event)"
                />
              }

              @if (day.items.length === 0 && day.gaps.length === 0) {
                <p class="calendar__empty">Sem turnos</p>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .calendar {
      --axis-width: 3.25rem;
      background: var(--color-surface);
    }

    /* "13:00" no eixo ainda cabe em 2,5rem; o que sobra vai para as colunas. */
    .calendar.is-compact {
      --axis-width: 2.5rem;
    }

    .calendar__header {
      display: grid;
      grid-template-columns: var(--axis-width) repeat(var(--columns), minmax(0, 1fr));
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    /* O canto sobre o eixo continua a faixa rebaixada das horas. */
    .calendar__axis-head {
      background: var(--color-surface);
    }

    .calendar__day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-1) 10px;
      border-left: 1px solid var(--color-border);
    }

    .calendar__day.is-past {
      background: var(--color-surface-sunken);
    }

    /* Um dia só: sobra largura, então o número e o nome do dia ficam lado a lado. */
    .is-wide .calendar__day {
      flex-direction: row;
      justify-content: center;
      gap: var(--space-3);
    }

    .is-wide .calendar__weekday {
      font-size: var(--font-size-md);
    }

    /* Sete colunas de ~48px: menos respiro, para "Hoje" e o número caberem. */
    .is-compact .calendar__day {
      padding-inline: 2px;
    }

    /* Sem caixa alta: ela fica reservada para VAGO, +1, ↑ ONTEM e LINK DESLIGADO. */
    .calendar__weekday {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-muted);
    }

    .calendar__daynumber {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius-full);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
    }

    .calendar__day.is-past .calendar__daynumber {
      color: var(--color-text-muted);
    }

    .calendar__day.is-today .calendar__weekday {
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }

    /* O marcador de hoje é o único amarelo da tela. */
    .calendar__day.is-today .calendar__daynumber {
      background: var(--color-accent);
      color: var(--color-accent-contrast);
    }

    .calendar__body {
      display: grid;
      grid-template-columns: var(--axis-width) 1fr;
      /*
       * Contexto de empilhamento próprio: o z-index dos cards e da linha de "agora"
       * vale só aqui dentro. Sem isto eles disputam camada com o cabeçalho fixo e, por
       * virem depois no DOM, passam por cima dele ao rolar e escondem o dia.
       */
      isolation: isolate;
    }

    .calendar__axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-right: var(--space-2);
      text-align: right;
      background: var(--color-surface);
    }

    .is-compact .calendar__axis {
      padding-right: var(--space-1);
    }

    .calendar__hour {
      /* Alinhado pelo topo, logo abaixo da linha da hora. Centralizar sobre a linha
         cortaria metade do primeiro rótulo contra o cabeçalho. */
      line-height: 1;
      font-size: var(--font-size-xs);
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }

    .calendar__grid {
      display: grid;
      grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    }

    .calendar__column {
      position: relative;
      border-left: 1px solid var(--color-border);
      /* As linhas de hora são o próprio fundo — nada de um elemento por hora. */
      background:
        repeating-linear-gradient(
          to bottom,
          var(--color-grid) 0 1px,
          transparent 1px var(--hour-height)
        ),
        var(--color-surface-sunken);
    }

    .calendar__column.is-past {
      background:
        repeating-linear-gradient(
          to bottom,
          var(--color-grid) 0 1px,
          transparent 1px var(--hour-height)
        ),
        var(--color-surface-sunken);
    }

    .calendar__now {
      position: absolute;
      inset: auto 0 auto 0;
      height: 2px;
      margin-top: -1px;
      background: var(--color-now-line);
      z-index: 2;
    }

    .calendar__now::before {
      content: '';
      position: absolute;
      left: -5px;
      top: -4px;
      width: 10px;
      height: 10px;
      border-radius: var(--radius-full);
      background: var(--color-now-line);
    }

    .calendar__empty {
      position: absolute;
      inset: var(--space-4) 0 auto;
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .is-compact .calendar__empty {
      font-size: var(--font-size-xs);
    }
  `,
})
export class ThreeDayViewComponent {
  readonly days = input.required<DayLayout[]>();
  readonly window = input.required<HourWindow>();
  /** `<app-three-day-view readonly>` na tela pública: nenhum card responde a toque. */
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly timezone = input('America/Sao_Paulo');

  readonly companionChosen = output<Companion>();
  readonly gapChosen = output<VacantGap>();

  protected readonly density = computed(() => densityOf(this.days().length));

  /** Altura de uma hora. Fixa, para que turnos curtos continuem legíveis. */
  protected readonly hourHeightRem = computed(() => 3.5);

  protected readonly bodyHeight = computed(() => {
    const spanHours = (this.window().endMinutes - this.window().startMinutes) / 60;
    return spanHours * this.hourHeightRem();
  });

  /**
   * A linha do "agora" precisa andar sozinha. Sem este tique de um minuto ela
   * congelaria na hora em que a tela foi montada — e uma linha parada apontando o
   * horário errado é pior do que não ter linha.
   */
  private readonly minuteTick = signal(nowMinutes(this.timezone()));

  protected readonly nowPosition = computed(() => positionOf(this.minuteTick(), this.window()));

  constructor() {
    const interval = setInterval(() => this.minuteTick.set(nowMinutes(this.timezone())), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(interval));
  }

  /**
   * O nome do dia no cabeçalho. Por extenso quando há uma coluna só, abreviado quando
   * há várias; hoje leva "Hoje" no lugar do abreviado, e "Hoje ·" na frente do extenso.
   */
  protected weekdayLabel(date: IsoDate): string {
    const today = isToday(date);

    if (this.density() === 'wide') {
      return today ? `Hoje · ${weekdayLong(date)}` : weekdayLong(date);
    }
    return today ? 'Hoje' : weekdayShort(date);
  }

  protected dayOf(date: IsoDate): string {
    return dayNumber(date);
  }

  protected today(date: IsoDate): boolean {
    return isToday(date);
  }

  protected past(date: IsoDate): boolean {
    return isPast(date);
  }

  protected hourLabel(hour: number): string {
    return minutesToTime(hour * 60);
  }
}
