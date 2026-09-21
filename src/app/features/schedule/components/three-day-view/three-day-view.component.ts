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
  weekdayShort,
} from '../../../../core/utils/date.util';
import { minutesToTime, nowMinutes } from '../../../../core/utils/time.util';
import { Companion } from '../../models/companion.model';
import { DayLayout, HourWindow, VacantGap, positionOf } from '../../utils/day-layout.util';
import { CompanionCardComponent } from '../companion-card/companion-card.component';
import { VacantGapComponent } from '../vacant-gap/vacant-gap.component';

/**
 * A tela principal: três dias lado a lado, com eixo de horas à esquerda.
 *
 * Três dias porque é o que cabe num celular sem que os nomes virem abreviações — e
 * é a mesma leitura que a família já conhece da agenda do telefone.
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
    <div class="calendar">
      <div class="calendar__header">
        <div class="calendar__axis-head" aria-hidden="true"></div>

        @for (day of days(); track day.date) {
          <div class="calendar__day" [class.is-today]="today(day.date)">
            <span class="calendar__weekday">{{ weekday(day.date) }}</span>
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

        <div class="calendar__grid" [style.background-size]="'100% ' + hourHeightRem() + 'rem'">
          @for (day of days(); track day.date) {
            <div class="calendar__column" [class.is-today]="today(day.date)">
              @if (today(day.date) && nowPosition() !== null) {
                <div class="calendar__now" [style.top.%]="nowPosition()" aria-hidden="true"></div>
              }

              @for (gap of day.gaps; track gap.startMinutes) {
                <app-vacant-gap [gap]="gap" [readonly]="readonly()" (chosen)="gapChosen.emit($event)" />
              }

              @for (item of day.items; track item.companion.id) {
                <app-companion-card
                  [item]="item"
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

    .calendar__header {
      display: grid;
      grid-template-columns: var(--axis-width) repeat(3, 1fr);
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .calendar__day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: var(--space-2) var(--space-1);
      border-left: 1px solid var(--color-border);
    }

    .calendar__weekday {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .calendar__daynumber {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius-full);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
    }

    .calendar__day.is-today .calendar__weekday {
      color: var(--color-primary-strong);
    }

    .calendar__day.is-today .calendar__daynumber {
      background: var(--color-primary);
      color: var(--color-primary-contrast);
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
    }

    .calendar__hour {
      /* Alinhado pelo topo, logo abaixo da linha da hora. Centralizar sobre a linha
         cortaria metade do primeiro rótulo contra o cabeçalho. */
      line-height: 1;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .calendar__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      /* As linhas de hora são o próprio fundo — nada de um elemento por hora. */
      background-image: linear-gradient(to bottom, var(--color-border) 1px, transparent 1px);
      background-repeat: repeat-y;
    }

    .calendar__column {
      position: relative;
      border-left: 1px solid var(--color-border);
    }

    .calendar__column.is-today {
      background: color-mix(in srgb, var(--color-primary-soft) 45%, transparent);
    }

    .calendar__now {
      position: absolute;
      inset: auto 0 auto 0;
      height: 2px;
      background: var(--color-now-line);
      z-index: 2;
    }

    .calendar__now::before {
      content: '';
      position: absolute;
      left: -4px;
      top: -3px;
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--color-now-line);
    }

    .calendar__empty {
      position: absolute;
      inset: var(--space-4) 0 auto;
      text-align: center;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
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

  protected weekday(date: IsoDate): string {
    return weekdayShort(date);
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
