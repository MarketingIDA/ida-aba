import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { salvarAssistido } from '@/features/cadastros/api/assistidos.api';
import { assistidosDemo } from '@/testing/factories/cadastros';
import { server } from '@/testing/server';
import { tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const DADOS = {
  nome: 'Elisa Fictícia Prado',
  genero: 'feminino',
  dataNascimento: null,
  planoId: null,
  unidadeId: 2,
  carteiraId: 2,
  ativo: true,
} as const;

describe('API dos assistidos', () => {
  it('manda as colunas em snake_case, com nascimento e plano nulos, no cadastro e na alteração', async () => {
    const escritas = tabelaEmMemoria('assistidos', assistidosDemo(), () => false);
    const salvo = await salvarAssistido(DADOS);
    await salvarAssistido({ ...DADOS, planoId: 1, ativo: false }, salvo.id);

    const linha = {
      nome: 'Elisa Fictícia Prado',
      genero: 'feminino',
      data_nascimento: null,
      plano_id: null,
      unidade_id: 2,
      carteira_id: 2,
      ativo: true,
    };
    expect(salvo).toEqual({ id: 4, ...DADOS });
    expect(escritas).toEqual([
      { metodo: 'POST', corpo: linha, perfil: 'cadastro' },
      { metodo: 'PATCH', corpo: { ...linha, plano_id: 1, ativo: false }, perfil: 'cadastro' },
    ]);
  });

  it('a carteira desativada é recusada pelo banco com o motivo', async () => {
    server.use(
      http.post(`${env.SUPABASE_URL}/rest/v1/assistidos`, () =>
        HttpResponse.json(
          { code: '23514', hint: 'carteira_desativada', message: 'regra' },
          { status: 400 },
        ),
      ),
    );
    await expect(salvarAssistido(DADOS)).rejects.toMatchObject({
      codigo: 'regra_violada',
      message: 'A carteira escolhida está desativada. Escolha uma carteira ativa.',
    });
  });
});
