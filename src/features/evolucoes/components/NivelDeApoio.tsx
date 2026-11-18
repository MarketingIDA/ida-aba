import { Button } from '@/components/ui/button';
import type { LeituraDeNivel } from '@/features/evolucoes/api/niveis.api';
import type { useImportacaoDoTita } from '@/features/evolucoes/routes/useImportacaoDoTita';

type Niveis = ReturnType<typeof useImportacaoDoTita>['niveis'];

const plural = (n: number, um: string, varios: string) => `${String(n)} ${n === 1 ? um : varios}`;

/** A frase da situação da leitura e o rótulo do botão que pede a leitura de novo. */
function situacao(leitura: LeituraDeNivel | null): { texto: string; botao: string } {
  if (leitura === null) {
    return { texto: 'O nível de apoio das metas ainda não foi lido.', botao: 'Ler os níveis' };
  }
  if (leitura.situacao === 'falhou') {
    return { texto: 'A IA não conseguiu ler o nível de apoio das metas.', botao: 'Ler de novo' };
  }
  if (leitura.situacao === 'sem_metas') {
    return {
      texto:
        'Sem nível de apoio: o assistido não tem meta com programa no cadastro, ou o mês não tem sessão.',
      botao: 'Ler de novo',
    };
  }
  if (leitura.dias === 0) {
    return {
      texto: 'Nível de apoio lido: as análises não dizem o nível de nenhuma meta.',
      botao: 'Ler de novo',
    };
  }
  return {
    texto: `Nível de apoio lido: ${plural(leitura.dias, 'dia', 'dias')} com nível, em ${plural(leitura.metas, 'meta', 'metas')}.`,
    botao: 'Ler de novo',
  };
}

/**
 * A situação da leitura do nível de apoio (E27), que a IA faz em segundo plano logo depois da
 * importação. Quem pode importar também pode pedir a leitura de novo.
 */
export function NivelDeApoio({ niveis, podeLer }: Readonly<{ niveis: Niveis; podeLer: boolean }>) {
  if (niveis.carregando) return null;
  if (niveis.lendo) {
    return (
      <p role="status" className="text-sm text-texto-2">
        Lendo o nível de apoio das metas…
      </p>
    );
  }
  const { texto, botao } = situacao(niveis.leitura);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-sm text-texto-2">
        {texto}
      </p>
      {niveis.erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {niveis.erro}
        </p>
      )}
      {podeLer && (
        <Button size="sm" variant="ghost" onClick={niveis.ler}>
          {botao}
        </Button>
      )}
    </div>
  );
}
