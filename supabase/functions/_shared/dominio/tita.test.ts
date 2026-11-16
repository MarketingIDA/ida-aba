import { describe, expect, it } from 'vitest';

import { FormatoDaTita, lerData, lerFavorecidos, URL_PADRAO_DA_TITA, urlDaTita } from './tita.ts';

describe('endereço da Tita (E28)', () => {
  it('usa o do segredo; só o domínio ganha o caminho da consulta', () => {
    expect(urlDaTita(' https://api.exemplo.test/outra/consulta?x=1 ')).toBe(
      'https://api.exemplo.test/outra/consulta?x=1',
    );
    expect(urlDaTita('https://api.exemplo.test')).toBe(
      'https://api.exemplo.test/api/cadastro/favorecido/consulta/empresa',
    );
    expect(urlDaTita('https://api.exemplo.test/')).toBe(
      'https://api.exemplo.test/api/cadastro/favorecido/consulta/empresa',
    );
  });

  it('sem segredo, ou com um que não é https, usa o endereço documentado', () => {
    expect(urlDaTita(undefined)).toBe(URL_PADRAO_DA_TITA);
    expect(urlDaTita('http://api.exemplo.test')).toBe(URL_PADRAO_DA_TITA);
    expect(urlDaTita('b3b366b7')).toBe(URL_PADRAO_DA_TITA);
  });
});

describe('data de nascimento da Tita', () => {
  it('converte dd/mm/aaaa e aceita aaaa-mm-dd', () => {
    expect(lerData('21/01/2018')).toBe('2018-01-21');
    expect(lerData(' 2018-01-21 ')).toBe('2018-01-21');
    expect(lerData('29/02/2020')).toBe('2020-02-29');
  });

  it('dia que não existe, outro formato ou vazio vira nulo', () => {
    expect(lerData('29/02/2019')).toBeNull();
    expect(lerData('31/04/2018')).toBeNull();
    expect(lerData('00/01/2018')).toBeNull();
    expect(lerData('10/00/2018')).toBeNull();
    expect(lerData('10/13/2018')).toBeNull();
    expect(lerData('21-01-2018')).toBeNull();
    expect(lerData('')).toBeNull();
    expect(lerData(null)).toBeNull();
  });
});

describe('lista de favorecidos da Tita', () => {
  it('fica só com o que o cadastro usa, normalizado', () => {
    const lista = lerFavorecidos([
      {
        id: 12345,
        nome: '  Maria   Exemplo da Silva ',
        sexo: 'Feminino',
        cpf: '12345678901',
        data_nascimento: '21/01/2018',
        ativo: true,
        unidades: [
          'INSTITUTO DO AUTISMO -  BOA VIAGEM',
          'INSTITUTO DO AUTISMO - BOA VIAGEM',
          ' ',
          7,
        ],
        responsaveis: [{ nome: 'Joana Exemplo', telefone: 'null' }],
      },
      { id: '678', nome: 42, sexo: ' MASCULINO ', data_nascimento: '31/02/2018', ativo: false },
      { id: 9, nome: 'Alex Exemplo', sexo: 'Outros', unidades: 'BOA VIAGEM' },
      { id: 11 },
    ]);

    expect(lista).toEqual({
      semId: 0,
      favorecidos: [
        {
          tita_id: 12345,
          nome: 'Maria Exemplo da Silva',
          genero: 'feminino',
          data_nascimento: '2018-01-21',
          data_invalida: false,
          ativo: true,
          unidades: ['INSTITUTO DO AUTISMO - BOA VIAGEM'],
        },
        {
          tita_id: 678,
          nome: '',
          genero: 'masculino',
          data_nascimento: null,
          data_invalida: true,
          ativo: false,
          unidades: [],
        },
        {
          tita_id: 9,
          nome: 'Alex Exemplo',
          genero: null,
          data_nascimento: null,
          data_invalida: true,
          ativo: true,
          unidades: [],
        },
        {
          tita_id: 11,
          nome: '',
          genero: null,
          data_nascimento: null,
          data_invalida: true,
          ativo: true,
          unidades: [],
        },
      ],
    });
  });

  it('conta quem vem sem id válido e recusa o que não é uma lista', () => {
    expect(
      lerFavorecidos([null, { id: 0 }, { id: 1.5 }, { id: 'abc' }, { nome: 'Sem Id' }]),
    ).toEqual({ favorecidos: [], semId: 5 });
    expect(() => lerFavorecidos({ message: 'Unauthorized' })).toThrow(FormatoDaTita);
  });
});
