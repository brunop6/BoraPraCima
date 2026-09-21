import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { PatientAccessService } from '../../../../core/patient/patient-access.service';
import { DEFAULT_TIMEZONE, Patient } from '../../../../core/patient/patient.model';
import { BrandComponent } from '../../../../core/ui/brand/brand.component';
import { EmptyStateComponent } from '../../../../core/ui/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../../core/ui/spinner/spinner.component';
import { CalendarToolbarComponent } from '../../components/calendar-toolbar/calendar-toolbar.component';
import { ThreeDayViewComponent } from '../../components/three-day-view/three-day-view.component';
import { ViewSwitcherComponent } from '../../components/view-switcher/view-switcher.component';
import { CALENDAR_VIEWS } from '../../models/calendar-view.model';
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
  imports: [
    RouterLink,
    ThreeDayViewComponent,
    EmptyStateComponent,
    SpinnerComponent,
    BrandComponent,
    ViewSwitcherComponent,
    CalendarToolbarComponent,
  ],
  template: `
    @if (view().state === 'loading') {
      <app-spinner label="Abrindo a escala…" />
    } @else if (view().state === 'unavailable') {
      <app-empty-state
        illustration="marca/natureza.png"
        tag="Link desligado"
        title="Este link não está disponível"
        description="Quem organiza a escala pode ter desativado o compartilhamento. Peça um link novo para a família."
      >
        <a class="link" routerLink="/entrar">Entrar na minha conta</a>
      </app-empty-state>
    } @else if (view().patient; as patient) {
      <header class="header">
        <app-brand size="lg" />
        <h1 class="header__name">{{ patient.name }}</h1>
        <p class="header__room">Leito {{ patient.room }}</p>
      </header>

      <app-view-switcher
        [options]="views"
        [value]="store.view()"
        (changed)="store.setView($event)"
      />

      <app-calendar-toolbar
        [month]="store.monthLabel()"
        [step]="store.stepLabel()"
        (previous)="store.previous()"
        (next)="store.next()"
        />

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
      padding: var(--space-4) var(--page-gutter) 20px;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      border-bottom: 1px solid var(--color-primary-edge);
    }

    .header__name {
      margin-top: var(--space-3);
      font-size: var(--font-size-xl);
    }

    .header__room {
      margin-top: 2px;
    }

    .notice {
      padding: var(--space-4) var(--page-gutter);
      text-align: center;
      color: var(--color-text-muted);
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
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
    }
  `,
})
export class PublicCalendarPage {
  readonly patientId = input.required<string>();

  protected readonly store = inject(CalendarStore);
  protected readonly defaultTimezone = DEFAULT_TIMEZONE;
  protected readonly views = CALENDAR_VIEWS;

  private readonly patientAccess = inject(PatientAccessService);

  protected readonly view = toSignal(
    toObservable(this.patientId).pipe(
      switchMap((id) =>
        this.patientAccess.watch(id).pipe(
          map((patient): PublicView => ({
            // Documento ausente e link desligado dão na mesma para quem chegou
            // pelo link: não há o que mostrar.
            state: patient?.publicAccessEnabled ? 'ok' : 'unavailable',
            patient,
          })),
          // O Firestore recusa a leitura quando o link está desligado; isso não é
          // uma falha, é a resposta.
          catchError(() => of<PublicView>({ state: 'unavailable', patient: null })),
          startWith<PublicView>({ state: 'loading', patient: null }),
        ),
      ),
    ),
    { initialValue: { state: 'loading', patient: null } as PublicView },
  );

  constructor() {
    effect(() => this.store.patientId.set(this.patientId()));
    effect(() => this.store.patient.set(this.view().patient));
  }
}
