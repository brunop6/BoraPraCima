import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tela vazia com um próximo passo.
 *
 * "Nenhum resultado" deixa quem tem pouca prática digital sem saber o que fazer.
 * Aqui o slot de ação é o ponto do componente: todo estado vazio termina em um
 * botão.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      @if (icon()) {
        <span class="empty__icon" aria-hidden="true">{{ icon() }}</span>
      }

      <h2 class="empty__title">{{ title() }}</h2>

      @if (description()) {
        <p class="empty__description">{{ description() }}</p>
      }

      <div class="empty__action">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6) var(--page-gutter);
      text-align: center;
    }

    .empty__icon {
      font-size: 2.5rem;
      line-height: 1;
    }

    .empty__title {
      font-size: var(--font-size-lg);
    }

    .empty__description {
      max-width: 28rem;
      color: var(--color-text-muted);
    }

    .empty__action:not(:empty) {
      margin-top: var(--space-2);
      width: 100%;
      max-width: 20rem;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
