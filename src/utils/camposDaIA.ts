import type { CampoDaIA } from '@dominio/rascunho.ts';

/** Como cada bloco que a IA escreve aparece na tela: os 5 trechos e as duas listas de metas. */
export const ROTULO_DO_CAMPO: Record<CampoDaIA, string> = {
  abertura: 'Abertura',
  programas: 'Programas trabalhados',
  comportamentos: 'Comportamentos e manejo',
  recursos: 'Recursos e reforçadores',
  fechamento: 'Fechamento',
  metas_alcancadas: 'Metas alcançadas',
  metas_do_mes: 'Metas para o mês atual',
};
