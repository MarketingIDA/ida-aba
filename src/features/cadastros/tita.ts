import type { PendenciaDaTita, Sincronizacao } from '@/features/cadastros/api/tita.api';

/** Os textos da sincronização com a Tita (E28). */

const numero = (n: number) => n.toLocaleString('pt-BR');

const quando = (instante: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Recife',
  }).format(new Date(instante));

/** "1 pendência" / "1.032 pendências". */
export const contar = (n: number, um: string, varios: string) =>
  `${numero(n)} ${n === 1 ? um : varios}`;

/** Quando foi a última sincronização e o que ela fez, ou por que falhou. */
export function textoDaUltima(ultima: Sincronizacao | null): string {
  if (ultima === null) {
    return 'Ainda não sincronizado. Quem vem da Tita entra como rascunho, sem carteira: a Tita não diz o turno.';
  }
  const em = `${quando(ultima.feitaEm)}${ultima.origem === 'agendada' ? ' (automática)' : ''}`;
  if (ultima.resumo === null) return `A última tentativa, em ${em}, falhou: ${String(ultima.erro)}`;
  const { criados, ligados, atualizados } = ultima.resumo;
  return `Última sincronização em ${em}: ${contar(criados, 'novo', 'novos')}, ${contar(ligados, 'ligado', 'ligados')} a cadastros que já existiam e ${contar(atualizados, 'atualizado', 'atualizados')}.`;
}

/** O que cada pendência pede, em uma frase. */
export function textoDaPendencia({ tipo, nome, detalhe, quantidade }: PendenciaDaTita): string {
  const quem = nome === null || nome === '' ? 'Favorecido sem nome' : nome;
  const qual = String(detalhe);
  const quantos = quantidade ?? 0;
  const textos: Record<PendenciaDaTita['tipo'], string> = {
    unidade_desconhecida: `A unidade “${qual}” da Tita não está ligada a nenhuma daqui (${contar(quantos, 'favorecido', 'favorecidos')}).`,
    sem_unidade: `${quem}: sem unidade na Tita. Não entrou.`,
    varias_unidades: `${quem}: mais de uma unidade na Tita (${qual}).`,
    outra_unidade: `${quem}: na Tita está em ${qual}. Troque a carteira, se for o caso.`,
    nome_incompleto: `${quem}: nome sem sobrenome na Tita. Corrija lá.`,
    data_invalida: `${quem}: data de nascimento inválida na Tita. Corrija lá.`,
    sem_genero: `${quem}: sexo “Outros” na Tita. Escolha “a assistida” ou “o assistido”.`,
    possivel_duplicado: `${quem}: ${qual} e o mesmo nascimento. Confira se não é a mesma criança; se for, desative o rascunho.`,
    inativo_na_tita: `${quem}: inativo na Tita e ativo aqui.`,
    fora_da_tita: `${quem}: não veio na lista da Tita.`,
    sem_id: `Ficaram de fora, sem id da Tita: ${contar(quantos, 'favorecido', 'favorecidos')}.`,
    erro: `${quem}: não entrou (${qual}).`,
  };
  return textos[tipo];
}
