import { HexColor, blendOver, isValidHexColor, normalizeHex, readableTextOn } from './color.util';

/**
 * A cor de cada familiar no calendário.
 *
 * Vive em `core/color` porque `patients` a escolhe (cadastro do familiar) e `schedule`
 * a desenha (cards do calendário), e as duas features não se importam.
 */
export interface PaletteColor {
  name: string;
  hex: HexColor;
}

/** Cores sugeridas, bem separadas entre si. Todas legíveis com texto por cima. */
export const MEMBER_PALETTE: readonly PaletteColor[] = [
  { name: 'Azul', hex: '#1565c0' },
  { name: 'Laranja', hex: '#ef6c00' },
  { name: 'Verde', hex: '#2e7d32' },
  { name: 'Rosa', hex: '#d81b60' },
  { name: 'Roxo', hex: '#6a1b9a' },
  { name: 'Turquesa', hex: '#009688' },
  { name: 'Amarelo', hex: '#f9c600' },
  { name: 'Vermelho', hex: '#c62828' },
  { name: 'Marrom', hex: '#795548' },
  { name: 'Índigo', hex: '#3949ab' },
];

/**
 * O fundo do calendário nos dois temas: é sobre ele que a transparência do card
 * aparece. Espelha `--color-surface` de `styles/_tokens.scss`.
 */
export const SURFACE_COLORS = { light: '#ffffff', dark: '#18242b' } as const;

/**
 * Transparência do card, em %. Perto de 95% o card quase some no fundo e só a borda
 * o mostra; o administrador assume esse risco, e por isso não há veto de cor.
 */
export const TRANSPARENCY_LIMITS = { min: 40, max: 95, step: 5 } as const;

/** A menos transparente que a faixa permite: o calendário fica leve sem apagar a cor. */
export const DEFAULT_TRANSPARENCY: number = TRANSPARENCY_LIMITS.min;

export function isValidTransparency(value: number): boolean {
  const { min, max, step } = TRANSPARENCY_LIMITS;
  return Number.isInteger(value) && value >= min && value <= max && (value - min) % step === 0;
}

/** Único ponto de leitura da transparência. Docs antigos não têm o campo. */
export function transparencyOf(value?: number | null): number {
  return typeof value === 'number' && isValidTransparency(value) ? value : DEFAULT_TRANSPARENCY;
}

/** Peso da cor sobre o fundo (0 a 1) para uma transparência em %. */
export function colorWeight(transparency: number): number {
  return (100 - transparency) / 100;
}

/**
 * Texto do card em cada tema: o que mais contrasta com a cor JÁ misturada ao fundo.
 * Os dois são calculados porque o tema só se sabe no CSS (`prefers-color-scheme`).
 */
export function memberTextColors(
  color: HexColor,
  transparency: number,
): { light: HexColor; dark: HexColor } {
  const weight = colorWeight(transparency);

  return {
    light: readableTextOn(blendOver(color, SURFACE_COLORS.light, weight)),
    dark: readableTextOn(blendOver(color, SURFACE_COLORS.dark, weight)),
  };
}

/**
 * Cor estável para quem nunca escolheu uma: derivada do id, então a tela privada e a
 * pública chegam à mesma cor sem migrar nada.
 */
export function defaultMemberColor(memberId: string): HexColor {
  let hash = 5381;
  for (const char of memberId) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }

  return MEMBER_PALETTE[hash % MEMBER_PALETTE.length].hex;
}

/** Primeira cor da paleta que ninguém usa ainda; com todas usadas, cai no padrão do id. */
export function nextFreeMemberColor(
  usedColors: readonly (string | null | undefined)[],
  seed = '',
): HexColor {
  const used = new Set<string>();
  for (const color of usedColors) {
    if (color) {
      used.add(normalizeHex(color));
    }
  }

  const free = MEMBER_PALETTE.find((option) => !used.has(option.hex));
  return free?.hex ?? defaultMemberColor(seed);
}

/** Único ponto de leitura da cor de um familiar. Docs antigos não têm o campo. */
export function memberColorOf(memberId: string, color?: string | null): HexColor {
  return color && isValidHexColor(color) ? normalizeHex(color) : defaultMemberColor(memberId);
}
