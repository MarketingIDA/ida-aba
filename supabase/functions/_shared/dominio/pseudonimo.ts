/**
 * Troca do nome do assistido antes de o texto ir para a IA (E05): o nome completo e o primeiro
 * nome viram "o assistido" ou "a assistida", pelo gênero do cadastro. Plano e CRP nem chegam aqui.
 *
 * Domínio puro: roda igual no navegador e nas Edge Functions.
 */
export type Genero = 'feminino' | 'masculino';

/** Como o texto se refere ao assistido no lugar do nome. */
export function tratamentoDe(genero: Genero): string {
  return genero === 'feminino' ? 'a assistida' : 'o assistido';
}

/** As letras que aparecem com acento em nomes, para o padrão achar "Joao" em "João". */
const VARIANTES: Record<string, string> = {
  a: 'aáàâãä',
  e: 'eéèêë',
  i: 'iíìîï',
  o: 'oóòôõö',
  u: 'uúùûü',
  c: 'cç',
  n: 'nñ',
};

/** O nome como palavra inteira, sem diferenciar maiúsculas, acentos nem a quantidade de espaços. */
function padraoDo(nome: string): string {
  const semAcento = nome.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase();
  const letras = Array.from(semAcento, (letra) => {
    if (letra === ' ') return String.raw`\s+`;
    const variantes = VARIANTES[letra];
    return variantes === undefined
      ? letra.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
      : `[${variantes}]`;
  });
  return String.raw`(?<![\p{L}\p{N}])${letras.join('')}(?![\p{L}\p{N}])`;
}

/** O texto sem o nome do assistido, e quantas trocas foram feitas. */
export function trocarNome(
  texto: string,
  nome: string,
  genero: Genero,
): { texto: string; trocas: number } {
  const completo = nome.trim().replaceAll(/\s+/g, ' ');
  const primeiro = completo.split(' ', 1).join('');
  let trocas = 0;
  let saida = texto;
  // O nome completo primeiro: trocado só o primeiro nome, o sobrenome ficaria solto no texto.
  for (const alvo of [completo, primeiro]) {
    if (alvo.length < 2) continue;
    saida = saida.replaceAll(new RegExp(padraoDo(alvo), 'giu'), () => {
      trocas += 1;
      return tratamentoDe(genero);
    });
  }
  return { texto: saida, trocas };
}
