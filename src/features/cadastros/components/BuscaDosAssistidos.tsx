import { Seletor } from '@/components/Seletor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FiltroDosAssistidos } from '@/features/cadastros/assistidos';
import type { OpcaoDoSeletor } from '@/features/cadastros/carteiras';

interface Props {
  filtro: FiltroDosAssistidos;
  aoMudar: (filtro: FiltroDosAssistidos) => void;
  carteiras: readonly OpcaoDoSeletor[];
  mostrando: number;
  total: number;
}

/** Busca pelo nome e filtro por carteira; diz quantos aparecem de quantos há. */
export function BuscaDosAssistidos({
  filtro,
  aoMudar,
  carteiras,
  mostrando,
  total,
}: Readonly<Props>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="busca-assistido">Buscar pelo nome</Label>
          <Input
            id="busca-assistido"
            type="search"
            autoComplete="off"
            value={filtro.busca}
            onChange={(evento) => {
              aoMudar({ ...filtro, busca: evento.target.value });
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-carteira">Carteira</Label>
          <Seletor
            id="filtro-carteira"
            value={filtro.carteiraId}
            onChange={(evento) => {
              aoMudar({ ...filtro, carteiraId: evento.target.value });
            }}
          >
            <option value="">Todas as carteiras</option>
            {carteiras.map(({ valor, rotulo }) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </Seletor>
        </div>
      </div>
      <p aria-live="polite" className="text-xs font-semibold text-apagado">
        {mostrando === total
          ? `${String(total)} assistidos.`
          : `${String(mostrando)} de ${String(total)} assistidos.`}
      </p>
    </div>
  );
}
