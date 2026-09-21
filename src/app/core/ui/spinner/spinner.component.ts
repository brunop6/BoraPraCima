import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner" role="status">
      <span class="spinner__circle" aria-hidden="true"></span>
      <span class="spinner__label">{{ label() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6);
      color: var(--color-text-muted);
    }

    .spinner__circle {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--color-border-strong);
      border-top-color: var(--color-primary-mark);
      border-radius: var(--radius-full);
      animation: spin 800ms linear infinite;
    }

    .spinner__label {
      font-size: var(--font-size-sm);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class SpinnerComponent {
  readonly label = input('Carregando…');
}
