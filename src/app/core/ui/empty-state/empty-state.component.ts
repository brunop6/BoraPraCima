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
      @if (illustration()) {
        <span class="empty__plate">
          <img class="empty__illustration" [src]="illustration()" alt="" />
        </span>
      } @else if (icon()) {
        <span class="empty__icon" aria-hidden="true">{{ icon() }}</span>
      }

      @if (tag(); as text) {
        <span class="empty__tag">{{ text }}</span>
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

    /**
     * A placa é bege nos DOIS temas de propósito: os ícones ilustrados da marca são
     * raster e trazem fundo creme próprio. No tema claro ela some contra a página;
     * no escuro é ela que emoldura esse creme em vez de deixá-lo flutuando como um
     * retângulo solto. Se a placa acompanhasse o tema, sobraria exatamente isso.
     */
    .empty__plate {
      padding: var(--space-3);
      border-radius: var(--radius-lg);
      background: var(--marca-bege-claro);
      line-height: 0;
    }

    .empty__illustration {
      display: block;
      width: 7.5rem;
      height: auto;
    }

    /* Herdado. O livro de marca pede ilustração, não emoji: prefira o input illustration. */
    .empty__icon {
      font-size: 2.5rem;
      line-height: 1;
    }

    /** Etiqueta em caixa alta — só para as palavras curtas do sistema, como LINK DESLIGADO. */
    .empty__tag {
      margin-top: var(--space-2);
      padding: 2px var(--space-2);
      border-radius: var(--radius-sm);
      background: var(--color-surface-sunken);
      color: var(--color-text-muted);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
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
  /**
   * Caminho de um dos ícones ilustrados da marca, em `public/marca/`. É o que o
   * livro de marca pede para o estado vazio: ele é o único momento da tela em que
   * não há dado competindo por atenção, então é onde o afeto cabe.
   */
  readonly illustration = input<string | null>(null);
  /** Glifo de texto. Herdado: `illustration` tem precedência e emoji não entra na interface. */
  readonly icon = input<string | null>(null);
  /** Estado curto acima do título, em etiqueta: "Link desligado". */
  readonly tag = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
