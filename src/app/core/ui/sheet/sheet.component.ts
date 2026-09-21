import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Painel que sobe pela base da tela.
 *
 * É o gesto certo para celular: o conteúdo aparece perto do polegar, e não no topo
 * da tela como um diálogo centralizado. Usado para escalar um acompanhante e para
 * confirmar exclusões.
 *
 * O componente é montado e desmontado pelo pai (`@if`), então não tem input `open`.
 */
@Component({
  selector: 'app-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'dismissed.emit()' },
  template: `
    <div class="sheet__backdrop" (click)="dismissed.emit()"></div>

    <div
      #panel
      class="sheet__panel"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      tabindex="-1"
    >
      <div class="sheet__grabber" aria-hidden="true"></div>

      <header class="sheet__header">
        <div>
          <h2 class="sheet__title">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="sheet__subtitle">{{ subtitle() }}</p>
          }
        </div>

        <button type="button" class="sheet__close" (click)="dismissed.emit()">
          <span class="sr-only">Fechar</span>
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <div class="sheet__body">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: var(--z-sheet);
      display: block;
    }

    .sheet__backdrop {
      position: absolute;
      inset: 0;
      background: var(--color-overlay);
      animation: fade var(--transition-base);
    }

    .sheet__panel {
      position: absolute;
      inset: auto 0 0;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      box-shadow: var(--shadow-3);
      animation: rise var(--transition-base);
      outline: none;
    }

    .sheet__grabber {
      width: 2.5rem;
      height: 0.25rem;
      margin: var(--space-3) auto 0;
      background: var(--color-border-strong);
      border-radius: var(--radius-full);
    }

    .sheet__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--page-gutter) var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    .sheet__title {
      font-size: var(--font-size-lg);
    }

    .sheet__subtitle {
      margin-top: var(--space-1);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .sheet__close {
      flex-shrink: 0;
      width: var(--touch-target);
      height: var(--touch-target);
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--font-size-lg);
      color: var(--color-text-muted);
      cursor: pointer;
    }

    .sheet__close:hover {
      background: var(--color-surface-sunken);
    }

    .sheet__body {
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: var(--space-4) var(--page-gutter);
      /* Respeita a faixa do indicador de início no iPhone. */
      padding-bottom: max(var(--space-5), env(safe-area-inset-bottom));
    }

    @keyframes rise {
      from {
        transform: translateY(100%);
      }
    }

    @keyframes fade {
      from {
        opacity: 0;
      }
    }

    /* Em telas largas o painel vira um cartão centralizado. */
    @media (min-width: 40rem) {
      .sheet__panel {
        inset: auto 50% 0 auto;
        width: min(30rem, 100%);
        transform: translateX(50%);
        margin-bottom: var(--space-6);
        border-radius: var(--radius-lg);
      }

      @keyframes rise {
        from {
          transform: translate(50%, 20%);
          opacity: 0;
        }
      }
    }
  `,
})
export class SheetComponent implements OnDestroy {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);

  /** Emitido no backdrop, no ✕ e no Esc. O pai decide se fecha. */
  readonly dismissed = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);
  private readonly previousOverflow = this.document.body.style.overflow;

  constructor() {
    // Trava a rolagem do fundo: sem isso, arrastar o painel rola a página atrás.
    this.document.body.style.overflow = 'hidden';

    // Leva o foco para o painel, senão o leitor de tela continua lendo o fundo.
    afterNextRender(() => this.panel().nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
  }
}
