import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LimiteDaRota } from '@/components/ErrorBoundary';
import { renderWithProviders } from '@/testing/renderWithProviders';

let deveFalhar = true;

function TelaQueQuebra() {
  if (deveFalhar) throw new Error('falha de teste');
  return <p>Tela montada</p>;
}

describe('LimiteDaRota', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    deveFalhar = true;
  });

  it('troca a tela quebrada pelo card de erro e tenta de novo', async () => {
    // O React e o logger escrevem o erro no console: silenciados só neste teste.
    const consoleDeErro = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { user } = renderWithProviders(
      <LimiteDaRota>
        <TelaQueQuebra />
      </LimiteDaRota>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Esta tela não abriu');
    expect(consoleDeErro).toHaveBeenCalledWith(expect.stringContaining('"nome":"Error"'));

    deveFalhar = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(screen.getByText('Tela montada')).toBeInTheDocument();
  });
});
