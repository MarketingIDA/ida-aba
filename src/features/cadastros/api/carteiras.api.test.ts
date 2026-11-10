import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import {
  alterarCarteira,
  buscarCarteiras,
  cadastrarCarteira,
} from '@/features/cadastros/api/carteiras.api';
import { carteirasDemo, mesmaVagaAtiva } from '@/testing/factories/cadastros';
import { server } from '@/testing/server';
import { tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const CARTEIRAS = `${env.SUPABASE_URL}/rest/v1/carteiras`;

const tabelaDeCarteiras = () =>
  tabelaEmMemoria('carteiras', carteirasDemo(), mesmaVagaAtiva, { ativa: true });

describe('API das carteiras', () => {
  it('lê do schema cadastro e traz os ids em camelCase', async () => {
    const carteiras = await buscarCarteiras();
    expect(carteiras[0]).toEqual({
      id: 1,
      unidadeId: 1,
      turno: 'tarde',
      coordenadorId: 4,
      ativa: true,
    });
  });

  it('cadastra com unidade, turno e coordenação, e a carteira nasce ativa', async () => {
    const escritas = tabelaDeCarteiras();
    const nova = await cadastrarCarteira({ unidadeId: 3, turno: 'manha', coordenadorId: 2 });

    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: { unidade_id: 3, turno: 'manha', coordenador_id: 2 },
        perfil: 'cadastro',
      },
    ]);
    expect(nova).toEqual({ id: 5, unidadeId: 3, turno: 'manha', coordenadorId: 2, ativa: true });
  });

  it('na alteração, manda só a coordenação e o "ativa": unidade e turno não mudam', async () => {
    const escritas = tabelaDeCarteiras();
    await alterarCarteira(1, { coordenadorId: 2, ativa: false });

    expect(escritas).toEqual([
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
    // Reativar a manhã antiga da UNA esbarra na manhã que está ativa.
    await expect(alterarCarteira(3, { coordenadorId: 4, ativa: true })).rejects.toMatchObject({
      codigo: 'duplicado',
    });
  });

  it('quem não tem o papel de coordenação de unidade é recusado pelo banco', async () => {
    server.use(
      http.patch(CARTEIRAS, () =>
        HttpResponse.json({ code: '23514', message: 'regra' }, { status: 400 }),
      ),
    );
    await expect(alterarCarteira(1, { coordenadorId: 1, ativa: true })).rejects.toMatchObject({
      codigo: 'regra_violada',
      message: 'A carteira precisa de alguém com o papel de coordenação de unidade.',
    });
  });

  it('quem não é da coordenação geral recebe a recusa do RLS em português', async () => {
    server.use(
      http.post(CARTEIRAS, () =>
        HttpResponse.json({ code: '42501', message: 'row-level security' }, { status: 403 }),
      ),
    );
    await expect(
      cadastrarCarteira({ unidadeId: 3, turno: 'tarde', coordenadorId: 2 }),
    ).rejects.toMatchObject({
      codigo: 'sem_permissao',
      message: 'Só a coordenação geral cadastra e altera carteiras.',
    });
  });

  it('resposta fora do formato não vira dado na tela', async () => {
    server.use(http.get(CARTEIRAS, () => HttpResponse.json([{ id: 1, turno: 'noite' }])));
    await expect(buscarCarteiras()).rejects.toThrow();
  });
});
