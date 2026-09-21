import { DEFAULT_HANDOFF_RULES, HandoffRules } from '../../../core/patient/handoff-rules';
import { earliestValidEnd, validateShift } from './shift-rules.util';

const rules = DEFAULT_HANDOFF_RULES; // 06:00–21:00, 6h
const day = '2026-09-24';
const nextDay = '2026-09-25';

const shift = (date: string, startTime: string, endTime: string, id?: string) => ({
  id,
  date,
  startTime,
  endTime,
});

describe('validateShift', () => {
  it('aceita a noite inteira, com início e fim dentro da janela', () => {
    expect(validateShift(shift(day, '21:00', '06:00'), [], rules)).toEqual([]);
  });

  it('aceita exatamente o mínimo de permanência', () => {
    expect(validateShift(shift(day, '15:00', '21:00'), [], rules)).toEqual([]);
  });

  it('recusa início fora da janela', () => {
    expect(validateShift(shift(day, '22:00', '06:00'), [], rules)).toEqual(['outside-window']);
  });

  it('recusa fim fora da janela', () => {
    expect(validateShift(shift(day, '06:00', '22:00'), [], rules)).toEqual(['outside-window']);
  });

  it('recusa permanência menor que o mínimo', () => {
    expect(validateShift(shift(day, '14:00', '19:00'), [], rules)).toEqual(['too-short']);
  });

  it('trata início igual ao fim como 24 horas', () => {
    expect(validateShift(shift(day, '06:00', '06:00'), [], rules)).toEqual([]);
  });

  it('recusa horário ou data inválidos', () => {
    expect(validateShift(shift(day, '', '06:00'), [], rules)).toEqual(['invalid-time']);
    expect(validateShift(shift('2026-02-31', '08:00', '14:00'), [], rules)).toEqual([
      'invalid-time',
    ]);
  });

  it('permite que um turno comece quando o outro termina', () => {
    const existing = [shift(day, '15:00', '21:00', 'a')];
    expect(validateShift(shift(day, '21:00', '06:00'), existing, rules)).toEqual([]);
  });

  it('recusa sobreposição no mesmo dia', () => {
    const existing = [shift(day, '12:00', '18:00', 'a')];
    expect(validateShift(shift(day, '15:00', '21:00'), existing, rules)).toEqual(['overlap']);
  });

  it('recusa sobreposição com a continuação de um turno da véspera', () => {
    const open: HandoffRules = { windowStart: '00:00', windowEnd: '23:59', minStayMinutes: 60 };
    const existing = [shift(day, '21:00', '06:00', 'a')];

    expect(validateShift(shift(nextDay, '03:00', '10:00'), existing, open)).toEqual(['overlap']);
    expect(validateShift(shift(nextDay, '06:00', '12:00'), existing, open)).toEqual([]);
  });

  it('não conflita consigo mesmo ao editar', () => {
    const existing = [shift(day, '15:00', '21:00', 'a')];
    expect(validateShift(shift(day, '14:00', '21:00', 'a'), existing, rules)).toEqual([]);
  });

  it('acumula os problemas encontrados', () => {
    const existing = [shift(day, '12:00', '18:00', 'a')];
    expect(validateShift(shift(day, '13:00', '16:00'), existing, rules)).toEqual([
      'too-short',
      'overlap',
    ]);
  });
});

describe('earliestValidEnd', () => {
  it('soma a permanência mínima ao início', () => {
    expect(earliestValidEnd('09:00', rules)).toBe('15:00');
  });

  it('pula para dentro da janela quando o mínimo cai fora dela', () => {
    expect(earliestValidEnd('16:00', rules)).toBe('06:00');
  });

  it('não sugere nada para um horário inválido', () => {
    expect(earliestValidEnd('xx', rules)).toBeNull();
  });
});
