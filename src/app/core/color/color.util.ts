/** Cor no formato `#rrggbb`, sempre minúscula. */
export type HexColor = string;

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

/** Texto escuro do tema claro (`--color-text`): o mesmo que o app usa no resto. */
export const DARK_TEXT: HexColor = '#15382e';
export const LIGHT_TEXT: HexColor = '#ffffff';
const BLACK_TEXT: HexColor = '#000000';

/** Contraste mínimo da WCAG AA para texto normal. */
export const MIN_TEXT_CONTRAST = 4.5;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value.trim().toLowerCase());
}

/** Minúscula e sem espaços, para comparar e gravar sempre do mesmo jeito. */
export function normalizeHex(value: string): HexColor {
  return value.trim().toLowerCase();
}

type Rgb = readonly [number, number, number];

function toRgb(hex: HexColor): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toLinear(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa da WCAG, de 0 (preto) a 1 (branco). */
export function relativeLuminance(hex: HexColor): number {
  const [r, g, b] = toRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste da WCAG, de 1 a 21. AA para texto normal pede 4,5. */
export function contrastRatio(a: HexColor, b: HexColor): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Texto (escuro ou branco) que mais contrasta com o fundo dado.
 *
 * Nos tons médios nem o escuro do app nem o branco chegam a 4,5:1; aí cai no preto
 * puro, que passa de 4,5:1 em qualquer fundo.
 */
export function readableTextOn(background: HexColor): HexColor {
  const dark = contrastRatio(background, DARK_TEXT);
  const light = contrastRatio(background, LIGHT_TEXT);

  if (Math.max(dark, light) < MIN_TEXT_CONTRAST) {
    return BLACK_TEXT;
  }

  return dark >= light ? DARK_TEXT : LIGHT_TEXT;
}

/**
 * Cor que se vê quando `foreground` cobre `background` com `weight` (0 a 1) de peso.
 * É o que a transparência produz: 80% de peso = 20% de transparência.
 */
export function blendOver(foreground: HexColor, background: HexColor, weight: number): HexColor {
  const top = toRgb(foreground);
  const bottom = toRgb(background);

  return (
    '#' +
    top
      .map((channel, index) => Math.round(channel * weight + bottom[index] * (1 - weight)))
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
  );
}
