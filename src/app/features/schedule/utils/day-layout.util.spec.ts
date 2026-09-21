import { Companion } from '../models/companion.model';
import { FULL_DAY_WINDOW, VacancyContext, layoutDay } from './day-layout.util';

const day = '2026-09-24';
const nextDay = '2026-09-25';

/** Nada passou e a internação já começou: só os turnos definem o que é vago. */
const future: VacancyContext = { admissionDate: '2026-01-01', today: '2026-01-02', nowMinutes: 0 };

function companion(id: string, date: string, startTime: string, endTime: string): Companion {
  return {
    id,
    date,
    startTime,
    endTime,
    familyMemberId: 'm',
    familyMemberName: 'Tia Marta',
    note: null,
  };
}

describe('layoutDay', () => {
  it('trata um dia sem turnos como uma única lacuna', () => {
    const layout = layoutDay(day, [], FULL_DAY_WINDOW, future);

    expect(layout.items).toEqual([]);
    expect(layout.gaps.map((gap) => [gap.startMinutes, gap.endMinutes])).toEqual([[0, 1440]]);
  });

  it('deixa como lacuna o que sobra entre os turnos', () => {
    const layout = layoutDay(day, [companion('a', day, '09:00', '15:00')], FULL_DAY_WINDOW, future);

    expect(layout.gaps.map((gap) => [gap.startMinutes, gap.endMinutes])).toEqual([
      [0, 540],
      [900, 1440],
    ]);
  });

  it('desenha o turno que vira a noite até a meia-noite e o marca como "+1"', () => {
    const layout = layoutDay(day, [companion('a', day, '21:00', '06:00')], FULL_DAY_WINDOW, future);

    expect(layout.items.length).toBe(1);
    expect(layout.items[0].overnight).toBeTrue();
    expect(layout.items[0].continuesFromPrevious).toBeFalse();
    expect(layout.gaps.map((gap) => [gap.startMinutes, gap.endMinutes])).toEqual([[0, 1260]]);
  });

  it('desenha o rabo do turno da véspera, sem falsa lacuna de madrugada', () => {
    const layout = layoutDay(
      nextDay,
      [companion('a', day, '21:00', '06:00')],
      FULL_DAY_WINDOW,
      future,
    );

    expect(layout.items.length).toBe(1);
    expect(layout.items[0].continuesFromPrevious).toBeTrue();
    expect(layout.items[0].top).toBe(0);
    expect(layout.items[0].height).toBe(25);
    expect(layout.gaps.map((gap) => [gap.startMinutes, gap.endMinutes])).toEqual([[360, 1440]]);
  });

  it('ignora turnos que não tocam o dia', () => {
    const layout = layoutDay(
      nextDay,
      [companion('a', day, '09:00', '15:00')],
      FULL_DAY_WINDOW,
      future,
    );

    expect(layout.items).toEqual([]);
  });

  it('não pinta de vago o que já passou hoje', () => {
    const now: VacancyContext = { ...future, today: day, nowMinutes: 600 };
    const layout = layoutDay(day, [], FULL_DAY_WINDOW, now);

    expect(layout.gaps.map((gap) => [gap.startMinutes, gap.endMinutes])).toEqual([[600, 1440]]);
  });

  it('não pinta de vago dias passados nem anteriores à internação', () => {
    const past: VacancyContext = { ...future, today: nextDay };
    expect(layoutDay(day, [], FULL_DAY_WINDOW, past).gaps).toEqual([]);

    const beforeAdmission: VacancyContext = { ...future, admissionDate: nextDay };
    expect(layoutDay(day, [], FULL_DAY_WINDOW, beforeAdmission).gaps).toEqual([]);
  });

  it('divide a largura entre turnos que se sobrepõem', () => {
    const layout = layoutDay(
      day,
      [companion('a', day, '09:00', '15:00'), companion('b', day, '12:00', '18:00')],
      FULL_DAY_WINDOW,
      future,
    );

    expect(layout.items.map((item) => item.width)).toEqual([50, 50]);
    expect(layout.items.map((item) => item.left)).toEqual([0, 50]);
  });
});
