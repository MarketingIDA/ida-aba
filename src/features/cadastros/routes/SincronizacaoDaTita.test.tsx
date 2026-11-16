import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { CadastrosPage } from '@/features/cadastros';
import { assistidosDemo } from '@/testing/factories/cadastros';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';
import { itensDa, tabelaEmMemoria } from '@/testing/tabelaEmMemoria';

const abrir = () =>
  renderWithProviders(
    <Routes>
      <Route path="/cadastros/:aba" element={<CadastrosPage />} />
    </Routes>,
    { rota: '/cadastros/assistidos', usuario: usuarioDemo({ papel: 'coordenacao_geral' }) },
  );

const RESUMO = { recebidos: 1217, criados: 1032, ligados: 0, atualizados: 0, ignorados: 185 };

const PENDENCIAS = [
  {
    id: 1,
    tipo: 'unidade_desconhecida',
    tita_id: null,
    assistido_id: null,
    nome: null,
    detalhe: 'INSTITUTO DO AUTISMO - NOVA',
    quantidade: 3,
  },
  {
    id: 2,
    tipo: 'sem_genero',
    tita_id: 9,
    assistido_id: 4,
    nome: 'Alex Fictício Exemplo',
    detalhe: null,
    quantidade: null,
  },
];

describe('Cadastros: sincronização com a Tita (E28)', () => {
  it('simula, mostra os números e só grava depois de confirmar; o rascunho entra na lista', async () => {
    const pedidos: unknown[] = [];
    const rascunho = {
      id: 4,
      nome: 'Alex Fictício Exemplo',
      genero: null,
      data_nascimento: null,
      plano_id: null,
      unidade_id: 1,
      carteira_id: null,
      ativo: true,
    };
    let sincronizado = false;
    server.use(
      http.post(`${env.SUPABASE_URL}/functions/v1/sincronizar-tita`, async ({ request }) => {
        const corpo = (await request.json()) as { simular: boolean };
        pedidos.push(corpo);
        sincronizado = !corpo.simular;
        return HttpResponse.json({ ...RESUMO, pendencias: 2, simulada: corpo.simular });
      }),
      http.get(`${env.SUPABASE_URL}/rest/v1/assistidos`, () =>
        HttpResponse.json(sincronizado ? [...assistidosDemo(), rascunho] : assistidosDemo()),
      ),
    );
    const { user } = abrir();
    const tita = await screen.findByRole('region', { name: 'Tita' });
    expect(await within(tita).findByText(/Ainda não sincronizado/)).toBeInTheDocument();

    await user.click(within(tita).getByRole('button', { name: 'Sincronizar com a Tita' }));
    const previa = await within(tita).findByRole('group', { name: 'Confirmar a sincronização' });
    expect(previa).toHaveTextContent('A Tita mandou 1.217 favorecidos.');
    expect(previa).toHaveTextContent('1.032 entram como rascunho, sem carteira');
    expect(pedidos).toEqual([{ simular: true }]);

    await user.click(within(previa).getByRole('button', { name: 'Confirmar a sincronização' }));
    expect(
      await within(tita).findByText('Sincronizado: 1.032 novos na lista.'),
    ).toBeInTheDocument();
    expect(pedidos).toEqual([{ simular: true }, { simular: false }]);
    expect(
      await screen.findByText('Alex Fictício Exemplo', { selector: 'li *' }),
    ).toBeInTheDocument();
    expect(itensDa('Assistidos cadastrados')).toContain(
      'UNAAlex Fictício ExemploRascunhoSem planoEscolha a carteira e o gêneroEditar',
    );
  });

  it('mostra as pendências e liga a unidade nova da Tita a uma daqui', async () => {
    server.use(
      http.get(`${env.SUPABASE_URL}/rest/v1/pendencias_da_tita`, () =>
        HttpResponse.json(PENDENCIAS),
      ),
    );
    const escritas = tabelaEmMemoria('unidades_da_tita', [], 'id');
    const { user } = abrir();

    const lista = await screen.findByRole('list', { name: 'Pendências da Tita' });
    expect(lista).toHaveTextContent(
      'A unidade “INSTITUTO DO AUTISMO - NOVA” da Tita não está ligada a nenhuma daqui (3 favorecidos).',
    );
    expect(lista).toHaveTextContent('Alex Fictício Exemplo: sexo “Outros” na Tita.');

    await user.selectOptions(within(lista).getByLabelText('Unidade daqui'), 'Unidade Fictícia');
    await user.click(within(lista).getByRole('button', { name: 'Ligar' }));
    expect(await within(lista).findByText(/Ligada\. Sincronize de novo/)).toBeInTheDocument();
    expect(escritas).toEqual([
      {
        metodo: 'POST',
        corpo: { nome_na_tita: 'INSTITUTO DO AUTISMO - NOVA', unidade_id: 1 },
        perfil: 'cadastro',
      },
    ]);
  });
});
