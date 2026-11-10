import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrar } from './apoio/supabaseFicticio';
import { expect, test } from './apoio/teste';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

/** O menu na tela: fixo a partir de 1200 px; abaixo disso, a gaveta aberta pelo topo. */
async function abrirMenu(page: Page) {
  const menuFixo = (page.viewportSize()?.width ?? 0) >= 1200;
  if (!menuFixo) await page.getByRole('button', { name: 'Abrir menu' }).click();
  return page.getByRole('navigation', { name: 'Principal' });
}

async function irPeloMenu(page: Page, item: string) {
  const menu = await abrirMenu(page);
  await menu.getByRole('link', { name: item }).click();
}

/** Espera a gaveta parar de animar: o axe mediria o contraste no meio da transição. */
async function esperarAGaveta(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('[data-slot^="sheet-"]')]
        .flatMap((elemento) => elemento.getAnimations())
        .map(async (animacao) => animacao.finished),
    ),
  );
}

test.describe('Cadastros', () => {
  test('a coordenação geral cadastra e desativa uma unidade', async ({ page }) => {
    await entrar(page, 'coordenacao_geral');
    await irPeloMenu(page, 'Cadastros');

    await expect(page).toHaveURL(/\/cadastros\/unidades$/);
    const lista = page.getByRole('list', { name: 'Unidades cadastradas' });
    await expect(lista.getByRole('listitem')).toHaveCount(2);

    await page.getByRole('button', { name: 'Nova unidade' }).click();
    const gaveta = page.getByRole('dialog', { name: 'Nova unidade' });
    await gaveta.getByLabel('Sigla').fill('unc');
    await gaveta.getByLabel('Nome').fill('Terceira Unidade Fictícia');
    // A transição de entrada pode nem ter começado quando as animações são lidas: espera a opacidade.
    await expect(gaveta).toHaveCSS('opacity', '1');
    await esperarAGaveta(page);
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
    await gaveta.getByRole('button', { name: 'Cadastrar unidade' }).click();

    await expect(page.getByText('Unidade UNC cadastrada.')).toBeVisible();
    await expect(gaveta).toBeHidden();
    await expect(lista.getByRole('listitem')).toHaveCount(3);

    await page.getByRole('button', { name: 'Editar Outra Unidade Fictícia' }).click();
    const edicao = page.getByRole('dialog', { name: 'Editar UNB' });
    await edicao.getByRole('checkbox', { name: /Unidade ativa/ }).uncheck();
    await edicao.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(lista.getByRole('listitem').last()).toContainText('Desativada');
    // O axe mede depois que a gaveta termina de sair, não no meio da transição de saída.
    await expect(edicao).toBeHidden();
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  });

  test('plano repetido é recusado com o motivo', async ({ page }) => {
    await entrar(page, 'coordenacao_geral');
    await page.goto('/cadastros/planos');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planos de saúde');
    await page.getByRole('button', { name: 'Novo plano' }).click();
    const gaveta = page.getByRole('dialog', { name: 'Novo plano' });
    await gaveta.getByLabel('Nome do plano').fill('Plano Fictício');
    await gaveta.getByRole('button', { name: 'Cadastrar plano' }).click();
    await expect(gaveta.getByRole('alert')).toHaveText('Já existe um plano com este nome.');
  });

  test('a coordenação geral cadastra uma pessoa com papel e CRP', async ({ page }) => {
    await entrar(page, 'coordenacao_geral');
    await page.goto('/cadastros/unidades');
    await page.getByRole('link', { name: 'Pessoas' }).click();

    await expect(page).toHaveURL(/\/cadastros\/pessoas$/);
    const lista = page.getByRole('list', { name: 'Pessoas cadastradas' });
    await expect(lista.getByRole('listitem')).toHaveCount(4);
    await expect(lista.getByRole('listitem').filter({ hasText: 'Você' })).toContainText(
      'Gabriela Fictícia Geral',
    );

    await page.getByRole('button', { name: 'Nova pessoa' }).click();
    const gaveta = page.getByRole('dialog', { name: 'Nova pessoa' });
    await gaveta.getByLabel('Nome').fill('Dora Fictícia Nova');
    await gaveta.getByLabel('E-mail').fill('dora.demo@evolucao-aba.test');
    await gaveta.getByRole('radio', { name: 'Coordenação de unidade' }).check();
    await gaveta.getByLabel('CRP (opcional)').fill('06/99999');
    await expect(gaveta).toHaveCSS('opacity', '1');
    await esperarAGaveta(page);
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
    await gaveta.getByRole('button', { name: 'Cadastrar pessoa' }).click();

    await expect(page.getByText('Cadastro de Dora Fictícia Nova criado.')).toBeVisible();
    await expect(gaveta).toBeHidden();
    await expect(
      lista.getByRole('listitem').filter({ hasText: 'Dora Fictícia Nova' }),
    ).toContainText('Sem conta');
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  });

  test('o coordenador não tem Cadastros no menu nem entra pelo endereço', async ({ page }) => {
    await entrar(page);
    const menu = await abrirMenu(page);
    await expect(menu.getByRole('link', { name: 'Evoluções' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Cadastros' })).toHaveCount(0);

    await page.goto('/cadastros/unidades');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Esta tela não é do seu perfil',
    );
  });
});
