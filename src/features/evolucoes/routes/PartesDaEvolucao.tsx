import type { Evolucao, NumeroDaParte, Versao } from '@/features/evolucoes/api/evolucao.api';
import { ContadorDeLinhas, ContadorDeMetas } from '@/features/evolucoes/components/Contadores';
import { Identificacao } from '@/features/evolucoes/components/Identificacao';
import { EdicaoDasMetas, MetasDaParte } from '@/features/evolucoes/components/MetasDaParte';
import { ParteDaEvolucao } from '@/features/evolucoes/components/ParteDaEvolucao';
import { EdicaoDoTexto, TextoDaEvolucao } from '@/features/evolucoes/components/TextoDaEvolucao';
import { linhasDa, NUMEROS, pendenciaDaParte } from '@/features/evolucoes/conferencia';
import type { EdicaoDaEvolucao } from '@/features/evolucoes/routes/useEdicaoDaEvolucao';
import { formatarDataHora } from '@/features/evolucoes/textos';

interface Props {
  evolucao: Evolucao;
  edicao: EdicaoDaEvolucao;
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

/** O conteúdo da parte, na leitura ou na edição. */
function CorpoDaParte({ evolucao, edicao, numero }: Readonly<Props & { numero: NumeroDaParte }>) {
  if (numero === 1) return <Identificacao evolucao={evolucao} />;
  const comum = {
    salvando: edicao.salvando,
    erro: edicao.erroDaEdicao,
    aoCancelar: edicao.cancelar,
  };
  if (numero === 2) {
    const trechos = evolucao.texto?.conteudo ?? null;
    if (edicao.editando !== 2) return <TextoDaEvolucao trechos={trechos} />;
    return (
      <EdicaoDoTexto
        inicial={trechos}
        aoSalvar={(conteudo) => {
          edicao.salvar({ numero: 2, conteudo });
        }}
        {...comum}
      />
    );
  }
  const metas = metasDa(evolucao, numero);
  if (edicao.editando !== numero) return <MetasDaParte metas={metas} doMes={numero === 4} />;
  return (
    <EdicaoDasMetas
      id={`metas-${String(numero)}`}
      inicial={metas}
      doMes={numero === 4}
      aoSalvar={(novas) => {
        edicao.salvar({ numero, conteudo: { metas: novas } });
      }}
      {...comum}
    />
  );
}

/** As 4 partes, cada uma com a conferência e, nas partes 2 a 4, a edição. */
export function PartesDaEvolucao({ evolucao, edicao }: Readonly<Props>) {
  const podeMudar = evolucao.editavel && evolucao.situacao === 'em_conferencia';
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
        pendencia={pendenciaDaParte(evolucao, numero)}
        podeMudar={podeMudar}
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
