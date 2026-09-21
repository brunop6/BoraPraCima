import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { CalendarView, isCalendarView } from '../models/calendar-view.model';

const STORAGE_KEY = 'bora-pra-cima.calendar-view';

/**
 * A visualização que a pessoa escolheu por último, guardada neste navegador.
 *
 * Vale para todos os pacientes e também para o link público: é a preferência de
 * quem está com o aparelho na mão, não um dado do paciente. Por isso fica no
 * `localStorage`, e não no Firestore.
 *
 * O storage falha com mais frequência do que parece: janela anônima, dados de site
 * bloqueados e cota cheia lançam exceção até no acesso à propriedade. Nada aqui
 * pode derrubar o calendário por causa disso, então toda falha vira "sem
 * preferência" na leitura e é ignorada na escrita. O valor lido também é conferido:
 * uma visão que deixou de existir volta ao padrão em vez de quebrar a tela.
 */
@Injectable({ providedIn: 'root' })
export class CalendarViewPreference {
  private readonly window = inject(DOCUMENT).defaultView;

  read(): CalendarView | null {
    try {
      const stored = this.window?.localStorage.getItem(STORAGE_KEY);
      return isCalendarView(stored) ? stored : null;
    } catch {
      return null;
    }
  }

  write(view: CalendarView): void {
    try {
      this.window?.localStorage.setItem(STORAGE_KEY, view);
    } catch {
      // Sem storage a escolha vale só até fechar a página, e tudo bem.
    }
  }
}
