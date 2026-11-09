import type { Coordenador, LinhaDoMes, Turno } from '@/features/evolucoes/api/evolucoes.api';
import { carteiraUnica, ROTULO_DO_TURNO, textoDoPrazo } from '@/features/evolucoes/logica';
import {
  diasAtePrazo,
  formatarData,
  nomeDoMes,
  periodoAnalisado,
  prazoDoArquivo,
} from '@dominio/mes.ts';

const TURNO_POR_EXTENSO: Record<Turno, string> = {
  manha: 'turno da manhã',
  tarde: 'turno da tarde',
  integral: 'turno integral',
};

/** Começo do subtítulo: de quem é a lista. */
export function deQuemEALista(visaoGeral: boolean, linhas: readonly LinhaDoMes[]): string {
  if (visaoGeral) return 'Todas as unidades. ';
  const carteira = carteiraUnica(linhas);
  if (carteira === null) return '';
  return `Sua carteira em ${carteira.unidadeNome}, ${TURNO_POR_EXTENSO[carteira.turno]}. `;
}

/**
 * Resto do subtítulo: as sessões que o mês analisa (E18) e o prazo do arquivo do mês (E15), com
 * quanto falta quando o mês está aberto.
 */
export function periodoEPrazo(mes: string, mesAberto: string, hoje: string): string {
  const { inicio, fim } = periodoAnalisado(mes);
  const sessoes = `Sessões de ${formatarData(inicio, true)} a ${formatarData(fim)}`;
  const prazo = formatarData(prazoDoArquivo(mes), true);
  if (mes !== mesAberto) {
    return `Evoluções de ${nomeDoMes(mes)}. ${sessoes}; o prazo do arquivo do mês foi ${prazo}.`;
  }
  const falta = textoDoPrazo(diasAtePrazo(hoje, mes));
  return `${sessoes}; o arquivo do mês vai a contas médicas até ${prazo} (${falta}).`;
}

/** "Ana Beatriz Lima" → "Ana Lima", para caber na linha. */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0] ?? ''} ${partes.at(-1) ?? ''}` : nome.trim();
}

export interface Opcao {
  valor: string;
  rotulo: string;
}

/** Unidades presentes na lista, para o filtro da coordenação geral. */
export function opcoesDeUnidade(linhas: readonly LinhaDoMes[]): Opcao[] {
  const unidades = new Map<string, string>();
  for (const l of linhas) unidades.set(l.unidadeSigla, l.unidadeNome);
  return [...unidades]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([sigla, nome]) => ({ valor: sigla, rotulo: `${sigla} · ${nome}` }));
}

/** Coordenadores com carteira na lista (ou na unidade escolhida), com a unidade e o turno. */
export function opcoesDeCoordenador(
  linhas: readonly LinhaDoMes[],
  coordenadores: readonly Coordenador[],
  unidade: string | null,
): Opcao[] {
  return coordenadores.flatMap(({ id, nome }) => {
    const linha = linhas.find(
      (l) => l.coordenadorId === id && (unidade === null || l.unidadeSigla === unidade),
    );
    if (linha === undefined) return [];
    const turno = ROTULO_DO_TURNO[linha.turno].toLowerCase();
    return [{ valor: String(id), rotulo: `${nome} · ${linha.unidadeSigla} ${turno}` }];
  });
}
