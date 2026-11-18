import { FileUp } from 'lucide-react';
import { useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import {
  AnalisesDoTita,
  AvisosDaLeitura,
  DadosDoFavorecido,
  textoDaFrequencia,
} from '@/features/evolucoes/components/LeituraDoTita';
import { NivelDeApoio } from '@/features/evolucoes/components/NivelDeApoio';
import { RascunhoDaIA } from '@/features/evolucoes/components/RascunhoDaIA';
import {
  type LeituraPendente,
  useImportacaoDoTita,
} from '@/features/evolucoes/routes/useImportacaoDoTita';
import { conferirLeitura } from '@/features/evolucoes/tita/leitura';
import { dataEHora } from '@/utils/textos';

type Tita = ReturnType<typeof useImportacaoDoTita>;

/** O botão que abre a escolha do arquivo; o `input` fica fora da tela, com rótulo para leitores. */
function EscolhaDoPdf({
  rotulo,
  lendo,
  aoEscolher,
}: Readonly<{ rotulo: string; lendo: boolean; aoEscolher: (arquivo: File) => void }>) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Button
        variant="secondary"
        size="lg"
        disabled={lendo}
        onClick={() => {
          entrada.current?.click();
        }}
      >
        <FileUp aria-hidden="true" />
        {lendo ? 'Lendo o PDF…' : rotulo}
      </Button>
      <input
        ref={entrada}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="PDF do Tita"
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => {
          const [arquivo] = evento.target.files ?? [];
          evento.target.value = '';
          if (arquivo !== undefined) aoEscolher(arquivo);
        }}
      />
    </div>
  );
}

/** O PDF lido, antes de gravar: o que o sistema leu, o que bloqueia e o que só alerta (E03). */
function LeituraParaConferir({
  pendente,
  tita,
}: Readonly<{ pendente: LeituraPendente; tita: Tita }>) {
  const { conferencia, leitura } = pendente;
  const bloqueada = conferencia.bloqueios.length > 0;
  return (
    <>
      <p className="text-sm font-bold text-marinho">O que o sistema leu em {pendente.arquivo}</p>
      <DadosDoFavorecido favorecido={leitura.favorecido} />
      <p className="text-sm font-semibold text-texto-2">
        {textoDaFrequencia(conferencia.noPeriodo)}
      </p>
      <AvisosDaLeitura bloqueios={conferencia.bloqueios} alertas={conferencia.alertas} />
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={bloqueada || tita.salvando} onClick={tita.confirmar}>
          {tita.salvando ? 'Gravando…' : 'Usar esta leitura'}
        </Button>
        <Button size="lg" variant="ghost" disabled={tita.salvando} onClick={tita.cancelar}>
          Cancelar
        </Button>
      </div>
    </>
  );
}

/** A importação gravada: de onde veio, a frequência, os alertas que seguem e as análises. */
function ImportacaoGravada({
  importacao,
  evolucao,
}: Readonly<{ importacao: Importacao; evolucao: Evolucao }>) {
  const conferencia = conferirLeitura(importacao, evolucao.assistido, evolucao.mesRef);
  return (
    <>
      <p className="text-sm text-texto-2">
        Importado de <b className="text-marinho">{importacao.arquivo}</b> em{' '}
        {dataEHora(importacao.importadoEm)}. {textoDaFrequencia(conferencia.noPeriodo)}.
      </p>
      <AvisosDaLeitura bloqueios={[]} alertas={conferencia.alertas} />
      <AnalisesDoTita analises={conferencia.noPeriodo} />
    </>
  );
}

/**
 * O PDF do Tita da evolução (E02): o coordenador importa o Relatório de Evoluções Diárias, confere
 * o que o sistema leu e consulta as análises do atendimento enquanto escreve. Quem só lê a
 * evolução vê a importação, se houver.
 */
export function ImportacaoDoTita({
  evolucao,
  bloqueioDoRascunho = null,
}: Readonly<{ evolucao: Evolucao; bloqueioDoRascunho?: string | null }>) {
  const tita = useImportacaoDoTita(evolucao);
  const titulo = useId();
  const podeImportar = evolucao.editavel && evolucao.situacao === 'em_conferencia';
  if (tita.carregando || (tita.importacao === null && !podeImportar)) return null;

  return (
    <section
      aria-labelledby={titulo}
      className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 shadow-md sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={titulo}>PDF do Tita</h2>
        <p className="max-w-[72ch] text-sm text-texto-2">
          Do Relatório de Evoluções Diárias entram só os Dados do Favorecido e a análise do
          atendimento de cada sessão. O PDF é lido neste computador e não é guardado.
        </p>
      </div>
      {tita.pendente !== null && <LeituraParaConferir pendente={tita.pendente} tita={tita} />}
      {tita.pendente === null && tita.importacao !== null && (
        <>
          <ImportacaoGravada importacao={tita.importacao} evolucao={evolucao} />
          <NivelDeApoio niveis={tita.niveis} podeLer={podeImportar} />
        </>
      )}
      {tita.erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {tita.erro}
        </p>
      )}
      {podeImportar && tita.pendente === null && tita.importacao !== null && (
        <RascunhoDaIA evolucao={evolucao} bloqueio={bloqueioDoRascunho} />
      )}
      {podeImportar && tita.pendente === null && (
        <EscolhaDoPdf
          rotulo={tita.importacao === null ? 'Importar o PDF do Tita' : 'Importar de novo'}
          lendo={tita.lendo}
          aoEscolher={tita.escolher}
        />
      )}
    </section>
  );
}
