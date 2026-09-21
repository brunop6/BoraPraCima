import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-block]': 'block()' },
  template: `
    <button
      [type]="type()"
      [class]="classes()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
    >
      @if (loading()) {
        <span class="btn__spinner" aria-hidden="true"></span>
      }
      <span class="btn__label"><ng-content /></span>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    :host(.is-block) {
      display: block;
      width: 100%;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      width: 100%;
      /* Alvo de toque nunca abaixo do mínimo, mesmo com rótulo curto. */
      min-height: var(--touch-target);
      min-width: var(--touch-target);
      padding: 0 var(--space-4);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      line-height: 1.2;
      cursor: pointer;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }

    .btn--lg {
      min-height: 3.5rem;
      font-size: var(--font-size-lg);
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-primary-contrast);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--color-primary-strong);
    }

    .btn--secondary {
      background: var(--color-surface);
      color: var(--color-text);
      border-color: var(--color-border-strong);
    }

    .btn--secondary:hover:not(:disabled) {
      background: var(--color-surface-sunken);
    }

    .btn--ghost {
      background: transparent;
      color: var(--color-primary-strong);
    }

    .btn--ghost:hover:not(:disabled) {
      background: var(--color-primary-soft);
    }

    .btn--danger {
      background: var(--color-surface);
      color: var(--color-danger);
      border-color: var(--color-danger);
    }

    .btn--danger:hover:not(:disabled) {
      background: var(--color-danger-soft);
    }

    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .btn__spinner {
      width: 1.125rem;
      height: 1.125rem;
      border: 2px solid currentcolor;
      border-right-color: transparent;
      border-radius: var(--radius-full);
      animation: spin 700ms linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  // `booleanAttribute` permite escrever `<app-button block>` em vez de
  // `[block]="true"` — a forma curta é a que se usa o tempo todo nos templates.
  readonly block = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    ['btn', `btn--${this.variant()}`, `btn--${this.size()}`].join(' '),
  );
}
