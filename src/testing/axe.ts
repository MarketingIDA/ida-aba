import axe from 'axe-core';

/**
 * Regras do axe que o jsdom não sabe avaliar: sem layout nem cor calculada, o contraste fica
 * para o @axe-core/playwright no E2E, que roda em navegador de verdade.
 */
const SEM_LAYOUT = { 'color-contrast': { enabled: false } };

/** Violações WCAG 2.2 AA do trecho renderizado (lista vazia = sem violação). */
export async function violacoesDeAcessibilidade(elemento: Element): Promise<string[]> {
  const resultado = await axe.run(elemento, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
    rules: SEM_LAYOUT,
  });
  return resultado.violations.map((v) => `${v.id}: ${v.help}`);
}
