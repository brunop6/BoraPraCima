import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { switchMap } from 'rxjs';

import { PatientAccessService } from '../patient/patient-access.service';
import { BrandComponent } from '../ui/brand/brand.component';

/**
 * Moldura das telas de um paciente: cabeçalho com a marca, o nome e o leito, e a
 * navegação inferior.
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandComponent],
  template: `
    <header class="header">
      <div class="header__top">
        <a class="header__back" routerLink="/pacientes">
          <svg class="header__back-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          Pacientes
        </a>

        <app-brand />
      </div>

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
        <span class="tab__pill"><svg class="tab__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 9h16M8 3v3m8-3v3" /></svg></span>
        <span class="tab__label">Calendário</span>
      </a>

      <a
        class="tab"
        [routerLink]="['/pacientes', patientId(), 'familiares']"
        routerLinkActive="is-active"
      >
        <span class="tab__pill"><svg class="tab__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6.5 6.5 0 0 1 13 0M17 11a2.5 2.5 0 1 0 0-5M18 20a6 6 0 0 0-2-4.5" /></svg></span>
        <span class="tab__label">Família</span>
      </a>

      <a
        class="tab"
        [routerLink]="['/pacientes', patientId(), 'ajustes']"
        routerLinkActive="is-active"
      >
        <span class="tab__pill"><svg class="tab__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z" /></svg></span>
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
      flex-direction: column;
      gap: 2px;
      padding: var(--space-2) var(--page-gutter) var(--space-3) var(--space-1);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      /* Some no claro; no escuro separa o cabeçalho do seletor logo abaixo. */
      border-bottom: 1px solid var(--color-primary-edge);
      /* Acompanha a barra de status em telas com entalhe. */
      padding-top: max(var(--space-2), env(safe-area-inset-top));
    }

    .header__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    /* Ícone com rótulo: seta sozinha não diz para onde leva. */
    .header__back {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      min-height: var(--touch-target);
      padding: 0 var(--space-3) 0 var(--space-1);
      flex-shrink: 0;
      border-radius: var(--radius-full);
      color: inherit;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      text-decoration: none;
    }

    .header__back:hover {
      background: var(--color-primary-hover);
    }

    .header__back-icon {
      flex: none;
    }

    .header__info {
      min-width: 0;
      padding-left: var(--space-3);
    }

    .header__name {
      font-size: var(--font-size-lg);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header__room {
      font-size: var(--font-size-sm);
    }

    .content {
      flex: 1;
      /* Exatamente a barra inferior: nem cobre o fim do conteúdo, nem sobra faixa vazia. */
      padding-bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
    }

    .tabs {
      position: fixed;
      inset: auto 0 0;
      z-index: var(--z-header);
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      align-items: center;
      height: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
      padding: 0 var(--space-2) env(safe-area-inset-bottom);
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      box-shadow: var(--shadow-3);
    }

    .tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: var(--touch-target);
      color: var(--color-text-muted);
      text-decoration: none;
    }

    /**
     * Ícone de navegação: traço de 2px em currentColor, 24px dentro do alvo de
     * toque. Não é a família dos ícones ilustrados da marca — ilustração é afeto,
     * traço é navegação, e as duas nunca aparecem na mesma linha.
     */
    .tab__pill {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 2rem;
      border-radius: var(--radius-full);
    }

    .tab__icon {
      width: 24px;
      height: 24px;
      flex: none;
    }

    .tab__label {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
    }

    /* A aba ativa ganha a pílula e o rótulo em negrito: não é só a cor que muda. */
    .tab.is-active {
      color: var(--color-text);
    }

    .tab.is-active .tab__pill {
      background: var(--color-primary-soft);
      color: var(--color-primary-strong);
    }

    .tab.is-active .tab__label {
      font-weight: var(--font-weight-bold);
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
