import { expect, test } from './apoio/teste';

import { entrar } from './apoio/supabaseFicticio';

test.describe('Evoluções do mês', () => {
  test('o coordenador vê a carteira, filtra pelos cards e busca', async ({ page }) => {
    await entrar(page);
    const lista = page.getByRole('list', { name: 'Evoluções de novembro' });

    await expect(lista.getByRole('listitem')).toHaveCount(5);
    await expect(page.getByText('turno da manhã. Sessões de 01/10 a 31/10/2026')).toBeVisible();
    await expect(
      page.getByText('Faltam 3 evoluções para o arquivo do mês · prazo 10/11, faltam 6 dias'),
    ).toBeVisible();

    await page.getByRole('button', { name: /^Em conferência 1/ }).click();
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('Cecília Fictícia Rios');
    await expect(page).toHaveURL(/situacao=em_conferencia/);

    await page.getByRole('button', { name: /^Carteira 5/ }).click();
    await page.getByRole('searchbox', { name: 'Buscar assistido ou código' }).fill('davi');
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('UNA-2611-004-EV');
  });

  test('a coordenação geral recorta por unidade', async ({ page }) => {
    await entrar(page, 'coordenacao_geral');
    const lista = page.getByRole('list', { name: 'Evoluções de novembro' });

    await expect(lista.getByRole('listitem')).toHaveCount(6);
    await page.getByRole('combobox', { name: 'Unidade' }).selectOption('UNB');
    await expect(lista.getByRole('listitem')).toHaveCount(1);
    await expect(lista).toContainText('Fábio Fictício Lopes');
    await expect(page.getByRole('button', { name: /^Assistidos 1 no recorte/ })).toBeVisible();
  });

  test('contas médicas cai nos arquivos recebidos', async ({ page }) => {
    await entrar(page, 'contas_medicas');
    await expect(page).toHaveURL(/\/arquivos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Arquivos recebidos' })).toBeVisible();
  });
});
