import { MIN_TEXT_CONTRAST, blendOver, contrastRatio } from './color.util';
import {
  DEFAULT_TRANSPARENCY,
  MEMBER_PALETTE,
  SURFACE_COLORS,
  TRANSPARENCY_LIMITS,
  colorWeight,
  defaultMemberColor,
  isValidTransparency,
  memberColorOf,
  memberTextColors,
  nextFreeMemberColor,
  transparencyOf,
} from './member-color';

const TRANSPARENCY_STEPS = Array.from(
  { length: (TRANSPARENCY_LIMITS.max - TRANSPARENCY_LIMITS.min) / TRANSPARENCY_LIMITS.step + 1 },
  (_, index) => TRANSPARENCY_LIMITS.min + index * TRANSPARENCY_LIMITS.step,
);

describe('MEMBER_PALETTE', () => {
  it('só tem cores legíveis com texto por cima (AA), em qualquer transparência e tema', () => {
    for (const { name, hex } of MEMBER_PALETTE) {
      for (const transparency of TRANSPARENCY_STEPS) {
        const weight = colorWeight(transparency);
        const text = memberTextColors(hex, transparency);

        for (const theme of ['light', 'dark'] as const) {
          const shown = blendOver(hex, SURFACE_COLORS[theme], weight);
          expect(contrastRatio(shown, text[theme]))
            .withContext(`${name} a ${transparency}% no tema ${theme}`)
            .toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
        }
      }
    }
  });

  it('não repete cor nem nome', () => {
    expect(new Set(MEMBER_PALETTE.map((color) => color.hex)).size).toBe(MEMBER_PALETTE.length);
    expect(new Set(MEMBER_PALETTE.map((color) => color.name)).size).toBe(MEMBER_PALETTE.length);
  });
});

describe('defaultMemberColor', () => {
  it('é estável para o mesmo id', () => {
    expect(defaultMemberColor('abc123')).toBe(defaultMemberColor('abc123'));
  });

  it('sempre devolve uma cor da paleta', () => {
    const hexes = MEMBER_PALETTE.map((color) => color.hex);
    for (const id of ['a', 'b', 'c', 'Zk3pQ9', '']) {
      expect(hexes).toContain(defaultMemberColor(id));
    }
  });
});

describe('nextFreeMemberColor', () => {
  it('começa pela primeira cor da paleta', () => {
    expect(nextFreeMemberColor([])).toBe(MEMBER_PALETTE[0].hex);
  });

  it('pula as cores já usadas, sem se importar com a caixa', () => {
    expect(nextFreeMemberColor([MEMBER_PALETTE[0].hex.toUpperCase(), undefined, null])).toBe(
      MEMBER_PALETTE[1].hex,
    );
  });

  it('com a paleta toda usada, cai na cor derivada do id', () => {
    const all = MEMBER_PALETTE.map((color) => color.hex);
    expect(nextFreeMemberColor(all, 'abc123')).toBe(defaultMemberColor('abc123'));
  });
});

describe('memberColorOf', () => {
  it('usa a cor gravada', () => {
    expect(memberColorOf('abc', '#1565C0')).toBe('#1565c0');
  });

  it('cai na cor derivada do id para docs antigos ou com valor inválido', () => {
    expect(memberColorOf('abc')).toBe(defaultMemberColor('abc'));
    expect(memberColorOf('abc', null)).toBe(defaultMemberColor('abc'));
    expect(memberColorOf('abc', 'lixo')).toBe(defaultMemberColor('abc'));
  });
});

describe('transparência', () => {
  it('o padrão está dentro da faixa e é a menos transparente dela', () => {
    expect(isValidTransparency(DEFAULT_TRANSPARENCY)).toBeTrue();
    expect(DEFAULT_TRANSPARENCY).toBe(TRANSPARENCY_LIMITS.min);
  });

  it('aceita de 40% a 95% em passos de 5', () => {
    expect(TRANSPARENCY_STEPS[0]).toBe(40);
    expect(TRANSPARENCY_STEPS[TRANSPARENCY_STEPS.length - 1]).toBe(95);
    expect(TRANSPARENCY_STEPS.every(isValidTransparency)).toBeTrue();
    expect(isValidTransparency(35)).toBeFalse();
    expect(isValidTransparency(100)).toBeFalse();
    expect(isValidTransparency(0)).toBeFalse();
    expect(isValidTransparency(42)).toBeFalse();
    expect(isValidTransparency(42.5)).toBeFalse();
    expect(isValidTransparency(NaN)).toBeFalse();
  });

  it('transparencyOf cai no padrão para docs antigos ou valor inválido', () => {
    expect(transparencyOf(60)).toBe(60);
    expect(transparencyOf(95)).toBe(95);
    expect(transparencyOf(20)).toBe(DEFAULT_TRANSPARENCY); // faixa antiga (0–50)
    expect(transparencyOf(undefined)).toBe(DEFAULT_TRANSPARENCY);
    expect(transparencyOf(null)).toBe(DEFAULT_TRANSPARENCY);
    expect(transparencyOf(99)).toBe(DEFAULT_TRANSPARENCY);
  });

  it('colorWeight converte transparência em peso da cor', () => {
    expect(colorWeight(0)).toBe(1);
    expect(colorWeight(40)).toBeCloseTo(0.6, 10);
    expect(colorWeight(95)).toBeCloseTo(0.05, 10);
  });
});
