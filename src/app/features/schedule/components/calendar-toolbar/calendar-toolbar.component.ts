import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A navegação do calendário: Antes, o mês e o ano visíveis e Depois.
 *
 * Um componente só para as duas telas, a privada e a do link, pelo mesmo motivo do
 * `ThreeDayViewComponent`: duas cópias divergiriam.
 *
 * As setas têm rótulo visível. Seta sozinha não diz o que faz, e quem tem pouca
 * prática digital não arrisca tocar no que não entende. O rótulo visível não cita
 * o tamanho do passo, que muda com a visualização; o nome acessível cita.
 */
@Component({
  selector: 'app-calendar-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="nav" [attr.aria-label]="step() + ' antes'" (click)="previous.emit()">
      <svg class="nav__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      <span class="nav__label">Antes</span>
    </button>

    <p class="month" aria-live="polite">{{ month() }}</p>

    <button type="button" class="nav" [attr.aria-label]="step() + ' depois'" (click)="next.emit()">
      <svg class="nav__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
      <span class="nav__label">Depois</span>
    </button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: 6px var(--space-2);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 3.75rem;
      min-height: 3.5rem;
      padding: var(--space-1);
      background: transparent;
      border: 0;
      border-radius: var(--radius-lg);
      color: var(--color-text);
      cursor: pointer;
    }

    .nav:hover {
      background: var(--color-surface-sunken);
    }

    .nav__icon {
      flex: none;
    }

    .nav__label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
    }

    .month {
      flex: 1;
      text-align: center;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CalendarToolbarComponent {
  /** O mês e o ano em que o calendário está, como `Setembro/2026`. */
  readonly month = input.required<string>();
  /** O passo das setas por extenso, como `Uma semana`, para o nome acessível. */
  readonly step = input.required<string>();

  readonly previous = output<void>();
  readonly next = output<void>();
}
