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

/**
 * Cores sugeridas, na ordem em que são atribuídas: quem é cadastrado recebe a
 * primeira que ninguém usa ainda. Oito saem da paleta da marca; lilás sereno e
 * pêssego foram acrescentados para fechar dez, porque a marca não tem matizes
 * distintos suficientes.
 *
 * Nenhuma é vetada por ser parecida com a do Vago: o que mantém o Vago
 * inconfundível é o bloco escrever "Vago" e ter borda tracejada, não a cor.
 */
export const MEMBER_PALETTE: readonly PaletteColor[] = [
  { name: 'Verde natureza', hex: '#4e8f62' },
  { name: 'Azul céu', hex: '#7ec7e6' },
  { name: 'Amarelo sol', hex: '#f7c948' },
  { name: 'Rosa suave', hex: '#e89ba0' },
  { name: 'Marrom telha', hex: '#a35a34' },
  { name: 'Lilás sereno', hex: '#a79ac4' },
  { name: 'Verde principal', hex: '#1f4d3f' },
  { name: 'Cinza pedra', hex: '#9aa09a' },
  { name: 'Pêssego', hex: '#f0b08a' },
  { name: 'Marrom madeira', hex: '#5b3a28' },
];

/**
 * O fundo do calendário nos dois temas: é sobre ele que a transparência do card
 * aparece. Espelha `--color-surface` de `styles/_tokens.scss`.
 */
export const SURFACE_COLORS = { light: '#fffdf5', dark: '#1f4d3f' } as const;

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

/** Quanto da cor um turno de dia passado mantém: a mistura recua 45% em direção ao fundo. */
export const PAST_COLOR_KEEP = 0.55;

/**
 * A transparência com que um turno é desenhado. Dia passado empalidece pela COR —
 * a transparência sobe e a tinta é recalculada sobre o resultado —, nunca por
 * `opacity` no card, que apagaria o texto junto e levaria o contraste para perto de
 * 2:1. O valor pode sair da grade de 5 em 5: é só para desenhar, nunca é gravado.
 */
export function shownTransparency(transparency: number, past: boolean): number {
  return past ? 100 - (100 - transparency) * PAST_COLOR_KEEP : transparency;
}

/**
 * Texto do card em cada tema: o que mais contrasta com a cor JÁ misturada ao fundo.
 * Os dois são calculados porque o tema só se sabe no CSS; quem desenha escolhe
 * entre eles por `--theme-dark`, do mesmo bloco de tokens que define o fundo.
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
