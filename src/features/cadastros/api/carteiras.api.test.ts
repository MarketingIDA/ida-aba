import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';

import { alterarCarteira, cadastrarCarteira } from '@/features/cadastros/api/carteiras.api';
import { carteirasDemo, mesmaVagaAtiva } from '@/testing/factories/cadastros';
import { server } from '@/testing/server';
import { tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const tabelaDeCarteiras = () =>
  tabelaEmMemoria('carteiras', carteirasDemo(), mesmaVagaAtiva, { ativa: true });

describe('API das carteiras', () => {
  it('manda só as colunas certas: a alteração não mexe na unidade nem no turno', async () => {
    const escritas = tabelaDeCarteiras();
    await cadastrarCarteira({ unidadeId: 3, turno: 'manha', coordenadorId: 2 });
    await alterarCarteira(1, { coordenadorId: 2, ativa: false });

    // A coordenação vai sempre no PATCH: o trigger do banco confere o papel de novo.
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: { unidade_id: 3, turno: 'manha', coordenador_id: 2 },
        perfil: 'cadastro',
      },
      { metodo: 'PATCH', corpo: { coordenador_id: 2, ativa: false }, perfil: 'cadastro' },
    ]);
  });

  it('a segunda carteira ativa na mesma unidade e turno é recusada com o motivo', async () => {
    tabelaDeCarteiras();
    await expect(
      cadastrarCarteira({ unidadeId: 1, turno: 'manha', coordenadorId: 4 }),
    ).rejects.toMatchObject({
      codigo: 'duplicado',
      message: 'Esta unidade já tem carteira ativa neste turno. Passe a que existe ou desative-a.',
    });
  });

  it('a carteira com assistidos ativos não se desativa: o motivo diz o que fazer', async () => {
    server.use(
      http.patch(`${env.SUPABASE_URL}/rest/v1/carteiras`, () =>
        HttpResponse.json(
          { code: '23514', hint: 'carteira_com_assistidos', message: 'regra' },
          { status: 400 },
        ),
      ),
    );
    await expect(alterarCarteira(4, { coordenadorId: 2, ativa: false })).rejects.toMatchObject({
      codigo: 'regra_violada',
      message:
        'Esta carteira tem assistidos ativos. Passe cada um para outra carteira, na aba Assistidos, antes de desativar.',
    });
  });
});
