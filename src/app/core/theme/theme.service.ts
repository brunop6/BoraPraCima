import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

import { THEME_COLORS, Theme, msUntilNextSwitch, themeAt } from './theme.util';

/**
 * Aplica o tema da hora ao `<html>` e o troca sozinho nas viradas das 06:00 e das
 * 18:00, sem recarregar a página. Os tokens de `_tokens.scss` respondem a
 * `data-theme`.
 *
 * Um `setTimeout` até a próxima virada não basta: com o aparelho suspenso ou a aba
 * em segundo plano o navegador atrasa ou perde o alarme. Por isso a hora também é
 * conferida ao voltar para a aba.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>(themeAt(new Date()));

  private timer: ReturnType<typeof setTimeout> | undefined;

  /** Chamado uma vez, na inicialização do app. */
  start(): void {
    this.sync();
    this.document.addEventListener('visibilitychange', () => {
      if (!this.document.hidden) {
        this.sync();
      }
    });
  }

  private sync(): void {
    const now = new Date();
    this.apply(themeAt(now));

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), msUntilNextSwitch(now));
  }

  private apply(theme: Theme): void {
    this.theme.set(theme);
    this.document.documentElement.dataset['theme'] = theme;
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
  }
}
