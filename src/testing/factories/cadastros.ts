import type { Plano, Unidade } from '@/features/cadastros/api/cadastros.api';

/** Unidades fictícias do cadastro, na ordem da Data API (por sigla). Nenhuma é real. */
export function unidadesDoCadastroDemo(): Unidade[] {
  return [
    { id: 1, sigla: 'UNA', nome: 'Unidade Fictícia', ativa: true },
    { id: 2, sigla: 'UNB', nome: 'Outra Unidade Fictícia', ativa: false },
    { id: 3, sigla: 'UNC', nome: 'Terceira Unidade Fictícia', ativa: true },
  ];
}

/** Planos fictícios, na ordem da Data API (por nome). */
export function planosDemo(): Plano[] {
  return [
    { id: 1, nome: 'Plano Fictício', ativo: true },
    { id: 2, nome: 'Plano Fictício Antigo', ativo: false },
  ];
}
