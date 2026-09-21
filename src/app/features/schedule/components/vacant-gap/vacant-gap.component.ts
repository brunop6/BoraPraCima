import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  output,
} from '@angular/core';

import { formatTimeRange, minutesToTime } from '../../../../core/utils/time.util';
import { VacantGap } from '../../utils/day-layout.util';

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
    '[style.top.%]': 'gap().top',
    '[style.height.%]': 'gap().height',
  },
  template: `
    <button
      type="button"
      class="gap"
      [class.gap--static]="readonly()"
      [disabled]="readonly()"
      [attr.aria-label]="label()"
      (click)="chosen.emit(gap())"
    >
      <span class="gap__name">Vago</span>
      <span class="gap__time">{{ time() }}</span>
    </button>
  `,
  styles: `
    :host {
      position: absolute;
      left: 0;
      width: 100%;
      /* Alvo de toque mínimo mesmo quando a lacuna é curta. */
      min-height: var(--touch-target);
      padding: 1px;
    }

    .gap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      height: 100%;
      padding: var(--space-2);
      overflow: hidden;
      text-align: left;
      background: var(--color-vacant-bg);
      /* Tracejada: a diferença precisa sobreviver à ausência de cor. */
      border: 1px dashed var(--color-vacant-border);
      border-radius: var(--radius-sm);
      color: var(--color-vacant-text);
      cursor: pointer;
    }

    .gap--static {
      cursor: default;
    }

    .gap:not(.gap--static):hover {
      filter: brightness(0.97);
    }

    .gap__name {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      line-height: 1.2;
    }

    .gap__time {
      font-size: var(--font-size-xs);
      white-space: nowrap;
    }
  `,
})
export class VacantGapComponent {
  readonly gap = input.required<VacantGap>();
  readonly readonly = input(false, { transform: booleanAttribute });

  readonly chosen = output<VacantGap>();

  protected readonly time = computed(() =>
    formatTimeRange(minutesToTime(this.gap().startMinutes), minutesToTime(this.gap().endMinutes)),
  );

  protected readonly label = computed(() => {
    const action = this.readonly() ? '' : '. Toque para escalar alguém';
    return `Vago, das ${minutesToTime(this.gap().startMinutes)} às ${minutesToTime(this.gap().endMinutes)}${action}`;
  });
}
