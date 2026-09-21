import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { PatientAccessService } from '../../../../core/patient/patient-access.service';
import { DEFAULT_TIMEZONE, Patient } from '../../../../core/patient/patient.model';
import { EmptyStateComponent } from '../../../../core/ui/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../../core/ui/spinner/spinner.component';
import { formatRange } from '../../../../core/utils/date.util';
import { ThreeDayViewComponent } from '../../components/three-day-view/three-day-view.component';
import { CalendarStore } from '../../services/calendar.store';

type LinkState = 'loading' | 'ok' | 'unavailable';

interface PublicView {
  state: LinkState;
  patient: Patient | null;
}

/**
 * A tela que abre pelo link compartilhado, sem login.
 *
 * É o mesmo calendário da tela privada — o mesmo componente, com `readonly` — e
 * isso é proposital: uma segunda implementação divergiria da primeira com o tempo,
 * e a família veria coisas diferentes dependendo de por onde entrou.
 *
 * Quando o link é desligado nos ajustes, o Firestore nega a leitura e a tela diz
 * isso em português, em vez de ficar carregando para sempre.
 */
@Component({
  selector: 'app-public-calendar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CalendarStore],
  imports: [RouterLink, ThreeDayViewComponent, EmptyStateComponent, SpinnerComponent],
  template: `
    @if (view().state === 'loading') {
      <app-spinner label="Abrindo a escala…" />
    } @else if (view().state === 'unavailable') {
      <app-empty-state
        icon="🔒"
        title="Este link não está disponível"
        description="Quem organiza a escala pode ter desativado o compartilhamento. Peça um link novo para a família."
      >
        <a class="link" routerLink="/entrar">Entrar na minha conta</a>
      </app-empty-state>
    } @else if (view().patient; as patient) {
      <header class="header">
        <p class="header__eyebrow">Escala de acompanhantes</p>
        <h1 class="header__name">{{ patient.name }}</h1>
        <p class="header__room">Leito {{ patient.room }}</p>
      </header>

      <div class="toolbar">
        <button type="button" class="toolbar__nav" (click)="store.previous()">
          <span class="sr-only">Três dias antes</span>
          <span aria-hidden="true">‹</span>
        </button>

        <p class="toolbar__range" aria-live="polite">{{ rangeLabel() }}</p>

        <button type="button" class="toolbar__nav" (click)="store.next()">
          <span class="sr-only">Três dias depois</span>
          <span aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          class="toolbar__today"
          [disabled]="store.isShowingToday()"
          (click)="store.goToToday()"
        >
          Hoje
        </button>
      </div>

      @if (store.isLoading()) {
        <app-spinner label="Carregando a escala…" />
      } @else {
        <app-three-day-view
          [days]="store.days()"
          [window]="store.window"
          [timezone]="patient.timezone || defaultTimezone"
          readonly
        />

        @if (!store.hasCompanions()) {
          <p class="notice">Ainda não há turnos publicados para estes dias.</p>
        }

        <p class="legend">
          <span class="legend__swatch" aria-hidden="true"></span> Escalado
          <span class="legend__swatch legend__swatch--vacant" aria-hidden="true"></span> Vago
        </p>

        <footer class="footer">
          <p>Esta página é somente para consulta.</p>
          <a class="link" routerLink="/entrar">Sou responsável pela escala</a>
        </footer>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      padding-bottom: var(--space-6);
    }

    .header {
      padding: var(--space-4) var(--page-gutter);
      background: var(--color-primary);
      color: var(--color-primary-contrast);
    }

    .header__eyebrow {
      font-size: var(--font-size-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.85;
    }

    .header__name {
      margin-top: var(--space-1);
      font-size: var(--font-size-xl);
    }

    .header__room {
      font-size: var(--font-size-sm);
      opacity: 0.9;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-2);
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .toolbar__nav {
      width: var(--touch-target);
      height: var(--touch-target);
      flex-shrink: 0;
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xl);
      color: var(--color-text);
      cursor: pointer;
    }

    .toolbar__range {
      flex: 1;
      text-align: center;
      font-weight: var(--font-weight-medium);
    }

    .toolbar__today {
      min-height: var(--touch-target);
      padding: 0 var(--space-3);
      background: transparent;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .toolbar__today:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .notice {
      padding: var(--space-4) var(--page-gutter);
      text-align: center;
      color: var(--color-text-muted);
    }

    .legend {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      justify-content: center;
      padding: var(--space-3) var(--page-gutter);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }

    .legend__swatch {
      width: 1rem;
      height: 1rem;
      border-radius: var(--radius-sm);
      background: var(--color-primary-soft);
      border: 1px solid var(--color-primary);
    }

    .legend__swatch--vacant {
      margin-left: var(--space-3);
      background: var(--color-vacant-bg);
      border-color: var(--color-vacant-border);
      border-style: dashed;
    }

    .footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-5) var(--page-gutter);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
      border-top: 1px solid var(--color-border);
    }

    .link {
      min-height: var(--touch-target);
      display: inline-flex;
      align-items: center;
    }
  `,
})
export class PublicCalendarPage {
  readonly patientId = input.required<string>();

  protected readonly store = inject(CalendarStore);
  protected readonly defaultTimezone = DEFAULT_TIMEZONE;

  private readonly patientAccess = inject(PatientAccessService);

  protected readonly view = toSignal(
    toObservable(this.patientId).pipe(
      switchMap((id) =>
        this.patientAccess.watch(id).pipe(
          map(
            (patient): PublicView => ({
              // Documento ausente e link desligado dão na mesma para quem chegou
              // pelo link: não há o que mostrar.
              state: patient?.publicAccessEnabled ? 'ok' : 'unavailable',
              patient,
            }),
          ),
          // O Firestore recusa a leitura quando o link está desligado; isso não é
          // uma falha, é a resposta.
          catchError(() => of<PublicView>({ state: 'unavailable', patient: null })),
          startWith<PublicView>({ state: 'loading', patient: null }),
        ),
      ),
    ),
    { initialValue: { state: 'loading', patient: null } as PublicView },
  );

  protected readonly rangeLabel = computed(() => {
    const dates = this.store.visibleDates();
    return formatRange(dates[0], dates[dates.length - 1]);
  });

  constructor() {
    effect(() => this.store.patientId.set(this.patientId()));
    effect(() => this.store.patient.set(this.view().patient));
  }
}
