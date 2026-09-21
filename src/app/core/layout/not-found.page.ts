import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyStateComponent } from '../ui/empty-state/empty-state.component';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent],
  template: `
    <div class="page">
      <app-empty-state
        illustration="marca/fusquinha.png"
        title="Página não encontrada"
        description="O endereço pode ter sido digitado com um caractere a mais, ou o link ficou velho."
      >
        <a class="link" routerLink="/pacientes">Ir para meus pacientes</a>
      </app-empty-state>
    </div>
  `,
  styles: `
    .link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: var(--touch-target);
    }
  `,
})
export class NotFoundPage {}
