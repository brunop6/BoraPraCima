import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

export type BrandSize = 'md' | 'lg';

/**
 * O emblema e o nome do produto, lado a lado.
 *
 * O nome sai em `--font-family-brand` (Satisfy), e este deve ser o único uso dela
 * na tela: é o sorriso do sistema, e sorriso repetido vira careta. A cor vem de
 * `currentColor`, então quem monta decide se ele fica sobre o verde do cabeçalho
 * ou sobre o fundo claro.
 */
@Component({
  selector: 'app-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: { '[class]': "'brand brand--' + size()" },
  template: `
    <!-- Decorativa: o nome do produto já está escrito ao lado. -->
    <img
      class="brand__logo"
      ngSrc="marca/emblema-144.png"
      alt=""
      [width]="logoSize()"
      [height]="logoSize()"
      priority
    />
    <span class="brand__name">Bora Pra Cima</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }

    .brand__logo {
      flex: none;
      border-radius: var(--radius-full);
      /* O anel acompanha o texto: creme sobre o verde, verde sobre o creme. */
      box-shadow: 0 0 0 2px currentColor;
    }

    .brand__name {
      font-family: var(--font-family-brand);
      font-size: var(--font-size-xl);
      line-height: 1.1;
      white-space: nowrap;
    }

    :host(.brand--lg) .brand__name {
      font-size: var(--font-size-2xl);
    }
  `,
})
export class BrandComponent {
  readonly size = input<BrandSize>('md');

  protected readonly logoSize = computed(() => (this.size() === 'lg' ? 44 : 36));
}
