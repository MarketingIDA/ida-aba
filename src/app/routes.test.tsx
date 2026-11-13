import { screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { Rotas } from '@/app/routes';
import type { Papel } from '@/hooks/useUsuario';
import { violacoesDeAcessibilidade } from '@/testing/axe';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';

const como = (papel: Papel, rota = '/') =>
  renderWithProviders(<Rotas />, { rota, usuario: usuarioDemo({ papel }) });

describe('Rotas e AppLayout', () => {
  // As rotas são lazy: a primeira carga dos módulos no Vitest passa do tempo do findBy.
  beforeAll(async () => {
    await Promise.all([
      import('@/app/layouts/AppLayout'),
      import('@/features/evolucoes'),
      import('@/features/arquivo-do-mes'),
      import('@/features/auth/routes/PrimeiroAcessoPage'),
    ]);
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-04T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sem usuário, qualquer rota leva ao login', async () => {
    renderWithProviders(<Rotas />, { rota: '/evolucoes' });
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('o coordenador cai nas Evoluções, com o mês no menu e o próprio nome no rodapé', async () => {
    const { container } = como('coordenador');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Evoluções');
    const menu = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(menu).getByRole('link', { name: 'Evoluções' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Evolução do mês Novembro/ })).toHaveAttribute(
      'href',
      '/evolucoes',
    );
    expect(screen.getByText('Sessões de 01/10 a 31/10')).toBeInTheDocument();
    expect(screen.getByText('Arquivo do mês até 10/11')).toBeInTheDocument();
    expect(screen.getByText('Carla Fictícia Coordenadora')).toBeInTheDocument();
    expect(screen.getByText('Coordenação de unidade')).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Evoluções de novembro' });
    expect(await violacoesDeAcessibilidade(container)).toEqual([]);
  });

  it('contas médicas cai nos arquivos recebidos e não abre as evoluções', async () => {
    como('contas_medicas');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Arquivos recebidos nov/2026' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Evoluções' })).not.toBeInTheDocument();
  });

  it('um papel fora da tela vê o aviso, sem pedir os dados', async () => {
    como('contas_medicas', '/evolucoes');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta tela não é do seu perfil' }),
    ).toBeInTheDocument();
  });

  it('endereço desconhecido mostra a página não encontrada', async () => {
    como('coordenacao_geral', '/nao-existe');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/');
  });
});
