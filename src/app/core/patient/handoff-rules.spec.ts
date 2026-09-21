import { DEFAULT_HANDOFF_RULES, handoffRulesOf, validateHandoffRules } from './handoff-rules';

describe('validateHandoffRules', () => {
  it('aceita os padrões', () => {
    expect(validateHandoffRules(DEFAULT_HANDOFF_RULES)).toEqual([]);
  });

  it('exige o fim da janela depois do início', () => {
    expect(
      validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, windowStart: '21:00', windowEnd: '06:00' }),
    ).toHaveSize(1);
    expect(
      validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, windowStart: '08:00', windowEnd: '08:00' }),
    ).toHaveSize(1);
  });

  it('recusa horas mal formadas', () => {
    expect(validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, windowStart: '6h' })).toHaveSize(1);
  });

  it('limita a permanência mínima entre 30 minutos e 24 horas', () => {
    expect(validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, minStayMinutes: 10 })).toHaveSize(1);
    expect(validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, minStayMinutes: 1500 })).toHaveSize(1);
    expect(validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, minStayMinutes: NaN })).toHaveSize(1);
    expect(validateHandoffRules({ ...DEFAULT_HANDOFF_RULES, minStayMinutes: 1440 })).toEqual([]);
  });
});

describe('handoffRulesOf', () => {
  it('cai nos padrões para pacientes anteriores à regra', () => {
    expect(handoffRulesOf({})).toEqual(DEFAULT_HANDOFF_RULES);
  });

  it('usa o que o paciente tem', () => {
    expect(
      handoffRulesOf({ handoffWindowStart: '07:00', handoffWindowEnd: '20:00', minStayMinutes: 480 }),
    ).toEqual({ windowStart: '07:00', windowEnd: '20:00', minStayMinutes: 480 });
  });
});
