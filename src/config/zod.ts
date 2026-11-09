import { z } from 'zod';

/**
 * O zod 4 compila esquemas com `new Function` quando pode, e para saber se pode, testa um `eval`.
 * A CSP da produção (`script-src 'self'`, no vercel.json) bloqueia esse teste e registra uma
 * violação a cada carga. Sem o JIT, ele não testa. Quem importa é o env.ts, o primeiro a validar
 * (já no import): no main.tsx não basta, porque o build põe o env.ts num chunk que roda antes.
 */
z.config({ jitless: true });
