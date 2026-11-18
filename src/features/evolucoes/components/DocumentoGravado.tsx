import { X } from 'lucide-react';

import { Seletor } from '@/components/Seletor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Documento } from '@/features/evolucoes/api/documentos.api';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import {
  avisoDaData,
  detalheDoDocumento,
  ItemDoDocumento,
} from '@/features/evolucoes/components/ItemDoDocumento';
import type { OutrosDocumentos as Estado } from '@/features/evolucoes/routes/useOutrosDocumentos';
import { plural } from '@/utils/textos';
import { TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from '@dominio/documentos.ts';
import { hojeNaClinica } from '@dominio/mes.ts';

/** Tipo e data editáveis, e tirar da lista. */
function AcoesDoDocumento({
  documento,
  estado,
}: Readonly<{ documento: Documento; estado: Estado }>) {
  return (
    <>
      <Seletor
        aria-label={`Tipo de ${documento.arquivo}`}
        className="sm:w-52"
        value={documento.tipo}
        disabled={estado.ocupado}
        onChange={(evento) => {
          estado.mudar(documento.id, { tipo: evento.target.value as TipoDeDocumento });
        }}
      >
        {Object.entries(TIPOS_DE_DOCUMENTO).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Seletor>
      <Input
        // A chave refaz o campo quando a data gravada muda; o máximo evita a data no futuro.
        key={documento.data ?? ''}
        type="date"
        max={hojeNaClinica(new Date())}
        aria-label={`Data de ${documento.arquivo}`}
        className="sm:w-44"
        defaultValue={documento.data ?? ''}
        disabled={estado.ocupado}
        onBlur={(evento) => {
          const nova = evento.target.value === '' ? null : evento.target.value;
          if (nova !== documento.data) estado.mudar(documento.id, { data_documento: nova });
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Tirar ${documento.arquivo} da lista`}
        disabled={estado.ocupado}
        onClick={() => {
          estado.mudar(documento.id, { ativo: false });
        }}
      >
        <X aria-hidden="true" />
      </Button>
    </>
  );
}

/** Um documento gravado: o aviso da data, de onde veio o nome e, para quem pode, as ações. */
export function DocumentoGravado({
  documento,
  evolucao,
  estado,
  podeMudar,
}: Readonly<{ documento: Documento; evolucao: Evolucao; estado: Estado; podeMudar: boolean }>) {
  const data = avisoDaData(documento.data, evolucao.mesRef);
  const nome =
    documento.trocas > 0
      ? `Nome trocado em ${plural(documento.trocas, 'trecho', 'trechos')}.`
      : 'Confirmado como do assistido.';
  return (
    <ItemDoDocumento
      arquivo={documento.arquivo}
      detalhe={detalheDoDocumento(documento.data, documento.paginas)}
      tom={data.tom}
      aviso={`${data.texto} ${nome}`}
      texto={documento.texto}
      acoes={
        podeMudar ? (
          <AcoesDoDocumento documento={documento} estado={estado} />
        ) : (
          <span className="text-sm font-semibold text-texto-2">
            {TIPOS_DE_DOCUMENTO[documento.tipo]}
          </span>
        )
      }
    />
  );
}
