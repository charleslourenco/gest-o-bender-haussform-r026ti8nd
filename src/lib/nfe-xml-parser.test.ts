import { parseNFeXml, classificarCategoriaItem, isInvalidBenderFornecedor } from './nfe-xml-parser'
import { calcularCustosEfetivos } from '@/services/estoque-matching'

export function runNFeParserTests(): { passed: boolean; results: string[] } {
  const results: string[] = []
  let allOk = true

  function assert(condition: boolean, desc: string) {
    if (condition) {
      results.push(`PASS: ${desc}`)
    } else {
      results.push(`FAIL: ${desc}`)
      allOk = false
    }
  }

  // 1. Teste de rejeição de Bender como fornecedor
  assert(isInvalidBenderFornecedor('Bender Haussform'), 'Rejeita "Bender Haussform"')
  assert(isInvalidBenderFornecedor('BENDER MOVEIS LTDA'), 'Rejeita "BENDER MOVEIS LTDA"')
  assert(isInvalidBenderFornecedor('bender'), 'Rejeita "bender"')
  assert(
    !isInvalidBenderFornecedor('Madeireira Rio Claro Ltda'),
    'Aceita "Madeireira Rio Claro Ltda"',
  )
  assert(!isInvalidBenderFornecedor('FGVTN Brasil'), 'Aceita "FGVTN Brasil"')

  // 2. Teste de categorização
  assert(
    classificarCategoriaItem('PARAFUSO CHIPBOARD 4.0X40') === 'Parafusos',
    'Categoriza parafuso',
  )
  assert(classificarCategoriaItem('CHAPA MDF BRANCO TX 18MM') === 'Chapas', 'Categoriza chapa MDF')
  assert(
    classificarCategoriaItem('DOBRADICA SLOW CURVA 35MM') === 'Ferragens',
    'Categoriza dobradiça',
  )
  assert(
    classificarCategoriaItem('FITA DE BORDA BRANCO 22MM') === 'Fitas de borda',
    'Categoriza fita de borda',
  )
  assert(
    classificarCategoriaItem('COLA PUR 501.0 KLEIBERIT') === 'Colas/Adesivos/Solventes',
    'Categoriza cola PUR',
  )
  assert(
    classificarCategoriaItem('PERFIL PUXADOR GOLA ALUMINIO') === 'Perfil puxador/puxador',
    'Categoriza perfil puxador',
  )

  // 3. Teste com XML de NF-e válido
  const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35230912345678000195550010000123451000123456">
      <ide>
        <nNF>12345</nNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <dhEmi>2026-09-20T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>DISTRIBUIDORA DE FERRAGENS BRASIL LTDA</xNome>
        <xFant>FERRAGENS BRASIL</xFant>
      </emit>
      <dest>
        <CNPJ>98765432000110</CNPJ>
        <xNome>BENDER HAUSSFORM LTDA</xNome>
      </dest>
      <total>
        <ICMSTot>
          <vProd>150.00</vProd>
          <vNF>150.00</vNF>
        </ICMSTot>
      </total>
      <det nItem="1">
        <prod>
          <cProd>CORR-01</cProd>
          <xProd>CORREDICA TELESCOPICA 450MM REFORCADA</xProd>
          <NCM>83024200</NCM>
          <uCom>PAR</uCom>
          <qCom>10.00</qCom>
          <vUnCom>15.00</vUnCom>
          <vProd>150.00</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`

  try {
    const parsed = parseNFeXml(validXml)
    assert(parsed.fornecedor === 'DISTRIBUIDORA DE FERRAGENS BRASIL LTDA', 'Nome emitente correto')
    assert(parsed.cnpj_fornecedor === '12.345.678/0001-95', 'CNPJ formatado correto')
    assert(parsed.numero_nota === '12345', 'Número da nota extraído')
    assert(parsed.valor === 150, 'Valor total extraído')
    assert(parsed.data_emissao === '2026-09-20', 'Data de emissão extraída')
    assert(parsed.itens.length === 1, '1 item extraído')
    assert(parsed.itens[0].produto === 'CORREDICA TELESCOPICA 450MM REFORCADA', 'Produto extraído')
    assert(parsed.itens[0].quantidade === 10, 'Quantidade correta')
    assert(parsed.itens[0].preco_unitario === 15, 'Preço unitário correto')
    assert(parsed.itens[0].categoria === 'Ferragens', 'Categoria classificada')
    assert(parsed.itens[0].unidade === 'PAR', 'Unidade extraída')
  } catch (err: any) {
    assert(false, `Falha no teste com XML válido: ${err.message}`)
  }

  // 4. Teste de rejeição quando emitente é Bender
  const benderEmitXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35230912345678000195550010000123451000123456">
      <ide><nNF>999</nNF></ide>
      <emit>
        <CNPJ>98765432000110</CNPJ>
        <xNome>BENDER HAUSSFORM</xNome>
      </emit>
    </infNFe>
  </NFe>
</nfeProc>`

  try {
    parseNFeXml(benderEmitXml)
    assert(false, 'Deveria rejeitar nota com emitente Bender')
  } catch (err: any) {
    assert(err.message.includes('Bender'), 'Rejeitou com mensagem clara para Bender emitente')
  }

  // 5. Teste de NF-e com Descontos (vDesc), Frete (vFrete) e IPI (vIPI)
  const xmlComDescontoEImpostos = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35240112345678000195550010000543211000123456">
      <ide>
        <nNF>54321</nNF>
        <natOp>COMPRA PARA INDUSTRIALIZACAO</natOp>
        <dhEmi>2026-09-25T14:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000195</CNPJ>
        <xNome>COMPENSADOS E FERRAGENS ALIANCA LTDA</xNome>
      </emit>
      <dest>
        <CNPJ>98765432000110</CNPJ>
        <xNome>BENDER HAUSSFORM LTDA</xNome>
      </dest>
      <total>
        <ICMSTot>
          <vProd>1000.00</vProd>
          <vDesc>100.00</vDesc>
          <vFrete>50.00</vFrete>
          <vICMS>108.00</vICMS>
          <vIPI>45.00</vIPI>
          <vST>0.00</vST>
          <vNF>995.00</vNF>
        </ICMSTot>
      </total>
      <det nItem="1">
        <prod>
          <cProd>MDF-001</cProd>
          <xProd>CHAPA MDF NOGUEIRA 18MM 2 FACES</xProd>
          <NCM>44111490</NCM>
          <uCom>CHAPA</uCom>
          <qCom>5.00</qCom>
          <vUnCom>200.00</vUnCom>
          <vProd>1000.00</vProd>
          <vDesc>100.00</vDesc>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`

  try {
    const parsedComDesconto = parseNFeXml(xmlComDescontoEImpostos)
    assert(parsedComDesconto.itens.length === 1, '1 item com desconto')
    // vProd = 1000, vDesc = 100 => Líquido = 900
    // Quantidade = 5 => Unitário líquido = 180 (e não 200)
    assert(parsedComDesconto.itens[0].preco_total === 900, 'Preço total líquido = 900 (1000 - 100)')
    assert(
      parsedComDesconto.itens[0].preco_unitario === 180,
      'Preço unitário líquido = 180 (900 / 5)',
    )
    assert(parsedComDesconto.itens[0].preco_bruto === 1000, 'Preço bruto preservado = 1000')
    assert(parsedComDesconto.itens[0].desconto === 100, 'Desconto por item extraído = 100')
    assert(parsedComDesconto.itens[0].valor_unitario_bruto === 200, 'Valor unitário bruto = 200')

    // Totais SEFAZ do grupo ICMSTot
    assert(parsedComDesconto.totais !== undefined, 'Totais estruturados extraídos')
    assert(parsedComDesconto.totais?.valor_produtos === 1000, 'Totais: produtos = 1000')
    assert(parsedComDesconto.totais?.valor_desconto === 100, 'Totais: desconto = 100')
    assert(parsedComDesconto.totais?.valor_frete === 50, 'Totais: frete = 50')
    assert(parsedComDesconto.totais?.valor_ipi === 45, 'Totais: IPI = 45')
    assert(parsedComDesconto.totais?.valor_icms === 108, 'Totais: ICMS = 108')
    assert(parsedComDesconto.totais?.valor_total_nota === 995, 'Totais: total NF = 995')
    assert(parsedComDesconto.valor === 995, 'Valor total da nota = 995')
  } catch (err: any) {
    assert(false, `Falha no teste com desconto e impostos: ${err.message}`)
  }

  // 6. Teste de rejeição de XML que não é NF-e
  const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <cliente>Jose</cliente>
</root>`

  try {
    parseNFeXml(invalidXml)
    assert(false, 'Deveria rejeitar XML genérico sem NF-e')
  } catch (err: any) {
    assert(err.message.includes('Nota Fiscal Eletrônica'), 'Rejeitou XML sem tags de NF-e')
  }

  // 7. Teste de cálculo de Custo Efetivo com rateio de frete e fechamento de centavos
  // Exemplo da nota real GMAD:
  // Itens:
  // Item 1: qtd=10, pu=6.313, pt=63.13
  // Item 2: qtd=5, pu=66.986, pt=334.93
  // Item 3: qtd=4, pu=66.985, pt=267.94
  // Base total = 666.00
  // Frete = 20.00, vNF = 686.00
  const itensSimulados = [
    { _draftId: 'd-1', quantidade: 10, preco_unitario: 6.313, preco_total: 63.13 },
    { _draftId: 'd-2', quantidade: 5, preco_unitario: 66.986, preco_total: 334.93 },
    { _draftId: 'd-3', quantidade: 4, preco_unitario: 66.985, preco_total: 267.94 },
  ]
  const totaisSimulados = {
    valor_produtos: 666,
    valor_frete: 20,
    valor_ipi: 0,
    valor_st: 0,
    valor_total_nota: 686,
  }

  const mapaEfetivo = calcularCustosEfetivos(itensSimulados, totaisSimulados)
  const item1Calc = mapaEfetivo.get('d-1')
  const item2Calc = mapaEfetivo.get('d-2')
  const item3Calc = mapaEfetivo.get('d-3')

  assert(
    item1Calc !== undefined && item2Calc !== undefined && item3Calc !== undefined,
    'Itens calculados no mapa',
  )
  const somaTotaisEfetivos =
    (item1Calc?.preco_total_efetivo || 0) +
    (item2Calc?.preco_total_efetivo || 0) +
    (item3Calc?.preco_total_efetivo || 0)

  assert(
    Math.abs(somaTotaisEfetivos - 686) < 0.001,
    `Soma dos totais efetivos bate com vNF (${somaTotaisEfetivos} == 686)`,
  )
  assert(
    (item1Calc?.acrescimo_rateado || 0) +
      (item2Calc?.acrescimo_rateado || 0) +
      (item3Calc?.acrescimo_rateado || 0) ===
      20,
    'Soma dos acréscimos bate exatamente com o frete de 20.00',
  )
  assert(
    (item2Calc?.custo_efetivo_unitario || 0) > (item2Calc?.preco_unitario_liquido || 0),
    'Custo efetivo unitário do item 2 é superior ao líquido devido ao frete',
  )

  // 8. Teste de fallback sem totais (notas antigas)
  const mapaSemTotais = calcularCustosEfetivos(itensSimulados, null)
  const item1Sem = mapaSemTotais.get('d-1')
  assert(item1Sem?.custo_efetivo_unitario === 6.313, 'Sem totais: custo efetivo = unitário líquido')

  return { passed: allOk, results }
}
