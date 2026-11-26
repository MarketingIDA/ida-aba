import { type ReactNode, useId } from 'react';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { DocumentoGravado } from '@/features/evolucoes/components/DocumentoGravado';
import { EscolhaDosDocumentos } from '@/features/evolucoes/components/EscolhaDosDocumentos';
import {
  detalheDoDocumento,
  ItemDoDocumento,
} from '@/features/evolucoes/components/ItemDoDocumento';
import type { OutrosDocumentos as Estado } from '@/features/evolucoes/routes/useOutrosDocumentos';
import type { DocumentoConferido } from '@dominio/documentos.ts';

/** O que o coordenador confere: o nome que falta no texto ou, na foto, o texto que o OCR leu. */
function avisoDoPendente(pendente: DocumentoConferido, assistido: string): string {
  if (!pendente.imagem) {
    return `O nome de ${assistido} não aparece no texto. Se o documento é de outro assistido, tire da lista: ele não vai para a IA.`;
  }
  return `Texto lido da foto: confira abaixo se o documento é de ${assistido} e se nenhum nome ficou no texto (a leitura da foto pode errar o nome). Se ficou, tire da lista e junte em PDF ou Word.`;
}

/**
 * Um documento sem o nome do assistido, ou lido de foto: espera a confirmação ou sai da lista
 * (E25). Na foto, o texto lido já aparece aberto.
 */
function DocumentoPendente({
  pendente,
  evolucao,
  estado,
}: Readonly<{ pendente: DocumentoConferido; evolucao: Evolucao; estado: Estado }>) {
  return (
    <ItemDoDocumento
      arquivo={pendente.arquivo}
      detalhe={detalheDoDocumento(pendente.dataSugerida, pendente.arquivo, pendente.paginas)}
      tom="bloqueio"
      aviso={avisoDoPendente(pendente, evolucao.assistido)}
      texto={pendente.texto}
      textoAberto={pendente.imagem}
      acoes={
        <>
          <Button
            size="lg"
            disabled={estado.ocupado}
            onClick={() => {
              estado.confirmar(pendente);
            }}
          >
            {pendente.imagem ? 'Conferi: é de' : 'É de'} {evolucao.assistido.split(' ', 1).join('')}
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

/**
 * Os outros documentos da evolução (E25): relatório da escola, de outra terapia, registro da
 * família, avaliação, PEI. A IA lê todos junto com as análises do Tita. O arquivo é lido neste
 * computador e não é guardado; o nome do assistido sai do texto antes de gravar (E05).
 */
export function OutrosDocumentos({
  evolucao,
  estado,
  escritaAMao = false,
  children,
}: Readonly<{
  evolucao: Evolucao;
  estado: Estado;
  /** Na escrita à mão, antes do texto: o arquivo é a fonte da IA, sem o PDF do Tita (E26). */
  escritaAMao?: boolean;
  /** Abaixo da escolha dos arquivos: o pedido à IA. */
  children?: ReactNode;
}>) {
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
          {escritaAMao ? 'Carregar arquivo' : 'Outros documentos'}{' '}
          <span className="text-sm font-bold text-apagado">opcional</span>
        </h2>
        <p className="max-w-[72ch] text-sm text-texto-2">
          {escritaAMao
            ? 'Relatório, registro ou anotação do mês. A IA lê o arquivo e preenche os campos abaixo para você conferir.'
            : 'Relatório da escola, de outra terapia, registro da família, avaliação, PEI. A IA lê todos junto com as análises do Tita.'}{' '}
          O arquivo é lido neste computador e não é guardado; o nome do assistido sai do texto antes
          de gravar.
        </p>
      </div>
      {!vazio && <ListaDeDocumentos evolucao={evolucao} estado={estado} podeMudar={podeMudar} />}
      {estado.erros.map((erro) => (
        <p key={erro} role="alert" className="text-sm font-bold text-bloq-text">
          {erro}
        </p>
      ))}
      {podeMudar && <EscolhaDosDocumentos estado={estado} />}
      {children}
    </section>
  );
}
