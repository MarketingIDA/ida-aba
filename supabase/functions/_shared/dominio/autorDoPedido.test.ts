import { describe, expect, it } from 'vitest';

import { cabecalhoDaAuditoria } from './autorDoPedido.ts';

const token = (carga: object) =>
  `Bearer cabecalho.${btoa(JSON.stringify(carga)).replaceAll('=', '').replace(/\+/g, '-').replace(/\//g, '_')}.assinatura`;

describe('cabecalhoDaAuditoria', () => {
  it('leva o sub do token e ignora token ilegível ou sem uuid', () => {
    const sub = '0b6f3c2e-1d4a-4c1b-9f2e-3a5b6c7d8e9f';
    expect(cabecalhoDaAuditoria(token({ sub, role: 'authenticated' }))).toEqual({
      'x-auditoria-usuario': sub,
    });
    expect(cabecalhoDaAuditoria(token({ sub: "1' or 1=1" }))).toEqual({});
    expect(cabecalhoDaAuditoria('Bearer lixo')).toEqual({});
  });
});
