import { describe, expect, it } from 'vitest';

import { alterarCarteira, cadastrarCarteira } from '@/features/cadastros/api/carteiras.api';
import { carteirasDemo, mesmaVagaAtiva } from '@/testing/factories/cadastros';
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
});
