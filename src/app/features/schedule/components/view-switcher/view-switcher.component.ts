import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CalendarView, CalendarViewOption } from '../../models/calendar-view.model';

/**
 * Troca entre Dia, 3 dias e Semana.
 *
 * Botões com `aria-pressed` num grupo, e não um `radiogroup`: cada opção é um alvo
 * de toque próprio, alcançável com Tab, sem exigir as setas do teclado que um
 * grupo de rádio pede.
 *
 * A opção escolhida é marcada pelo preenchimento, pelo negrito e pela sombra, não
 * só pela cor.
 */
@Component({
  selector: 'app-view-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="switcher" role="group" aria-label="Visualização do calendário">
      @for (option of options(); track option.id) {
        <button
          type="button"
          class="switcher__option"
          [class.is-selected]="option.id === value()"
          [attr.aria-pressed]="option.id === value()"
          (click)="changed.emit(option.id)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding: 10px var(--page-gutter);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .switcher {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(0, 1fr);
      gap: var(--space-1);
      padding: 3px;
      background: var(--color-surface-sunken);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-lg);
    }

    .switcher__option {
      min-height: var(--touch-target);
      padding: 0 var(--space-1);
      background: transparent;
      border: 0;
      border-radius: calc(var(--radius-lg) - 3px);
      color: var(--color-text);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: background var(--transition-fast);
    }

    .switcher__option:hover:not(.is-selected) {
      background: var(--color-primary-soft);
    }

    .switcher__option.is-selected {
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      font-weight: var(--font-weight-bold);
      /* O contorno separa a opção marcada do fundo rebaixado, que no escuro tem o mesmo tom. */
      box-shadow: inset 0 0 0 1px var(--color-primary-edge), var(--shadow-1);
    }
  `,
})
export class ViewSwitcherComponent {
  readonly options = input.required<readonly CalendarViewOption[]>();
  readonly value = input.required<CalendarView>();

  readonly changed = output<CalendarView>();
}
