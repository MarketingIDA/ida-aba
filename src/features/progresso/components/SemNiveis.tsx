import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChartLine } from 'lucide-react';
import { Link } from 'react-router';

import { EmptyState } from '@/components/EmptyState';
import { Button, buttonVariants } from '@/components/ui/button';
import type { Meta } from '@/features/cadastros/api/metas.api';
import { lerNiveis } from '@/features/evolucoes/api/niveis.api';
import type { PeriodoDaEvolucao } from '@/features/progresso/api/progresso.api';
import { progressoKeys } from '@/features/progresso/queries';
import { ehErroApp } from '@/lib/erroApp';

/** O título e a explicação conforme a última leitura dos níveis da evolução mais recente. */
function textos(leitura: string | null): { titulo: string; descricao: string } {
  if (leitura === 'falhou') {
    return {
      titulo: 'A IA não conseguiu ler os níveis de apoio',
      descricao: 'A leitura do nível de apoio das metas falhou. Peça a leitura de novo.',
    };
  }
  if (leitura === 'sem_metas') {
    return {
      titulo: 'Os níveis de apoio precisam ser lidos de novo',
      descricao:
        'Na última leitura o assistido não tinha meta com programa no cadastro, ou o período não tinha sessão. Com as metas no cadastro, peça a leitura de novo.',
    };
  }
  return {
    titulo: 'Os níveis de apoio ainda não foram lidos',
    descricao:
      'A IA lê, nas análises do PDF do Tita, o nível de apoio de cada meta do cadastro que tem programa.',
  };
}

/** Sem meta com programa no cadastro, não há o que a IA ler: o caminho é o cadastro de metas. */
function SemMetas({ assistidoId }: Readonly<{ assistidoId: number }>) {
  return (
    <EmptyState
      icone={ChartLine}
      titulo="O assistido não tem meta com programa"
      descricao="O gráfico acompanha as metas do cadastro que têm programa. Cadastre as metas do assistido e depois peça a leitura dos níveis de apoio."
      acao={
        <Link to={`/metas/${String(assistidoId)}`} className={buttonVariants()}>
          Abrir o cadastro de metas
        </Link>
      }
    />
  );
}

interface Props {
  assistidoId: number;
  /** A evolução mais recente do assistido, ainda sem os níveis lidos. */
  ultima: PeriodoDaEvolucao;
  metas: readonly Meta[];
  /** Só quem coordena a carteira cadastra metas e pede a leitura. */
  podeLer: boolean;
}

/**
 * Há evolução, mas nenhum mês com os níveis lidos (E27). Sem meta com programa, o caminho é o
 * cadastro de metas; com meta, a leitura é pedida daqui mesmo, sem reabrir a evolução.
 */
export function SemNiveis({ assistidoId, ultima, metas, podeLer }: Readonly<Props>) {
  const cliente = useQueryClient();
  const ler = useMutation({
    mutationFn: () => lerNiveis(ultima.evolucaoId),
    onSettled: () =>
      cliente.invalidateQueries({ queryKey: progressoKeys.doAssistido(assistidoId) }),
  });
  const comPrograma = metas.some(
    (meta) => (meta.programa ?? '').trim() !== '' && meta.situacao !== 'suspensa',
  );
  if (!comPrograma) return <SemMetas assistidoId={assistidoId} />;
  const { titulo, descricao } = textos(ultima.leitura);
  return (
    <EmptyState
      icone={ChartLine}
      titulo={titulo}
      descricao={descricao}
      acao={
        <div className="flex flex-wrap items-center gap-3">
          {podeLer && (
            <Button
              disabled={ler.isPending}
              onClick={() => {
                ler.mutate();
              }}
            >
              {ler.isPending ? 'Lendo os níveis…' : 'Ler os níveis agora'}
            </Button>
          )}
          <Link
            to={`/evolucoes/${ultima.evolucaoId}`}
            className={buttonVariants({ variant: 'secondary' })}
          >
            Abrir a evolução mais recente
          </Link>
          {ler.isError && (
            <p role="alert" className="w-full text-sm font-bold text-bloq-text">
              {ehErroApp(ler.error)
                ? ler.error.message
                : 'Não foi possível ler os níveis agora. Tente de novo.'}
            </p>
          )}
        </div>
      }
    />
  );
}
