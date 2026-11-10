/** Turno da carteira (o enum `cadastro.turno` do banco), na ordem do dia. */
export const TURNOS = ['manha', 'tarde', 'integral'] as const;

export type Turno = (typeof TURNOS)[number];

/** Como o turno aparece na tela (ex.: `BOV · Manhã`). */
export const ROTULO_DO_TURNO: Record<Turno, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  integral: 'Integral',
};
