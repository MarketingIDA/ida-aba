import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { type Lacuna, useIgnorarLacuna } from '@/features/evolucoes/api/lacunas.api';
import {
  fraseDeNaoTrabalhado,
  LacunasDaEvolucao,
} from '@/features/evolucoes/components/LacunasDaEvolucao';
import type { EdicaoDaEvolucao } from '@/features/evolucoes/routes/useEdicaoDaEvolucao';
import { TRECHOS_VAZIOS } from '@dominio/evolucao.ts';
import { ehErroApp } from '@/lib/erroApp';

const mensagemDoErro = (erro: unknown) =>
  ehErroApp(erro) ? erro.message : 'Não foi possível ignorar a lacuna agora.';

interface Props {
  evolucao: Evolucao;
  edicao: EdicaoDaEvolucao;
  lacunas: readonly Lacuna[];
}

/**
 * As lacunas na parte 2 (E10), com as três saídas: a frase de que o programa não foi aplicado
 * entra no fim dos programas trabalhados; "Foi trabalhado" abre o texto; "Ignorar" fica registrado.
 */
export function Lacunas({ evolucao, edicao, lacunas }: Readonly<Props>) {
  const ignorar = useIgnorarLacuna(evolucao.id);
  const texto = evolucao.texto?.conteudo ?? TRECHOS_VAZIOS;
  const erro = ignorar.isError ? mensagemDoErro(ignorar.error) : null;
  return (
    <LacunasDaEvolucao
      lacunas={lacunas}
      podeResolver={
        evolucao.editavel && evolucao.situacao === 'em_conferencia' && edicao.editando === null
      }
      ocupado={edicao.ocupado || ignorar.isPending}
      erro={erro}
      aoNaoTrabalhado={(programa) => {
        const programas = `${texto.programas.trim()} ${fraseDeNaoTrabalhado(programa)}`.trim();
        edicao.trocar({ numero: 2, conteudo: { ...texto, programas } });
      }}
      aoTrabalhado={() => {
        edicao.editar(2);
      }}
      aoIgnorar={(programa) => {
        ignorar.mutate(programa);
      }}
    />
  );
}
