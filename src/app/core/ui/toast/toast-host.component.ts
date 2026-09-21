import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

/** Montado uma única vez, no `App`. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- aria-live=polite: o leitor de tela anuncia sem interromper o que está lendo. -->
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <button type="button" class="toast toast--{{ toast.tone }}" (click)="dismiss(toast.id)">
          <span aria-hidden="true">{{ icon(toast.tone) }}</span>
          <span>{{ toast.message }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      inset: auto var(--page-gutter) max(var(--space-4), env(safe-area-inset-bottom));
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      align-items: center;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      max-width: 30rem;
      min-height: var(--touch-target);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      box-shadow: var(--shadow-2);
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
      pointer-events: auto;
      animation: rise var(--transition-base);
    }

    .toast--success {
      border-color: var(--color-success);
      background: var(--color-success-soft);
      color: var(--color-success);
    }

    .toast--error {
      border-color: var(--color-danger);
      background: var(--color-danger-soft);
      color: var(--color-danger);
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(0.75rem);
      }
    }
  `,
})
export class ToastHostComponent {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts;

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  protected icon(tone: string): string {
    if (tone === 'success') {
      return '✓';
    }
    return tone === 'error' ? '⚠' : 'ℹ';
  }
}
