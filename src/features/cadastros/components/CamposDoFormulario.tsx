import { type ComponentProps, type ReactNode, useState } from 'react';

import { Seletor } from '@/components/Seletor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ehErroApp } from '@/lib/erroApp';
import { cn } from '@/lib/utils';

const SEM_RESPOSTA = 'Não foi possível salvar agora. Tente de novo em instantes.';

interface PropsDoCampo extends ComponentProps<'input'> {
  id: string;
  rotulo: string;
  dica?: ReactNode;
  erro?: string | undefined;
}

type Rotulagem = Pick<PropsDoCampo, 'id' | 'rotulo' | 'dica' | 'erro'>;

/** O que o leitor de tela lê depois do rótulo: a dica e, se houver, o erro. */
function descritoresDe({ id, dica, erro }: Rotulagem) {
  const ids = [dica === undefined ? '' : `${id}-dica`, erro === undefined ? '' : `${id}-erro`];
  const juntos = ids.filter(Boolean).join(' ');
  return { 'aria-invalid': erro !== undefined, 'aria-describedby': juntos || undefined };
}

/** Rótulo em cima, o controle, a dica e o erro de validação embaixo. */
function Rotulado({
  id,
  rotulo,
  dica,
  erro,
  children,
}: Readonly<Rotulagem & { children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {dica !== undefined && (
        <p id={`${id}-dica`} className="text-xs font-semibold text-apagado">
          {dica}
        </p>
      )}
      {erro !== undefined && (
        <p id={`${id}-erro`} className="text-xs font-bold text-bloq-text">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Rótulo, campo, dica e o erro de validação, ligados por `aria-describedby`. */
export function CampoDeTexto({ id, rotulo, dica, erro, ...campo }: Readonly<PropsDoCampo>) {
  return (
    <Rotulado id={id} rotulo={rotulo} dica={dica} erro={erro}>
      <Input id={id} {...descritoresDe({ id, rotulo, dica, erro })} {...campo} />
    </Rotulado>
  );
}

interface PropsDaSelecao extends Omit<ComponentProps<'select'>, 'children' | 'id'>, Rotulagem {
  /** O texto da opção vazia, a que pede a escolha (ex.: "Escolha a unidade"). */
  vazio: string;
  opcoes: readonly { valor: string; rotulo: string }[];
}

/** Lista curta e fixa num `select` nativo, com rótulo, dica e erro como o campo de texto. */
export function CampoDeSelecao(props: Readonly<PropsDaSelecao>) {
  const { id, rotulo, dica, erro, vazio, opcoes, ...selecao } = props;
  return (
    <Rotulado id={id} rotulo={rotulo} dica={dica} erro={erro}>
      <Seletor id={id} {...descritoresDe({ id, rotulo, dica, erro })} {...selecao}>
        <option value="">{vazio}</option>
        {opcoes.map(({ valor, rotulo: texto }) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </Seletor>
    </Rotulado>
  );
}

interface PropsDaCaixa extends ComponentProps<'input'> {
  rotulo: string;
  dica: string;
}

/** Ativo ou desativado: a caixa inteira é o alvo do toque. */
export function CaixaDeAtivo({ rotulo, dica, className, ...caixa }: Readonly<PropsDaCaixa>) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border border-borda bg-superficie p-3 hover:border-borda-forte',
        className,
      )}
    >
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-azul" {...caixa} />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-bold text-marinho">{rotulo}</span>
        <span className="text-xs font-semibold text-apagado">{dica}</span>
      </span>
    </label>
  );
}

/** Ações da gaveta: a principal (que diz o que faz) e "Cancelar". */
export function RodapeDoFormulario({
  rotulo,
  enviando,
  erro,
  aoCancelar,
}: Readonly<{ rotulo: string; enviando: boolean; erro: string | null; aoCancelar: () => void }>) {
  return (
    <div className="mt-auto flex flex-col gap-3 border-t border-borda px-5 py-4">
      {erro !== null && (
        <p
          role="alert"
          className="rounded-md border border-l-[6px] border-bloq-border border-l-bloq bg-bloq-soft px-3 py-2 text-sm font-bold text-bloq-text"
        >
          {erro}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : rotulo}
        </Button>
      </div>
    </div>
  );
}

/** Chama o salvamento e guarda a mensagem do erro, já em português, para o rodapé. */
export function useEnvio<Valores>(aoSalvar: (valores: Valores) => Promise<unknown>) {
  const [erro, setErro] = useState<string | null>(null);
  async function enviar(valores: Valores) {
    setErro(null);
    try {
      await aoSalvar(valores);
    } catch (falha) {
      setErro(ehErroApp(falha) ? falha.message : SEM_RESPOSTA);
    }
  }
  return { erro, enviar };
}

/** Corpo rolável do formulário, entre o título da gaveta e o rodapé. */
export function CorpoDoFormulario({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">{children}</div>;
}

/** Um dado que não muda neste formulário, com o motivo e o caminho para quem precisar mudar. */
export function CampoTravado({
  rotulo,
  valor,
  explicacao,
}: Readonly<{ rotulo: string; valor: string; explicacao: string }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold text-marinho">{rotulo}</p>
      <p className="rounded-md border border-borda bg-neutro-suave p-3 text-sm font-semibold text-texto-2">
        <b className="text-marinho">{valor}.</b> {explicacao}
      </p>
    </div>
  );
}
