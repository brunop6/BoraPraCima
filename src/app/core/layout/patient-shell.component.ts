import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { switchMap } from 'rxjs';

import { PatientAccessService } from '../patient/patient-access.service';

/**
 * Moldura das telas de um paciente: cabeçalho com nome e leito, e a navegação
 * inferior.
 *
 * Vive em `core/layout` porque compõe telas de duas features — o calendário vem de
 * `schedule`, os familiares e os ajustes vêm de `patients`. Se a
 * moldura morasse em uma delas, essa feature teria de importar a outra.
 *
 * Três abas, não cinco: "Responsáveis" fica dentro de Ajustes. Uma barra com
 * cinco alvos num celular de 375px deixa cada um abaixo do mínimo confortável de
 * toque, e é a aba menos usada no dia a dia.
 */
@Component({
  selector: 'app-patient-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <a class="header__back" routerLink="/pacientes">
        <span class="sr-only">Voltar para a lista de pacientes</span>
        <span aria-hidden="true">‹</span>
      </a>

      <div class="header__info">
        <h1 class="header__name">{{ patient()?.name ?? 'Carregando…' }}</h1>
        @if (patient(); as loaded) {
          <p class="header__room">Leito {{ loaded.room }}</p>
        }
      </div>
    </header>

    <main class="content">
      <router-outlet />
    </main>

    <nav class="tabs" aria-label="Seções do paciente">
      <a
        class="tab"
        [routerLink]="['/pacientes', patientId()]"
        routerLinkActive="is-active"
        [routerLinkActiveOptions]="{ exact: true }"
      >
        <span class="tab__icon" aria-hidden="true">📅</span>
        <span class="tab__label">Calendário</span>
      </a>

      <a
        class="tab"
        [routerLink]="['/pacientes', patientId(), 'familiares']"
        routerLinkActive="is-active"
      >
        <span class="tab__icon" aria-hidden="true">👥</span>
        <span class="tab__label">Família</span>
      </a>

      <a
        class="tab"
        [routerLink]="['/pacientes', patientId(), 'ajustes']"
        routerLinkActive="is-active"
      >
        <span class="tab__icon" aria-hidden="true">⚙️</span>
        <span class="tab__label">Ajustes</span>
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }

    .header {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-2);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      /* Acompanha a barra de status em telas com entalhe. */
      padding-top: max(var(--space-2), env(safe-area-inset-top));
    }

    .header__back {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--touch-target);
      height: var(--touch-target);
      flex-shrink: 0;
      border-radius: var(--radius-full);
      color: inherit;
      font-size: var(--font-size-xl);
      text-decoration: none;
    }

    .header__info {
      min-width: 0;
    }

    .header__name {
      font-size: var(--font-size-lg);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header__room {
      font-size: var(--font-size-sm);
      opacity: 0.9;
    }

    .content {
      flex: 1;
      /* Espaço para a barra inferior não cobrir o fim do conteúdo. */
      padding-bottom: 4.5rem;
    }

    .tabs {
      position: fixed;
      inset: auto 0 0;
      z-index: var(--z-header);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      padding-bottom: env(safe-area-inset-bottom);
    }

    .tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: var(--touch-target);
      padding: var(--space-2) var(--space-1);
      color: var(--color-text-muted);
      text-decoration: none;
    }

    .tab__icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .tab__label {
      font-size: var(--font-size-xs);
    }

    .tab.is-active {
      color: var(--color-primary-strong);
      font-weight: var(--font-weight-medium);
      /* Não é só a cor que marca a aba ativa. */
      box-shadow: inset 0 3px 0 var(--color-primary);
    }
  `,
})
export class PatientShellComponent {
  readonly patientId = input.required<string>();

  private readonly patientAccess = inject(PatientAccessService);

  protected readonly patient = toSignal(
    toObservable(this.patientId).pipe(switchMap((id) => this.patientAccess.watch(id))),
    { initialValue: null },
  );
}
