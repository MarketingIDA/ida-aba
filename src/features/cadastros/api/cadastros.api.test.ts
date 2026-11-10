import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { buscarUnidades, salvarUnidade } from '@/features/cadastros/api/cadastros.api';
import { unidadesDoCadastroDemo } from '@/testing/factories/cadastros';
import { server } from '@/testing/server';

const UNIDADES = `${env.SUPABASE_URL}/rest/v1/unidades`;
const VALORES = {
  sigla: 'UNA',
  nome: 'Unidade Fictícia',
  cnpj: '12345678000195',
  endereco: null,
  ativa: true,
};

describe('API do cadastro', () => {
  it('quem não é da coordenação geral recebe a recusa do RLS em português', async () => {
    server.use(
      http.post(UNIDADES, () =>
        HttpResponse.json(
          { code: '42501', message: 'new row violates row-level security policy' },
          { status: 403 },
        ),
      ),
    );
    await expect(salvarUnidade(VALORES)).rejects.toMatchObject({
      codigo: 'sem_permissao',
      message: 'Só a coordenação geral cadastra e altera unidades.',
    });
  });

  it('alterar uma linha que o RLS esconde também é recusa, não sucesso', async () => {
    server.use(
      http.patch(UNIDADES, () =>
        HttpResponse.json(
          { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
          { status: 406 },
        ),
      ),
    );
    await expect(salvarUnidade(VALORES, 9)).rejects.toMatchObject({ codigo: 'sem_permissao' });
  });

  it('lê a unidade de antes da obrigação do CNPJ, que ainda vem sem ele', async () => {
    server.use(http.get(UNIDADES, () => HttpResponse.json(unidadesDoCadastroDemo())));
    const unidades = await buscarUnidades();
    expect(unidades.find((unidade) => unidade.sigla === 'UNB')?.cnpj).toBeNull();
  });

  it('resposta fora do formato não vira dado na tela', async () => {
    server.use(http.get(UNIDADES, () => HttpResponse.json([{ id: 'um', sigla: 1 }])));
    await expect(buscarUnidades()).rejects.toThrow();
  });
});
