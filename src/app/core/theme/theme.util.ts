/**
 * O tema segue o relógio, não a preferência do sistema: o calendário é lido de
 * madrugada, com o quarto apagado, e uma tela branca incomoda o paciente mesmo
 * quando o aparelho de quem acompanha está configurado para o claro.
 *
 * A hora é a do aparelho, porque é o ambiente de quem está olhando para ele.
 *
 * O `index.html` repete estas duas horas num script inline, que precisa rodar antes
 * do primeiro desenho para a página não piscar branca de madrugada. Mexeu aqui,
 * mexa lá.
 */
export type Theme = 'light' | 'dark';

/** Das 06:00 às 18:00 é claro; o resto é escuro. */
export const LIGHT_FROM_HOUR = 6;
export const DARK_FROM_HOUR = 18;

/** O `theme-color` da barra do navegador em cada tema: o verde do cabeçalho e o fundo escuro. */
export const THEME_COLORS: Record<Theme, string> = {
  light: '#1f4d3f',
  dark: '#142c2b',
};

export function themeAt(now: Date): Theme {
  const hour = now.getHours();
  return hour >= LIGHT_FROM_HOUR && hour < DARK_FROM_HOUR ? 'light' : 'dark';
}

/**
 * Quanto falta, em ms, para a próxima virada de tema. Monta as viradas como
 * datas locais em vez de somar horas, para o horário de verão não a deslocar.
 */
export function msUntilNextSwitch(now: Date): number {
  const at = (dayOffset: number, hour: number): Date => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  const next = [at(0, LIGHT_FROM_HOUR), at(0, DARK_FROM_HOUR), at(1, LIGHT_FROM_HOUR)].find(
    (switchAt) => switchAt.getTime() > now.getTime(),
  );

  // O último candidato é sempre amanhã, então `find` nunca falha; o `?? 0` é só o tipo.
  return (next?.getTime() ?? now.getTime()) - now.getTime();
}
