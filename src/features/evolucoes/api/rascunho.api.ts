import { chamarFuncaoDaEvolucao } from '@/features/evolucoes/api/funcoes';

/**
 * O rascunho pela IA (E06): a Edge Function `gerar-rascunho` lê a importação do Tita, tira o nome
 * do assistido (E05), pede o texto à IA e grava as partes 2 a 4. A chave da IA fica só no
 * servidor. Aqui a tela só pede e traduz a recusa.
 */
const INDISPONIVEL = 'Não foi possível gerar o rascunho agora. Tente de novo em instantes.';

/** Pede o rascunho das partes 2 a 4; a evolução volta do banco com as versões da IA. */
export function gerarRascunho(evolucaoId: string): Promise<void> {
  return chamarFuncaoDaEvolucao('gerar-rascunho', evolucaoId, INDISPONIVEL);
}

/**
 * Gera de novo só uma parte (E08), com a instrução do coordenador; a IA grava a versão nova com a
 * instrução (E07), e as outras partes não mudam.
 */
export function gerarParteDeNovo(
  evolucaoId: string,
  numero: 2 | 3 | 4,
  instrucao: string,
): Promise<void> {
  return chamarFuncaoDaEvolucao('gerar-rascunho', evolucaoId, INDISPONIVEL, { numero, instrucao });
}

/**
 * "Aprimorar com a IA" na evolução escrita à mão (E26): a Edge Function `aprimorar-texto` melhora a
 * linguagem da parte 2, sem fato novo, e grava a versão da IA; o texto do coordenador fica guardado.
 */
export function aprimorarTexto(evolucaoId: string): Promise<void> {
  return chamarFuncaoDaEvolucao(
    'aprimorar-texto',
    evolucaoId,
    'Não foi possível aprimorar o texto agora. Tente de novo em instantes.',
  );
}
