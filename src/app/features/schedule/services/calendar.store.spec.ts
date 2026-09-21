import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { addDays, todayIso } from '../../../core/utils/date.util';
import { CalendarStore } from './calendar.store';
import { CalendarViewPreference } from './calendar-view-preference.service';
import { CompanionsService } from './companions.service';

describe('CalendarStore', () => {
  let store: CalendarStore;

  /** Cria o store depois de a preferência guardada estar como o teste precisa. */
  function createStore(): CalendarStore {
    TestBed.configureTestingModule({
      providers: [
        CalendarStore,
        { provide: CompanionsService, useValue: { watchRange: () => of([]) } },
      ],
    });
    return TestBed.inject(CalendarStore);
  }

  beforeEach(() => {
    localStorage.clear();
    store = createStore();
  });

  afterEach(() => localStorage.clear());

  it('abre em três dias, a partir de hoje', () => {
    expect(store.view()).toBe('three-days');
    expect(store.visibleDates()).toEqual([todayIso(), addDays(todayIso(), 1), addDays(todayIso(), 2)]);
  });

  it('mostra um dia só e anda um dia por seta', () => {
    store.setView('day');
    expect(store.visibleDates()).toEqual([todayIso()]);

    store.next();
    expect(store.visibleDates()).toEqual([addDays(todayIso(), 1)]);

    store.previous();
    store.previous();
    expect(store.visibleDates()).toEqual([addDays(todayIso(), -1)]);
  });

  it('mostra a semana de domingo a sábado e anda sete dias por seta', () => {
    store.setView('week');
    const week = store.visibleDates();

    expect(week.length).toBe(7);
    expect(week).toContain(todayIso());
    expect(new Date(`${week[0]}T12:00:00Z`).getUTCDay()).toBe(0);

    store.next();
    expect(store.visibleDates()[0]).toBe(addDays(week[0], 7));
  });

  it('volta para hoje ao trocar de visualização', () => {
    store.next();
    store.next();
    expect(store.visibleDates()).not.toContain(todayIso());

    store.setView('week');
    expect(store.visibleDates()).toContain(todayIso());

    store.next();
    store.setView('day');
    expect(store.visibleDates()).toEqual([todayIso()]);
  });

  it('volta para hoje também ao tocar na visualização já marcada', () => {
    store.next();
    store.setView('three-days');

    expect(store.visibleDates()[0]).toBe(todayIso());
  });

  it('escreve mês e ano do primeiro dia visível', () => {
    store.anchorDate.set('2026-09-27');
    store.view.set('week');
    expect(store.monthLabel()).toBe('Setembro/2026');

    store.view.set('three-days');
    store.anchorDate.set('2026-12-31');
    expect(store.monthLabel()).toBe('Dezembro/2026');

    store.anchorDate.set('2027-01-01');
    expect(store.monthLabel()).toBe('Janeiro/2027');
  });

  describe('preferência de visualização', () => {
    function reopen(): CalendarStore {
      TestBed.resetTestingModule();
      return createStore();
    }

    it('guarda a visualização escolhida e a aplica ao reabrir', () => {
      store.setView('week');

      const reopened = reopen();
      expect(reopened.view()).toBe('week');
      expect(reopened.visibleDates().length).toBe(7);
      expect(reopened.visibleDates()).toContain(todayIso());
    });

    it('guarda também quando a escolha volta para 3 dias', () => {
      store.setView('day');
      store.setView('three-days');

      expect(reopen().view()).toBe('three-days');
    });

    it('abre em 3 dias sem nada guardado, e não grava só por abrir', () => {
      expect(store.view()).toBe('three-days');
      expect(TestBed.inject(CalendarViewPreference).read()).toBeNull();
    });

    it('ignora uma visualização guardada que não existe mais', () => {
      localStorage.setItem('bora-pra-cima.calendar-view', 'month');

      expect(reopen().view()).toBe('three-days');
    });

    it('continua funcionando quando o storage falha', () => {
      spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
      spyOn(Storage.prototype, 'setItem').and.throwError('bloqueado');

      const blocked = reopen();
      expect(blocked.view()).toBe('three-days');

      blocked.setView('week');
      expect(blocked.view()).toBe('week');
    });
  });
});
