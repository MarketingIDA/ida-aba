import { useState } from 'react';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormularioDaParte } from '@/features/evolucoes/components/FormularioDaParte';
import { ContadorDeLinhas } from '@/features/evolucoes/components/Contadores';
import {
  linhasDoTexto,
  MAXIMO_DO_TRECHO,
  type Trecho,
  type Trechos,
  TRECHOS,
  TRECHOS_VAZIOS,
} from '@dominio/evolucao.ts';

/** Rótulo e dica de cada trecho, na ordem do manual. */
const ROTULOS: Record<Trecho, { rotulo: string; dica: string }> = {
  abertura: {
    rotulo: 'Abertura',
    dica: 'Como foi a participação no mês, a frequência, a adaptação.',
  },
  programas: {
    rotulo: 'Programas trabalhados',
    dica: 'Os programas trabalhados e como respondeu: com ajuda, com dica, de forma independente.',
  },
  comportamentos: {
    rotulo: 'Comportamentos e manejo',
    dica: 'Os comportamentos que apareceram e o que a equipe fez.',
  },
  recursos: {
    rotulo: 'Recursos e reforçadores',
    dica: 'Os itens e as atividades que funcionaram como reforçadores.',
  },
  fechamento: { rotulo: 'Fechamento', dica: 'O resumo do mês e o foco do próximo.' },
};

/** Parte 2 na leitura: os trechos preenchidos, cada um com o seu rótulo. */
export function TextoDaEvolucao({ trechos }: Readonly<{ trechos: Trechos | null }>) {
  const preenchidos = TRECHOS.filter((t) => (trechos?.[t] ?? '').trim() !== '');
  if (trechos === null || preenchidos.length === 0) {
    return <p className="text-sm text-apagado">O texto ainda não foi escrito.</p>;
  }
  return (
    <div className="flex flex-col gap-3.5">
      {preenchidos.map((t) => (
        <div key={t} className="flex flex-col gap-1">
          <h3 className="rotulo text-azul">{ROTULOS[t].rotulo}</h3>
          <p className="max-w-[75ch] text-sm leading-relaxed whitespace-pre-line text-texto">
            {trechos[t].trim()}
          </p>
        </div>
      ))}
    </div>
  );
}

interface PropsDaEdicao {
  inicial: Trechos | null;
  salvando: boolean;
  erro: string | null;
  aoSalvar: (trechos: Trechos) => void;
  aoCancelar: () => void;
}

/** Parte 2 na edição: um campo por trecho e as linhas contadas enquanto escreve (E10). */
export function EdicaoDoTexto({
  inicial,
  salvando,
  erro,
  aoSalvar,
  aoCancelar,
}: Readonly<PropsDaEdicao>) {
  const [trechos, setTrechos] = useState<Trechos>(inicial ?? TRECHOS_VAZIOS);
  const salvar = () => {
    aoSalvar(Object.fromEntries(TRECHOS.map((t) => [t, trechos[t].trim()])) as Trechos);
  };
  return (
    <FormularioDaParte
      rotulo="Salvar o texto"
      salvando={salvando}
      erro={erro}
      aoSalvar={salvar}
      aoCancelar={aoCancelar}
      contador={<ContadorDeLinhas linhas={linhasDoTexto(trechos)} />}
    >
      {TRECHOS.map((t) => (
        <div key={t} className="flex flex-col gap-1.5">
          <Label htmlFor={`trecho-${t}`}>{ROTULOS[t].rotulo}</Label>
          <Textarea
            id={`trecho-${t}`}
            aria-describedby={`trecho-${t}-dica`}
            rows={t === 'programas' ? 6 : 3}
            maxLength={MAXIMO_DO_TRECHO}
            value={trechos[t]}
            onChange={(evento) => {
              setTrechos({ ...trechos, [t]: evento.target.value });
            }}
          />
          <p id={`trecho-${t}-dica`} className="text-xs font-semibold text-apagado">
            {ROTULOS[t].dica}
          </p>
        </div>
      ))}
    </FormularioDaParte>
  );
}
