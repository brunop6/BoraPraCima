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
  shownTransparency,
  transparencyOf,
} from '../../../../core/color/member-color';
import { ColumnDensity, PositionedCompanion } from '../../utils/day-layout.util';

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
    '[class.is-compact]': "density() === 'compact'",
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
      [class.card--compact]="density() === 'compact'"
      [disabled]="readonly()"
      [attr.aria-label]="label()"
      (click)="chosen.emit(item().companion)"
    >
      @if (item().continuesFromPrevious) {
        <!-- Na semana só o "↑" cabe; o "até" no horário e o nome acessível dizem o resto. -->
        <span class="card__tag" title="Começou no dia anterior">
          {{ density() === 'compact' ? '↑' : '↑ ontem' }}
        </span>
      }

      <span class="card__name">{{ item().companion.familyMemberName }}</span>

      <span class="card__time">
        @if (item().continuesFromPrevious) {
          até {{ item().companion.endTime }}
        } @else if (density() === 'compact') {
          <!-- Sem o travessão: numa coluna de 48px ele cairia sozinho numa linha. -->
          {{ item().companion.startTime }}<br />{{ item().companion.endTime }}
        } @else {
          {{ item().companion.startTime }} – {{ item().companion.endTime }}
          @if (item().overnight) {
            <span class="card__tag" title="Termina no dia seguinte">+1</span>
          }
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
      padding: 1px 2px;
    }

    .card {
      --card-border: color-mix(in srgb, var(--member-color) 75%, #000);

      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 3px;
      width: 100%;
      height: 100%;
      /* O padding some em cards curtos; o conteúdo é que não pode vazar. */
      padding: 7px var(--space-2);
      overflow: hidden;
      text-align: left;
      /*
       * A cor do familiar misturada a --color-surface pela transparência dele: é a
       * mesma conta de memberTextColors, então a tinta calculada vale para o que se
       * vê, nos dois temas e também sobre a faixa rebaixada do dia passado.
       */
      background: color-mix(in srgb, var(--member-color) var(--member-weight), var(--color-surface));
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-1);
      /*
       * Tinta calculada sobre a cor já misturada ao fundo de cada tema, escolhida
       * por --theme-dark: o mesmo bloco de tokens que define --color-surface. Uma
       * media query própria aqui poderia discordar do tema dos tokens e pôr a
       * tinta do escuro sobre o fundo do claro.
       */
      color: color-mix(
        in srgb,
        var(--member-text-dark) calc(var(--theme-dark) * 100%),
        var(--member-text-light)
      );
      cursor: pointer;
      transition: filter var(--transition-fast);
    }

    /* A borda recua junto com o fundo; o texto já vem recalculado. Nada de opacity. */
    .card--past {
      border-color: color-mix(in srgb, var(--card-border) 55%, var(--color-surface));
    }

    .card--static {
      cursor: default;
    }

    .card:not(.card--static):hover {
      filter: brightness(0.97);
    }

    /*
     * A semana: colunas de ~48px. O texto desce para o menor tamanho do sistema, e o
     * respiro some, para que o nome e as duas horas ainda caibam. O que não couber é
     * cortado; o nome acessível do botão traz tudo.
     */
    :host(.is-compact) {
      padding: 1px;
    }

    .card--compact {
      gap: 2px;
      padding: 4px 2px;
      border-radius: var(--radius-sm);
    }

    .card--compact .card__name {
      font-size: var(--font-size-xs);
      line-clamp: 3;
      -webkit-line-clamp: 3;
      hyphens: auto;
      overflow-wrap: anywhere;
    }

    .card--compact .card__time {
      font-size: var(--font-size-xs);
    }

    .card--compact .card__tag {
      padding: 0 3px;
      letter-spacing: 0;
    }

    .card__name {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      /* Nome longo corta em duas linhas em vez de empurrar o horário para fora. */
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Duas linhas: "13:00 – 19:00" numa só não cabe na coluna de um celular. */
    .card__time {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      line-height: 1.3;
      font-variant-numeric: tabular-nums;
    }

    /* Etiqueta: +1 e ↑ ONTEM. Fundo próprio, então o texto também. */
    .card__tag {
      display: inline-flex;
      align-self: flex-start;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.06em;
      line-height: 1.3;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .card__note {
      font-size: var(--font-size-sm);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class CompanionCardComponent {
  readonly item = input.required<PositionedCompanion>();
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly density = input<ColumnDensity>('regular');
  /** Turno de um dia que já passou — empalidece pela cor e continua legível. */
  readonly past = input(false, { transform: booleanAttribute });

  readonly chosen = output<PositionedCompanion['companion']>();

  protected readonly color = computed(() => {
    const { familyMemberId, familyMemberColor } = this.item().companion;
    return memberColorOf(familyMemberId, familyMemberColor);
  });

  /** A do familiar, ou mais transparente se o dia já passou. */
  private readonly transparency = computed(() =>
    shownTransparency(transparencyOf(this.item().companion.familyMemberTransparency), this.past()),
  );

  /** Quanto da cor entra na mistura com o fundo, em % (`color-mix` pede porcentagem). */
  protected readonly weight = computed(() => `${Math.round((100 - this.transparency()) * 10) / 10}%`);

  protected readonly text = computed(() => memberTextColors(this.color(), this.transparency()));

  protected readonly label = computed(() => {
    const { companion, continuesFromPrevious, overnight } = this.item();
    const started = continuesFromPrevious ? ', começou ontem' : '';
    const ends = overnight ? ', termina no dia seguinte' : '';
    const action = this.readonly() ? '' : '. Toque para editar';
    return `${companion.familyMemberName}, das ${companion.startTime} às ${companion.endTime}${started}${ends}${action}`;
  });
}
