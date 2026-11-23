import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import type { Importacao } from '@/features/evolucoes/api/importacao.api';
import { CalendarioDoTita } from '@/features/evolucoes/components/CalendarioDoTita';
import { AnalisesDoTita } from '@/features/evolucoes/components/LeituraDoTita';
import { Nota } from '@/features/evolucoes/components/painel/Pendencia';
import { conferirLeitura } from '@/features/evolucoes/tita/leitura';

/**
 * A aba Fontes: de onde vem a evolução. Com o PDF do Tita, o calendário dos dias analisados (E19,
 * E20) e as análises do atendimento; escrita à mão, o recado de que não há evoluções diárias. As
 * fontes de cada frase seguem em cada parte.
 */
export function FontesDoPainel({
  evolucao,
  importacao,
}: Readonly<{ evolucao: Evolucao; importacao: Importacao | null }>) {
  if (importacao !== null) {
    const { noPeriodo } = conferirLeitura(importacao, evolucao.assistido, evolucao.mesRef);
    return (
      <div className="flex flex-col gap-2.5 rounded-[18px] border border-borda bg-superficie p-4 shadow-sm">
        <CalendarioDoTita evolucao={evolucao} importacao={importacao} />
        <AnalisesDoTita analises={noPeriodo} />
        <p className="text-caption font-semibold text-apagado">
          De que sessão saiu cada frase: em &quot;Fontes&quot;, dentro de cada parte.
        </p>
      </div>
    );
  }
  if (evolucao.origem === 'manual') {
    return (
      <Nota>
        Escrita à mão, sem o PDF do Tita: não há evoluções diárias nem dias analisados (E20, E26). O
        que foi escrito antes de a IA aprimorar fica em &quot;Fontes&quot;, na parte 2.
      </Nota>
    );
  }
  return (
    <Nota>
      Ainda sem o PDF do Tita. Depois da importação, aqui ficam o calendário dos dias analisados e
      as análises do atendimento.
    </Nota>
  );
}
