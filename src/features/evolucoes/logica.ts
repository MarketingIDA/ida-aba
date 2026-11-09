import type { LinhaDoMes, Turno } from '@/features/evolucoes/api/evolucoes.api';

/** Situação de um assistido no mês: as três da evolução e "sem evolução" ainda. */
export type Situacao = 'sem' | 'em_conferencia' | 'concluida' | 'enviada';

export const SITUACOES: readonly Situacao[] = ['sem', 'em_conferencia', 'concluida', 'enviada'];

/** Rótulo e cor fixa de cada situação: neutro, amarelo (alerta), azul (info) e verde (ok). */
export const SITUACAO: Record<
  Situacao,
  { rotulo: string; plural: string; tom: 'neutro' | 'alerta' | 'info' | 'ok' }
> = {
  sem: { rotulo: 'Sem evolução', plural: 'Sem evolução', tom: 'neutro' },
  em_conferencia: { rotulo: 'Em conferência', plural: 'Em conferência', tom: 'alerta' },
  concluida: { rotulo: 'Concluída', plural: 'Concluídas', tom: 'info' },
  enviada: { rotulo: 'Enviada', plural: 'Enviadas', tom: 'ok' },
};

export const ROTULO_DO_TURNO: Record<Turno, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  integral: 'Integral',
};

export function ehSituacao(valor: string | null): valor is Situacao {
  return SITUACOES.includes(valor as Situacao);
}

export function situacaoDe(linha: LinhaDoMes): Situacao {
  return linha.evolucao?.situacao ?? 'sem';
}

export function contarPorSituacao(linhas: readonly LinhaDoMes[]): Record<Situacao, number> {
  const contagem: Record<Situacao, number> = {
    sem: 0,
    em_conferencia: 0,
    concluida: 0,
    enviada: 0,
  };
  for (const linha of linhas) contagem[situacaoDe(linha)] += 1;
  return contagem;
}

/** Sem acento e em minúsculas, para a busca achar "Joao" em "João". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replaceAll(/\p{M}/gu, '').toLowerCase().trim();
}

export interface Recorte {
  unidade: string | null;
  coordenadorId: number | null;
}

/** A base dos cards: a carteira toda ou o recorte de unidade e coordenador da coordenação geral. */
export function recortar(linhas: readonly LinhaDoMes[], recorte: Recorte): LinhaDoMes[] {
  return linhas.filter(
    (l) =>
      (recorte.unidade === null || l.unidadeSigla === recorte.unidade) &&
      (recorte.coordenadorId === null || l.coordenadorId === recorte.coordenadorId),
  );
}

// Em conferência primeiro (é o trabalho em andamento), depois quem falta começar.
const ORDEM: Record<Situacao, number> = { em_conferencia: 0, sem: 1, concluida: 2, enviada: 3 };

/** Filtra pela situação escolhida e pela busca (nome ou código) e ordena a lista. */
export function filtrarLista(
  linhas: readonly LinhaDoMes[],
  situacao: Situacao | null,
  busca: string,
): LinhaDoMes[] {
  const termo = normalizar(busca);
  return linhas
    .filter((l) => situacao === null || situacaoDe(l) === situacao)
    .filter(
      (l) =>
        termo === '' ||
        normalizar(l.nome).includes(termo) ||
        normalizar(l.evolucao?.codigo ?? '').includes(termo),
    )
    .sort(
      (a, b) =>
        ORDEM[situacaoDe(a)] - ORDEM[situacaoDe(b)] || a.nome.localeCompare(b.nome, 'pt-BR'),
    );
}

/** A carteira do coordenador, quando todos os assistidos estão na mesma unidade e turno. */
export function carteiraUnica(
  linhas: readonly LinhaDoMes[],
): { unidadeNome: string; turno: Turno } | null {
  const [primeira] = linhas;
  if (primeira === undefined) return null;
  const mesma = linhas.every(
    (l) => l.unidadeSigla === primeira.unidadeSigla && l.turno === primeira.turno,
  );
  return mesma ? { unidadeNome: primeira.unidadeNome, turno: primeira.turno } : null;
}

/** "faltam 6 dias", "falta 1 dia", "o prazo é hoje", "o prazo passou há 2 dias". */
export function textoDoPrazo(dias: number): string {
  if (dias > 1) return `faltam ${String(dias)} dias`;
  if (dias === 1) return 'falta 1 dia';
  if (dias === 0) return 'o prazo é hoje';
  return dias === -1 ? 'o prazo passou há 1 dia' : `o prazo passou há ${String(-dias)} dias`;
}

/** "1 evolução", "3 evoluções". */
export function plural(n: number, singular: string, varias: string): string {
  return `${String(n)} ${n === 1 ? singular : varias}`;
}
