import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';

import {
  memberColorOf,
  memberTextColors,
  transparencyOf,
} from '../../../../core/color/member-color';
import { formatTimeRange } from '../../../../core/utils/time.util';
import { PositionedCompanion } from '../../utils/day-layout.util';

/**
 * Um turno no calendário. O trecho sem ninguém é o `VacantGapComponent`, que escreve
 * "Vago": o estado vago nunca é comunicado só pela cor.
 */
@Component({
  selector: 'app-companion-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.top.%]': 'item().top',
    '[style.height.%]': 'item().height',
    '[style.left.%]': 'item().left',
    '[style.width.%]': 'item().width',
    '[style.--member-color]': 'color()',
    '[style.--member-weight]': 'weight()',
    '[style.--member-text-light]': 'text().light',
    '[style.--member-text-dark]': 'text().dark',
  },
  template: `
    <button
      type="button"
      class="card"
      [class.card--past]="past()"
      [class.card--static]="readonly()"
      [disabled]="readonly()"
      [attr.aria-label]="label()"
      (click)="chosen.emit(item().companion)"
    >
      <span class="card__name">{{ item().companion.familyMemberName }}</span>

      <span class="card__time">
        @if (item().continuesFromPrevious) {
          <span class="card__overnight" title="Começou no dia anterior">↑ ontem</span>
        }
        {{ time() }}
        @if (item().overnight) {
          <span class="card__overnight" title="Termina no dia seguinte">+1</span>
        }
      </span>

      @if (item().companion.note) {
        <span class="card__note">{{ item().companion.note }}</span>
      }
    </button>
  `,
  styles: `
    :host {
      position: absolute;
      /* Acima do "Vago", que pode ganhar altura mínima e encostar neste card. */
      z-index: 1;
      padding: 1px;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      height: 100%;
      /* O padding some em cards curtos; o conteúdo é que não pode vazar. */
      padding: var(--space-2);
      overflow: hidden;
      text-align: left;
      /*
       * A cor do familiar, com a transparência dele: a grade de horas aparece por baixo.
       * A borda fica cheia, então o card continua se destacando e a cor continua legível.
       */
      background: color-mix(in srgb, var(--member-color) var(--member-weight), transparent);
      border: 1px solid color-mix(in srgb, var(--member-color) 75%, #000);
      border-left-width: 4px;
      border-radius: var(--radius-sm);
      /* Texto calculado sobre a cor já misturada ao fundo de cada tema. */
      color: var(--member-text-light);
      cursor: pointer;
      transition: filter var(--transition-fast);
    }

    @media (prefers-color-scheme: dark) {
      .card {
        color: var(--member-text-dark);
      }
    }

    .card--past {
      opacity: 0.6;
    }

    .card--static {
      cursor: default;
    }

    .card:not(.card--static):hover {
      filter: brightness(0.97);
    }

    .card__name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      line-height: 1.2;
      /* Nome longo corta em duas linhas em vez de empurrar o horário para fora. */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card__time {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-xs);
      white-space: nowrap;
    }

    .card__overnight {
      padding: 0 4px;
      border-radius: var(--radius-full);
      /* Fundo próprio, então o texto também: não herda o do card. */
      background: var(--color-surface);
      color: var(--color-text);
      font-weight: var(--font-weight-bold);
    }

    .card__note {
      font-size: var(--font-size-xs);
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class CompanionCardComponent {
  readonly item = input.required<PositionedCompanion>();
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Turno de um dia que já passou — fica esmaecido, mas continua legível. */
  readonly past = input(false, { transform: booleanAttribute });

  readonly chosen = output<PositionedCompanion['companion']>();

  protected readonly color = computed(() => {
    const { familyMemberId, familyMemberColor } = this.item().companion;
    return memberColorOf(familyMemberId, familyMemberColor);
  });

  private readonly transparency = computed(() =>
    transparencyOf(this.item().companion.familyMemberTransparency),
  );

  /** Quanto da cor entra na mistura com o fundo, em % (`color-mix` pede porcentagem). */
  protected readonly weight = computed(() => `${100 - this.transparency()}%`);

  protected readonly text = computed(() => memberTextColors(this.color(), this.transparency()));

  protected readonly time = computed(() =>
    formatTimeRange(this.item().companion.startTime, this.item().companion.endTime),
  );

  protected readonly label = computed(() => {
    const companion = this.item().companion;
    const action = this.readonly() ? '' : '. Toque para editar';
    return `${companion.familyMemberName}, das ${companion.startTime} às ${companion.endTime}${action}`;
  });
}
