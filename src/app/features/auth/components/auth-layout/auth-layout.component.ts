import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

/**
 * Moldura das telas de entrada: o emblema da marca em cima, o formulário num card.
 *
 * É a primeira coisa que a família vê, então é aqui que a marca aparece inteira —
 * o emblema grande com o anel em amarelo sol e o nome em `--font-family-brand`, o
 * único uso dela na tela. No celular o cabeçalho é uma faixa verde que termina numa
 * serra (a mesma da ilustração "natureza") e o card sobe por cima dela; do desktop
 * em diante a faixa vira o painel da esquerda.
 *
 * `compact` encolhe o cabeçalho no celular para quem já passou pelo login e está
 * num formulário mais longo; no desktop o painel é sempre o mesmo.
 *
 * O conteúdo do card entra pelo slot padrão; os links de navegação ficam fora dele,
 * pelo atributo `authLinks`.
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  host: { '[class.is-compact]': 'compact()' },
  template: `
    <div class="auth">
      <header class="hero">
        <!-- Decorativo: o nome do produto está escrito logo abaixo. -->
        <img
          class="hero__emblem"
          ngSrc="marca/emblema.png"
          alt=""
          width="423"
          height="423"
          priority
        />
        <div class="hero__text">
          <p class="hero__name">Bora Pra Cima</p>
          <p class="hero__tagline">Escala de acompanhantes, em família</p>
          <p class="hero__lead">
            Quem fica com o paciente, quando fica e o que ainda está vago — num lugar só,
            para a família toda.
          </p>
        </div>

        <svg
          class="hero__hill"
          viewBox="0 0 390 40"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M0 40 L0 26 C40 14 70 6 110 16 C140 24 160 10 200 6 C240 2 262 20 300 22 C336 24 360 12 390 14 L390 40 Z"
          />
        </svg>
      </header>

      <div class="content">
        <main class="card">
          <ng-content />
        </main>
        <ng-content select="[authLinks]" />
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }

    .hero {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-6) var(--page-gutter) 5rem;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      text-align: center;
    }

    /* O amarelo sol da tela: um só, emoldurando o emblema. */
    .hero__emblem {
      flex: none;
      width: 7.5rem;
      height: 7.5rem;
      border-radius: var(--radius-full);
      box-shadow:
        0 0 0 4px var(--color-accent),
        var(--shadow-2);
    }

    .hero__text {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .hero__name {
      font-family: var(--font-family-brand);
      font-size: var(--font-size-2xl);
      line-height: 1.1;
    }

    .hero__tagline {
      font-size: var(--font-size-sm);
    }

    .hero__lead {
      display: none;
    }

    /* A serra pinta o fundo da página, então acompanha o tema sozinha. */
    .hero__hill {
      position: absolute;
      left: 0;
      bottom: -1px;
      width: 100%;
      height: 2.5rem;
      fill: var(--color-bg);
    }

    :host(.is-compact) .hero {
      flex-direction: row;
      justify-content: center;
      padding-top: var(--space-5);
      padding-bottom: 4rem;
    }

    :host(.is-compact) .hero__emblem {
      width: 3.5rem;
      height: 3.5rem;
      box-shadow: 0 0 0 3px var(--color-accent);
    }

    :host(.is-compact) .hero__tagline {
      display: none;
    }

    .content {
      position: relative;
      width: 100%;
      max-width: 28rem;
      margin: -2.5rem auto 0;
      padding: 0 var(--page-gutter) var(--space-7);
    }

    .card {
      display: block;
      padding: var(--space-5) 1.25rem;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
    }

    /* Do desktop em diante a faixa vira o painel da esquerda, na altura da tela. */
    @media (min-width: 60rem) {
      .auth {
        display: grid;
        grid-template-columns: minmax(24rem, 44%) minmax(0, 1fr);
        min-height: 100dvh;
      }

      .hero,
      :host(.is-compact) .hero {
        position: sticky;
        top: 0;
        height: 100dvh;
        flex-direction: column;
        justify-content: center;
        gap: var(--space-5);
        padding: var(--space-7);
      }

      .hero__emblem,
      :host(.is-compact) .hero__emblem {
        width: 16rem;
        height: 16rem;
        box-shadow:
          0 0 0 6px var(--color-accent),
          var(--shadow-2);
      }

      .hero__text {
        gap: var(--space-2);
        max-width: 24rem;
      }

      .hero__name {
        font-size: calc(var(--font-size-2xl) * 1.5);
      }

      .hero__tagline,
      :host(.is-compact) .hero__tagline {
        display: block;
        font-size: var(--font-size-lg);
      }

      .hero__lead {
        display: block;
      }

      .hero__hill {
        display: none;
      }

      .content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        max-width: 32rem;
        margin: 0 auto;
        padding: var(--space-7) var(--space-6);
      }

      .card {
        padding: var(--space-6);
      }
    }
  `,
})
export class AuthLayoutComponent {
  /** Cabeçalho menor no celular, para formulários mais longos. */
  readonly compact = input(false, { transform: booleanAttribute });
}
