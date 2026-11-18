import { FileUp } from 'lucide-react';
import { useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { DocumentoGravado } from '@/features/evolucoes/components/DocumentoGravado';
import {
  detalheDoDocumento,
  ItemDoDocumento,
} from '@/features/evolucoes/components/ItemDoDocumento';
import { ACEITOS } from '@/features/evolucoes/documentos/lerDocumento';
import type { OutrosDocumentos as Estado } from '@/features/evolucoes/routes/useOutrosDocumentos';
import type { DocumentoConferido } from '@dominio/documentos.ts';

/** Um documento sem o nome do assistido: espera a confirmação ou sai da lista (E25). */
function DocumentoPendente({
  pendente,
  evolucao,
  estado,
}: Readonly<{ pendente: DocumentoConferido; evolucao: Evolucao; estado: Estado }>) {
  return (
    <ItemDoDocumento
      arquivo={pendente.arquivo}
      detalhe={detalheDoDocumento(pendente.dataSugerida, pendente.paginas)}
      tom="bloqueio"
      aviso={`O nome de ${evolucao.assistido} não aparece no texto. Se o documento é de outro assistido, tire da lista: ele não vai para a IA.`}
      texto={pendente.texto}
      acoes={
        <>
          <Button
            size="lg"
            disabled={estado.ocupado}
            onClick={() => {
              estado.confirmar(pendente);
            }}
          >
            É de {evolucao.assistido.split(' ', 1).join('')}
          </Button>
          <Button
            size="lg"
            variant="ghost"
            disabled={estado.ocupado}
            onClick={() => {
              estado.descartar(pendente);
            }}
          >
            Tirar da lista
          </Button>
        </>
      }
    />
  );
}

/** Os pendentes primeiro, porque bloqueiam o rascunho; depois os gravados. */
function ListaDeDocumentos({
  evolucao,
  estado,
  podeMudar,
}: Readonly<{ evolucao: Evolucao; estado: Estado; podeMudar: boolean }>) {
  return (
    <ul aria-label="Documentos da evolução" className="flex flex-col gap-2.5">
      {estado.pendentes.map((pendente) => (
        <DocumentoPendente
          key={`${pendente.arquivo}-${String(pendente.texto.length)}`}
          pendente={pendente}
          evolucao={evolucao}
          estado={estado}
        />
      ))}
      {estado.documentos.map((documento) => (
        <DocumentoGravado
          key={documento.id}
          documento={documento}
          evolucao={evolucao}
          estado={estado}
          podeMudar={podeMudar}
        />
      ))}
    </ul>
  );
}

/** O botão que abre a escolha dos arquivos; o `input` fica fora da tela, com rótulo para leitores. */
function EscolhaDosArquivos({ estado }: Readonly<{ estado: Estado }>) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="secondary"
        size="lg"
        className="w-fit"
        disabled={estado.ocupado}
        onClick={() => {
          entrada.current?.click();
        }}
      >
        <FileUp aria-hidden="true" />
        {estado.lendo ? 'Lendo os documentos…' : 'Juntar documentos'}
      </Button>
      <input
        ref={entrada}
        type="file"
        multiple
        accept={ACEITOS}
        aria-label="Outros documentos"
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => {
          const arquivos = [...(evento.target.files ?? [])];
          evento.target.value = '';
          if (arquivos.length > 0) estado.escolher(arquivos);
        }}
      />
      <p className="text-sm text-apagado">PDF ou Word (.docx), vários de uma vez.</p>
    </div>
  );
}

/**
 * Os outros documentos da evolução (E25): relatório da escola, de outra terapia, registro da
 * família, avaliação, PEI. A IA lê todos junto com as análises do Tita. O arquivo é lido neste
 * computador e não é guardado; o nome do assistido sai do texto antes de gravar (E05).
 */
export function OutrosDocumentos({
  evolucao,
  estado,
}: Readonly<{ evolucao: Evolucao; estado: Estado }>) {
  const titulo = useId();
  const podeMudar = evolucao.editavel && evolucao.situacao === 'em_conferencia';
  const vazio = estado.documentos.length === 0 && estado.pendentes.length === 0;
  if (estado.carregando || (vazio && !podeMudar)) return null;

  return (
    <section
      aria-labelledby={titulo}
      className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 shadow-md sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={titulo}>
          Outros documentos <span className="text-sm font-bold text-apagado">opcional</span>
        </h2>
        <p className="max-w-[72ch] text-sm text-texto-2">
          Relatório da escola, de outra terapia, registro da família, avaliação, PEI. A IA lê todos
          junto com as análises do Tita. O arquivo é lido neste computador e não é guardado; o nome
          do assistido sai do texto antes de gravar.
        </p>
      </div>
      {!vazio && <ListaDeDocumentos evolucao={evolucao} estado={estado} podeMudar={podeMudar} />}
      {estado.erros.map((erro) => (
        <p key={erro} role="alert" className="text-sm font-bold text-bloq-text">
          {erro}
        </p>
      ))}
      {podeMudar && <EscolhaDosArquivos estado={estado} />}
    </section>
  );
}
