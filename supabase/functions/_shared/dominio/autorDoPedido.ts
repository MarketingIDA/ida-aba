/**
 * A auditoria precisa saber quem pediu quando a Edge Function grava com a chave de serviço (as
 * versões da IA). O cabeçalho `x-auditoria-usuario` leva o id do Auth de quem pediu, tirado do
 * `sub` do token. A plataforma já conferiu a assinatura do token (`verify_jwt = true`), então aqui
 * só se lê. Token ilegível: sem cabeçalho, e o evento fica sem autor (como o sistema).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function cabecalhoDaAuditoria(autorizacao: string): Record<string, string> {
  const partes = autorizacao.replace(/^Bearer\s+/i, '').split('.');
  const meio = partes.length === 3 ? partes[1] : undefined;
  if (meio === undefined) return {};
  try {
    const base64 = meio.replace(/-/g, '+').replace(/_/g, '/');
    const carga: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    const sub =
      typeof carga === 'object' && carga !== null ? (carga as { sub?: unknown }).sub : null;
    return typeof sub === 'string' && UUID.test(sub) ? { 'x-auditoria-usuario': sub } : {};
  } catch {
    return {};
  }
}
