import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, take } from 'rxjs';

/** Intervalo mínimo entre duas conferências de versão. */
export const MIN_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Troca a versão do app sem perguntar nada a quem está usando.
 *
 * O service worker baixa a versão nova em segundo plano e continua servindo a
 * antiga até alguém recarregar. Instalado na tela inicial, o app pode ficar semanas
 * aberto na bandeja do celular e nunca recarregar — daí a conferência ao voltar
 * para a tela.
 *
 * A recarga acontece na primeira troca de tela depois de a versão ficar pronta.
 * Navegar já descarta o que estava preenchido, então é o único momento em que
 * recarregar não custa nada a quem estava no meio de marcar um turno.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private lastCheckAt = 0;

  /** Chamado uma vez, na inicialização do app. */
  start(): void {
    if (!this.updates.isEnabled) {
      return;
    }

    this.updates.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => this.reloadOnNextNavigation());

    // O service worker prometeu uma versão e não consegue mais montá-la (cache
    // apagado pelo sistema, arquivo que sumiu do servidor). Recarregar é a única
    // saída, e a recarga passa por cima dele.
    this.updates.unrecoverable.subscribe(() => this.document.location.reload());

    this.document.addEventListener('visibilitychange', () => {
      if (!this.document.hidden) {
        this.check();
      }
    });
  }

  private reloadOnNextNavigation(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      )
      .subscribe(async () => {
        await this.updates.activateUpdate();
        this.document.location.reload();
      });
  }

  private check(): void {
    const now = Date.now();
    if (now - this.lastCheckAt < MIN_CHECK_INTERVAL_MS) {
      return;
    }
    this.lastCheckAt = now;
    // Sem rede a conferência rejeita; só o que ela traria é que se perde.
    this.updates.checkForUpdate().catch(() => undefined);
  }
}
