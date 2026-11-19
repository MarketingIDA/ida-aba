import type { Evolucao, NumeroDaParte, Versao } from '@/features/evolucoes/api/evolucao.api';
import { ContadorDeLinhas, ContadorDeMetas } from '@/features/evolucoes/components/Contadores';
import { DicaParaAIA } from '@/features/evolucoes/components/DicaParaAIA';
import { Identificacao } from '@/features/evolucoes/components/Identificacao';
import { EdicaoDasMetas, MetasDaParte } from '@/features/evolucoes/components/MetasDaParte';
import { ParteDaEvolucao } from '@/features/evolucoes/components/ParteDaEvolucao';
import { TextoComTermos } from '@/features/evolucoes/components/TermosNoTexto';
import { EdicaoDoTexto } from '@/features/evolucoes/components/TextoDaEvolucao';
import {
  avisoDaParte,
  linhasDa,
  NUMEROS,
  pendenciaDaParte,
} from '@/features/evolucoes/conferencia';
import type { EdicaoDaEvolucao } from '@/features/evolucoes/routes/useEdicaoDaEvolucao';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucao: Evolucao;
  edicao: EdicaoDaEvolucao;
  /** As metas do cadastro já alcançadas ou em manutenção (E12). */
  jaAlcancadas: readonly string[];
}

function versaoDa(evolucao: Evolucao, numero: NumeroDaParte): Versao<unknown> | null {
  if (numero === 2) return evolucao.texto;
  if (numero === 3) return evolucao.metasAlcancadas;
  return numero === 4 ? evolucao.metasDoMes : null;
}

/** De onde veio o que está na parte: o cadastro, ou quem escreveu a versão atual e quando. */
function origemDa(evolucao: Evolucao, numero: NumeroDaParte): string {
  if (numero === 1) return 'Do cadastro do assistido e da carteira';
  const versao = versaoDa(evolucao, numero);
  if (versao === null) return 'Ainda não escrita';
  const quem = versao.autor === 'ia' ? 'pela IA' : `por ${versao.criadoPor ?? 'coordenação'}`;
  return `Escrita ${quem} em ${formatarDataHora(versao.criadoEm)}`;
}

const metasDa = (evolucao: Evolucao, numero: 3 | 4) =>
  (numero === 3 ? evolucao.metasAlcancadas : evolucao.metasDoMes)?.conteudo.metas ?? [];

function contadorDa(evolucao: Evolucao, numero: NumeroDaParte) {
  if (numero === 1) return null;
  if (numero === 2) return <ContadorDeLinhas linhas={linhasDa(evolucao)} />;
  return <ContadorDeMetas metas={metasDa(evolucao, numero).length} doMes={numero === 4} />;
}

/** Só o coordenador da carteira muda a evolução, e só em conferência. */
const podeMudar = (evolucao: Evolucao) =>
  evolucao.editavel && evolucao.situacao === 'em_conferencia';

/** A dica para a IA cabe a quem coordena a carteira, e só na parte que tem texto da IA (E21). */
const cabeDica = (evolucao: Evolucao, numero: NumeroDaParte) =>
  evolucao.editavel && evolucao.partesDaIA.includes(numero);

/** Parte 2 na leitura: o texto, os termos inadequados (E10) e a dica para a IA (E21). */
function LeituraDoTexto({ evolucao, edicao }: Readonly<Omit<Props, 'jaAlcancadas'>>) {
  return (
    <TextoComTermos
      trechos={evolucao.texto?.conteudo ?? null}
      podeTrocar={podeMudar(evolucao) && edicao.editando === null}
      ocupado={edicao.ocupado}
      aoTrocar={(conteudo) => {
        edicao.trocar({ numero: 2, conteudo });
      }}
      depoisDoTrecho={
        cabeDica(evolucao, 2)
          ? (trecho) => <DicaParaAIA evolucao={evolucao} campo={trecho} />
          : undefined
      }
    />
  );
}

/** Partes 3 e 4 na leitura: as metas e a dica para a IA (E21). */
function LeituraDasMetas({ evolucao, numero }: Readonly<{ evolucao: Evolucao; numero: 3 | 4 }>) {
  return (
    <div className="flex flex-col gap-3">
      <MetasDaParte metas={metasDa(evolucao, numero)} doMes={numero === 4} />
      {cabeDica(evolucao, numero) && (
        <DicaParaAIA
          evolucao={evolucao}
          campo={numero === 3 ? 'metas_alcancadas' : 'metas_do_mes'}
        />
      )}
    </div>
  );
}

/** O conteúdo da parte, na leitura ou na edição. */
function CorpoDaParte({
  evolucao,
  edicao,
  numero,
}: Readonly<Omit<Props, 'jaAlcancadas'> & { numero: NumeroDaParte }>) {
  if (numero === 1) return <Identificacao evolucao={evolucao} />;
  const comum = {
    salvando: edicao.salvando,
    erro: edicao.erroDaEdicao,
    aoCancelar: edicao.cancelar,
  };
  if (numero === 2) {
    if (edicao.editando !== 2) return <LeituraDoTexto evolucao={evolucao} edicao={edicao} />;
    return (
      <EdicaoDoTexto
        inicial={evolucao.texto?.conteudo ?? null}
        aoSalvar={(conteudo) => {
          edicao.salvar({ numero: 2, conteudo });
        }}
        {...comum}
      />
    );
  }
  if (edicao.editando !== numero) return <LeituraDasMetas evolucao={evolucao} numero={numero} />;
  return (
    <EdicaoDasMetas
      id={`metas-${String(numero)}`}
      inicial={metasDa(evolucao, numero)}
      doMes={numero === 4}
      assistidoId={numero === 4 ? evolucao.assistidoId : null}
      aoSalvar={(novas) => {
        edicao.salvar({ numero, conteudo: { metas: novas } });
      }}
      {...comum}
    />
  );
}

/** As 4 partes, cada uma com a conferência e, nas partes 2 a 4, a edição. */
export function PartesDaEvolucao({ evolucao, edicao, jaAlcancadas }: Readonly<Props>) {
  return NUMEROS.map((numero) => {
    const parte = evolucao.partes.find((p) => p.numero === numero);
    if (parte === undefined) return null;
    const editando = edicao.editando === numero;
    return (
      <ParteDaEvolucao
        key={numero}
        parte={parte}
        origem={origemDa(evolucao, numero)}
        contador={editando ? null : contadorDa(evolucao, numero)}
        pendencia={pendenciaDaParte(evolucao, numero, jaAlcancadas)}
        aviso={avisoDaParte(evolucao, numero)}
        podeMudar={podeMudar(evolucao)}
        editando={editando}
        aoEditar={
          numero === 1
            ? undefined
            : () => {
                edicao.editar(numero);
              }
        }
        aoConferir={(conferida) => {
          edicao.conferir(numero, conferida);
        }}
        ocupado={edicao.ocupado || (edicao.editando !== null && !editando)}
      >
        <CorpoDaParte evolucao={evolucao} edicao={edicao} numero={numero} />
      </ParteDaEvolucao>
    );
  });
}
