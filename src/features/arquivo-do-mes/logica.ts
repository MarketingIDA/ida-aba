import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { plural } from '@/utils/textos';
import { ROTULO_DO_TURNO } from '@/utils/turno';

/** Evoluções que ainda seguram o arquivo: sem evolução ou em conferência (E24). */
export function faltam(carteira: CarteiraDoMes): number {
  return carteira.semEvolucao + carteira.emConferencia;
}

/** O que o banco exige para o envio: carteira toda concluída, com evolução, e a assinatura. */
export function prontoParaEnviar(carteira: CarteiraDoMes): boolean {
  return (
    carteira.arquivo === null &&
    faltam(carteira) === 0 &&
    carteira.concluidas > 0 &&
    carteira.comAssinatura === true
  );
}

/** "2 em conferência e 1 sem evolução". */
export function textoDoQueFalta(carteira: CarteiraDoMes): string {
  return [
    carteira.emConferencia > 0 ? `${String(carteira.emConferencia)} em conferência` : '',
    carteira.semEvolucao > 0 ? `${String(carteira.semEvolucao)} sem evolução` : '',
  ]
    .filter((parte) => parte !== '')
    .join(' e ');
}

/** "Unidade Fictícia · Manhã" */
export function nomeDaCarteira(carteira: CarteiraDoMes): string {
  return `${carteira.unidadeNome} · ${ROTULO_DO_TURNO[carteira.turno]}`;
}

/** "5 de 12 evoluções concluídas" */
export function textoDoAndamento(carteira: CarteiraDoMes): string {
  const de = `${String(carteira.concluidas)} de ${String(carteira.assistidos)}`;
  return `${de} ${carteira.assistidos === 1 ? 'evolução concluída' : 'evoluções concluídas'}`;
}

export const evolucoes = (n: number) => plural(n, 'evolução', 'evoluções');
