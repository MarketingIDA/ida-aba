import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { entrar } from './apoio/supabaseFicticio';
import { expect, test } from './apoio/teste';

const MENU_FIXO = 1200;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag22aa'];

const menuFixo = (page: Page) => (page.viewportSize()?.width ?? 0) >= MENU_FIXO;

/** O menu na tela: fixo a partir de 1200 px; abaixo disso, a gaveta aberta pelo topo. */
async function abrirMenu(page: Page) {
  if (!menuFixo(page)) {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  }
  return page.getByRole('navigation', { name: 'Principal' });
}

/** Espera a gaveta terminar de abrir: o axe mediria o contraste no meio da transição. */
async function esperarAGaveta(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      [...document.querySelectorAll('[data-slot^="sheet-"]')]
        .flatMap((elemento) => elemento.getAnimations())
        .map(async (animacao) => animacao.finished),
    ),
  );
}

test.describe('shell do app', () => {
  test('senha errada fica no login com a mensagem genérica', async ({ page }) => {
    await page.goto('/login');
    await page.route('https://exemplo.supabase.co/auth/v1/token**', (rota) =>
      rota.fulfill({ status: 400, json: { code: 400, msg: 'Invalid login credentials' } }),
    );
    await page.getByLabel('E-mail').fill('alguem@evolucao-aba.test');
    await page.getByLabel('Senha').fill('outra-senha-qualquer');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
  });

  test('o coordenador entra nas Evoluções, com o item marcado no menu', async ({ page }) => {
    await entrar(page);

    await expect(page).toHaveURL(/\/evolucoes$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Evoluções nov/2026');
    const menu = await abrirMenu(page);
    await expect(menu.getByRole('link', { name: 'Evoluções' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('não rola na horizontal e não tem violação de acessibilidade', async ({ page }) => {
    await entrar(page);
    await expect(page.getByRole('list', { name: 'Evoluções de novembro' })).toBeVisible();

    const sobra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(sobra).toBeLessThanOrEqual(0);
    const tela = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(tela.violations).toEqual([]);

    await abrirMenu(page);
    await esperarAGaveta(page);
    const comMenu = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(comMenu.violations).toEqual([]);
  });

  test('Sair volta para o login', async ({ page }) => {
    await entrar(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await abrirMenu(page);
    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
