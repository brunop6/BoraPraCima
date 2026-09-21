import {
  DARK_TEXT,
  LIGHT_TEXT,
  MIN_TEXT_CONTRAST,
  blendOver,
  contrastRatio,
  isValidHexColor,
  normalizeHex,
  readableTextOn,
} from './color.util';

describe('isValidHexColor', () => {
  it('aceita #rrggbb em qualquer caixa', () => {
    expect(isValidHexColor('#1565c0')).toBeTrue();
    expect(isValidHexColor('#1565C0')).toBeTrue();
  });

  it('recusa o que não é #rrggbb', () => {
    expect(isValidHexColor('')).toBeFalse();
    expect(isValidHexColor('1565c0')).toBeFalse();
    expect(isValidHexColor('#fff')).toBeFalse();
    expect(isValidHexColor('#zzzzzz')).toBeFalse();
    expect(isValidHexColor('rgb(0,0,0)')).toBeFalse();
  });
});

describe('normalizeHex', () => {
  it('põe em minúsculas e tira espaços', () => {
    expect(normalizeHex(' #1565C0 ')).toBe('#1565c0');
  });
});

describe('contrastRatio', () => {
  it('vai de 1 (iguais) a 21 (preto no branco)', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('não depende da ordem', () => {
    expect(contrastRatio('#1565c0', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#1565c0'),
      10,
    );
  });
});

describe('readableTextOn', () => {
  it('usa texto branco sobre fundo escuro', () => {
    expect(readableTextOn('#1a237e')).toBe(LIGHT_TEXT);
  });

  it('usa texto escuro sobre fundo claro', () => {
    expect(readableTextOn('#ffeb3b')).toBe(DARK_TEXT);
  });

  it('nunca fica abaixo de 4,5:1, nem nos tons médios', () => {
    for (let level = 0; level <= 255; level += 5) {
      const hex = '#' + level.toString(16).padStart(2, '0').repeat(3);
      expect(contrastRatio(hex, readableTextOn(hex)))
        .withContext(hex)
        .toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});

describe('blendOver', () => {
  it('peso 1 é a própria cor e peso 0 é o fundo', () => {
    expect(blendOver('#1565c0', '#ffffff', 1)).toBe('#1565c0');
    expect(blendOver('#1565c0', '#ffffff', 0)).toBe('#ffffff');
  });

  it('mistura na proporção', () => {
    expect(blendOver('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(blendOver('#ff0000', '#000000', 0.8)).toBe('#cc0000');
  });
});
