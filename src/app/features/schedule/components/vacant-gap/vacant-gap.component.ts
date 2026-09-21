import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';

import { minutesToTime } from '../../../../core/utils/time.util';
import { ColumnDensity, VacantGap } from '../../utils/day-layout.util';

/** Lacuna a partir da qual o bloco tem altura para o convite "+ Escalar". */
const INVITE_MIN_MINUTES = 120;

/**
 * Um trecho do dia sem ninguém.
 *
 * O estado "vago" nunca é comunicado só pela cor: o bloco escreve **Vago** e usa
 * borda tracejada. Quem não distingue as cores, ou está no sol do estacionamento
 * do hospital, precisa enxergar a diferença do mesmo jeito.
 */
@Component({
  selector: 'app-vacant-gap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-compact]': "density() === 'compact'",
    '[style.top.%]': 'gap().top',
    '[style.height.%]': 'gap().height',
  },
  template: `
    <button
      type="button"
      class="gap"
      [class.gap--static]="readonly()"
      [class.gap--compact]="density() === 'compact'"
      [disabled]="readonly()"
      [attr.aria-label]="label()"
      (click)="chosen.emit(gap())"
    >
      <span class="gap__name">Vago</span>
      <span class="gap__time">
        @if (density() === 'compact') {
          {{ start() }}<br />{{ end() }}
        } @else if (density() === 'wide') {
          {{ start() }} – {{ end() }}
        } @else {
          {{ start() }} –<br />{{ end() }}
        }
      </span>

      <!-- Convite visível para quem não sabe que o bloco é tocável. Só cabe nos altos. -->
      @if (showInvite()) {
        <span class="gap__invite" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Escalar
        </span>
      }
    </button>
  `,
  styles: `
    :host {
      position: absolute;
      left: 0;
      width: 100%;
      /* Alvo de toque mínimo mesmo quando a lacuna é curta. */
      min-height: var(--touch-target);
      padding: 1px 2px;
    }

    .gap {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
      width: 100%;
      height: 100%;
      padding: 6px var(--space-2);
      overflow: hidden;
      text-align: left;
      background: var(--color-vacant-bg);
      /* Tracejada e de 2px: a diferença precisa sobreviver à ausência de cor. */
      border: 2px dashed var(--color-vacant-border);
      border-radius: var(--radius-md);
      color: var(--color-vacant-text);
      cursor: pointer;
    }

    .gap--static {
      cursor: default;
    }

    .gap:not(.gap--static):hover {
      filter: brightness(0.97);
    }

    /* Etiqueta: VAGO é uma das quatro palavras que saem em caixa alta. */
    .gap__name {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.06em;
      line-height: 1.3;
      text-transform: uppercase;
    }

    .gap__time {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      line-height: 1.3;
      font-variant-numeric: tabular-nums;
    }

    /* A semana: ~48px de coluna. "Vago" continua escrito; o convite some e a borda segue tracejada. */
    :host(.is-compact) {
      padding: 1px;
    }

    .gap--compact {
      padding: 4px 2px;
      border-radius: var(--radius-sm);
    }

    .gap--compact .gap__name {
      letter-spacing: 0.02em;
    }

    .gap--compact .gap__time {
      font-size: var(--font-size-xs);
    }

    /* Logo abaixo do horário, não no pé do bloco: lá o "+" flutuante pode cobri-lo. */
    .gap__invite {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin-top: var(--space-1);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-primary-strong);
    }
  `,
})
export class VacantGapComponent {
  readonly gap = input.required<VacantGap>();
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly density = input<ColumnDensity>('regular');

  readonly chosen = output<VacantGap>();

  protected readonly start = computed(() => minutesToTime(this.gap().startMinutes));
  protected readonly end = computed(() => minutesToTime(this.gap().endMinutes));

  /** "+ Escalar" só na área do responsável e em lacunas de 2h ou mais, onde cabe. Na semana não cabe. */
  protected readonly showInvite = computed(
    () =>
      !this.readonly() &&
      this.density() !== 'compact' &&
      this.gap().endMinutes - this.gap().startMinutes >= INVITE_MIN_MINUTES,
  );

  protected readonly label = computed(() => {
    const action = this.readonly() ? '' : '. Toque para escalar alguém';
    return `Vago, das ${this.start()} às ${this.end()}${action}`;
  });
}
