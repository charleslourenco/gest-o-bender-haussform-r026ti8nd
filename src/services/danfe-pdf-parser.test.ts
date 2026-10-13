/**
 * Testes unitários do parser determinístico de DANFE (Camada 1).
 * Testa:
 * 1. Extração da nota GMAD 000.337.093 (10 itens exatos somando 1.642,89, data 13/10/2026, descrições fiéis).
 * 2. Extração da nota Casa do MDF 000.346.147 somando 6.442,43.
 * 3. Validação matemática com tolerância R$ 0,05.
 * 4. Preservação de data pura YYYY-MM-DD.
 */

import { parseDanfeText, parseBrazilianNumber } from './danfe-pdf-parser'

export function runDanfeParserTests() {
  const results: { test: string; passed: boolean; message?: string }[] = []

  function assert(condition: boolean, testName: string, detail?: string) {
    results.push({
      test: testName,
      passed: Boolean(condition),
      message: condition ? undefined : detail || 'Assertion failed',
    })
  }

  // 1. Simulação do texto extraído do PDF da nota GMAD 000.337.093
  const gmadText = `
    RECEBEMOS DE GMAD PLACAS OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO
    DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
    0 - ENTRADA
    1 - SAÍDA 1
    Nº 000.337.093
    SÉRIE 1
    CHAVE DE ACESSO
    4126 1000 3370 9300 0182 5500 1000 3370 9310 0337 0930
    GMAD PLACAS DISTRIBUIDORA DE COMPONENTES LTDA
    CNPJ: 07.123.456/0001-82
    DATA DA EMISSÃO: 13/10/2026
    DATA DE SAÍDA: 13/10/2026

    CÁLCULO DO IMPOSTO
    BASE DE CÁLCULO DO ICMS 0,00 VALOR DO ICMS 0,00 BASE DE CÁLCULO DO ICMS ST 0,00 VALOR DO ICMS ST 0,00 VALOR TOTAL DOS PRODUTOS 1.642,89
    VALOR DO FRETE 0,00 VALOR DO SEGURO 0,00 DESCONTO 0,00 OUTRAS DESPESAS ACESSÓRIAS 0,00 VALOR TOTAL DO IPI 0,00 VALOR TOTAL DA NOTA 1.642,89

    DADOS DO PRODUTO / SERVIÇOS
    CÓDIGO DESCRIÇÃO DO PRODUTO/SERVIÇO NCM/SH CST CFOP UN. QUANTIDADE VALOR UNITÁRIO VALOR DESCONTO VALOR TOTAL
    10123 FITA PVC PANNA 499U 0,4X100MM 39204900 000 5102 UN 6,0000 45,2000 0,00 271,20
    -PROADEC
    10124 FITA PVC ALECRIM 0,4X64MM 39204900 000 5102 UN 4,0000 32,5000 0,00 130,00
    -PROADEC
    10125 FITA PVC ORVALHO 0,4X22MM 39204900 000 5102 UN 25,0000 18,4000 0,00 460,00
    -PROADEC
    10126 FITA BORDA FREIJO 0,4X35MM 39204900 000 5102 UN 10,0000 22,1000 0,00 221,00
    10127 PARAFUSO CHIP 4,0X40 73181500 000 5102 CX 1,0000 58,9000 0,00 58,90
    10128 COLA DE CONTATO 2,8KG 35069100 000 5102 UN 2,0000 84,3000 0,00 168,60
    10129 DISCO DE SERRA 250MM 82023900 000 5102 PC 1,0000 145,0000 0,00 145,00
    10130 SUPORTE INVISIVEL 200MM 83024200 000 5102 UN 20,0000 4,8000 0,00 96,00
    10131 SILICONE INCOLOR 280G 32141010 000 5102 UN 6,0000 14,2000 0,00 85,20
    10132 SOLVENTE 900ML 38140090 000 5102 UN 1,0000 6,9900 0,00 6,99

    DADOS ADICIONAIS
    INFORMAÇÕES COMPLEMENTARES
  `

  const parsedGmad = parseDanfeText(gmadText)

  assert(parsedGmad !== null, 'GMAD: Parser retornou objeto')
  assert(parsedGmad?.sucesso === true, 'GMAD: Leitura foi bem sucedida na Camada 1')
  assert(
    parsedGmad?.numero_nota === '000.337.093',
    `GMAD: Número da nota extraído (${parsedGmad?.numero_nota})`,
  )
  assert(
    parsedGmad?.data_emissao === '2026-10-13',
    `GMAD: Data de emissão pura YYYY-MM-DD (${parsedGmad?.data_emissao})`,
  )
  assert(
    parsedGmad?.itens.length === 10,
    `GMAD: Exatamente 10 itens extraídos (retornou ${parsedGmad?.itens.length})`,
  )

  if (parsedGmad && parsedGmad.itens.length === 10) {
    const quantidades = parsedGmad.itens.map((i) => i.quantidade)
    const esperadas = [6, 4, 25, 10, 1, 2, 1, 20, 6, 1]
    const qtdOk = esperadas.every((v, idx) => v === quantidades[idx])
    assert(
      qtdOk,
      `GMAD: Quantidades conferem 6/4/25/10/1/2/1/20/6/1 (atual: ${quantidades.join('/')})`,
    )

    const item1 = parsedGmad.itens[0]
    assert(
      item1.produto.includes('FITA PVC PANNA 499U 0,4X100MM') && item1.produto.includes('-PROADEC'),
      'GMAD: Item 1 com continuação de descrição anexada (-PROADEC)',
    )
    assert(item1.codigo_produto === '10123', 'GMAD: Código do item 1 correto')
    assert(item1.ncm === '39204900', 'GMAD: NCM do item 1 correto')

    const item2 = parsedGmad.itens[1]
    assert(
      item2.produto.includes('ALECRIM'),
      `GMAD: Item 2 contém ALECRIM (não corrompido por OCR) (${item2.produto})`,
    )

    const item3 = parsedGmad.itens[2]
    assert(
      item3.produto.includes('ORVALHO'),
      `GMAD: Item 3 contém ORVALHO (não corrompido por OCR) (${item3.produto})`,
    )

    const soma = parsedGmad.itens.reduce((acc, it) => acc + it.preco_total, 0)
    assert(
      Math.abs(soma - 1642.89) <= 0.01,
      `GMAD: Soma exata dos itens = 1.642,89 (calculado: ${soma.toFixed(2)})`,
    )
    assert(parsedGmad.soma_bateu === true, 'GMAD: Flag soma_bateu é true')
  }

  // 2. Simulação da nota Casa do MDF 000.346.147
  const casaMdfText = `
    DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
    Nº 000.346.147
    CHAVE DE ACESSO: 4126 1000 3461 4700 0182 5500 1000 3461 4710 0346 1470
    CASA DO MDF MATERIAIS PARA MARCENARIA LTDA
    CNPJ: 11.222.333/0001-44
    DATA DA EMISSÃO: 20/10/2026

    CÁLCULO DO IMPOSTO
    VALOR TOTAL DOS PRODUTOS 6.442,43
    VALOR TOTAL DA NOTA 6.442,43

    DADOS DO PRODUTO / SERVIÇO
    CÓDIGO DESCRIÇÃO DO PRODUTO/SERVIÇO NCM/SH CST CFOP UN. QUANTIDADE VALOR UNITÁRIO VALOR DESCONTO VALOR TOTAL
    MDF01 MDF LOURO FREIJO 18MM 2 FACES 44111490 000 5102 CH 10,0000 380,0000 0,00 3.800,00
    MDF02 MDF BRANCO TX 15MM 2 FACES 44111490 000 5102 CH 8,0000 240,0000 0,00 1.920,00
    FITA01 FITA PVC LOURO FREIJO 0,4X22MM 39204900 000 5102 RL 5,0000 65,0000 0,00 325,00
    COLA01 ADESIVO INSTANTANEO 100G 35069100 000 5102 UN 15,0000 26,4953 0,00 397,43

    DADOS ADICIONAIS
  `

  const parsedCasaMdf = parseDanfeText(casaMdfText)
  assert(parsedCasaMdf !== null, 'Casa do MDF: Parser retornou objeto')
  assert(parsedCasaMdf?.sucesso === true, 'Casa do MDF: Leitura teve sucesso na Camada 1')
  assert(
    parsedCasaMdf?.numero_nota === '000.346.147',
    `Casa do MDF: Número da nota extraído (${parsedCasaMdf?.numero_nota})`,
  )
  assert(
    parsedCasaMdf?.data_emissao === '2026-10-20',
    `Casa do MDF: Data de emissão (${parsedCasaMdf?.data_emissao})`,
  )

  if (parsedCasaMdf) {
    const somaCasaMdf = parsedCasaMdf.itens.reduce((acc, it) => acc + it.preco_total, 0)
    assert(
      Math.abs(somaCasaMdf - 6442.43) <= 0.05,
      `Casa do MDF: Soma dos itens bate com 6.442,43 (calculado: ${somaCasaMdf.toFixed(2)})`,
    )
    assert(parsedCasaMdf.soma_bateu === true, 'Casa do MDF: Flag soma_bateu é true')
  }

  // 3. Teste de rejeição e descarte se a soma não bater
  const danfeDivergente = `
    DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
    Nº 000.999.888
    VALOR TOTAL DOS PRODUTOS 500,00
    VALOR TOTAL DA NOTA 500,00
    DADOS DO PRODUTO / SERVIÇO
    CÓDIGO DESCRIÇÃO DO PRODUTO/SERVIÇO NCM/SH CST CFOP UN. QUANTIDADE VALOR UNITÁRIO VALOR DESCONTO VALOR TOTAL
    001 PRODUTO TESTE 44111490 000 5102 UN 1,0000 100,0000 0,00 100,00
    DADOS ADICIONAIS
  `
  const parsedDivergente = parseDanfeText(danfeDivergente)
  assert(
    parsedDivergente?.sucesso === false,
    'Divergente: Parser descartou Camada 1 quando soma não bate com produtos',
  )
  assert(parsedDivergente?.soma_bateu === false, 'Divergente: soma_bateu é false')

  // 4. Teste de números brasileiros
  assert(parseBrazilianNumber('1.642,89') === 1642.89, 'Number format: 1.642,89 -> 1642.89')
  assert(parseBrazilianNumber('6,0000') === 6, 'Number format: 6,0000 -> 6')
  assert(parseBrazilianNumber('0,00') === 0, 'Number format: 0,00 -> 0')

  return {
    allPassed: results.every((r) => r.passed),
    results,
  }
}
