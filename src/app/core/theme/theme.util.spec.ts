import { msUntilNextSwitch, themeAt } from './theme.util';

/** Hora local, sem depender do fuso da máquina que roda o teste. */
function at(hour: number, minute = 0, second = 0): Date {
  return new Date(2026, 8, 21, hour, minute, second);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe('themeAt', () => {
  it('é claro das 06:00 até antes das 18:00', () => {
    expect(themeAt(at(6, 0))).toBe('light');
    expect(themeAt(at(12, 30))).toBe('light');
    expect(themeAt(at(17, 59, 59))).toBe('light');
  });

  it('é escuro das 18:00 até antes das 06:00', () => {
    expect(themeAt(at(18, 0))).toBe('dark');
    expect(themeAt(at(23, 59))).toBe('dark');
    expect(themeAt(at(0, 0))).toBe('dark');
    expect(themeAt(at(5, 59, 59))).toBe('dark');
  });
});

describe('msUntilNextSwitch', () => {
  it('conta até as 18:00 durante o dia', () => {
    expect(msUntilNextSwitch(at(12, 0))).toBe(6 * HOUR);
    expect(msUntilNextSwitch(at(6, 0))).toBe(12 * HOUR);
  });

  it('conta até as 06:00 seguintes à noite, inclusive virando o dia', () => {
    expect(msUntilNextSwitch(at(18, 0))).toBe(12 * HOUR);
    expect(msUntilNextSwitch(at(23, 0))).toBe(7 * HOUR);
    expect(msUntilNextSwitch(at(2, 0))).toBe(4 * HOUR);
  });

  it('nunca devolve zero: na própria virada a próxima é a seguinte', () => {
    expect(msUntilNextSwitch(at(17, 59, 59))).toBe(1000);
    expect(msUntilNextSwitch(at(18, 0))).toBeGreaterThan(0);
  });
});
