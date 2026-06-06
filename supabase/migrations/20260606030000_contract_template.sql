DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT UNIQUE NOT NULL,
    conteudo TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    atualizado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
  );

  INSERT INTO public.document_templates (id, nome, conteudo, ativo)
  VALUES (
    gen_random_uuid(),
    'Contrato Unificado',
    '<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
  h1 { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #111; }
  h2 { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #222; }
  p { margin-bottom: 10px; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; font-size: 14px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
  th { background-color: #f8f9fa; font-weight: bold; color: #333; }
  tr:nth-child(even) { background-color: #fbfcfd; }
  .highlight { font-weight: bold; color: #000; }
  .signature-block { margin-top: 50px; text-align: center; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
  .signature-col { flex: 1; }
  .signature-line { width: 100%; border-bottom: 1px solid #000; margin-bottom: 5px; }
  .footer { text-align: center; font-size: 10px; color: #777; margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
  <h1>CONTRATO UNIFICADO DE PRESTAÇÃO DE SERVIÇOS E FORNECIMENTO DE BENS</h1>

  <h2>1. DAS PARTES</h2>
  <p>Pelo presente instrumento particular, de um lado, <span class="highlight">Bender Haussform</span>, inscrita no CNPJ sob o nº 00.000.000/0001-00, com sede em Balneário Piçarras - SC, doravante denominada <span class="highlight">CONTRATADA</span>.</p>
  <p>De outro lado, <span class="highlight">{{nome_cliente}}</span>, inscrito(a) no CPF/CNPJ sob o nº <span class="highlight">{{cpf}}</span>, e-mail: {{email}}, telefone: {{telefone}}, doravante denominado(a) <span class="highlight">CONTRATANTE</span>.</p>

  <h2>2. DO OBJETO</h2>
  <p>O presente contrato tem por objeto a prestação de serviços de projeto, fabricação, montagem e instalação de móveis sob medida para o imóvel localizado no endereço: <span class="highlight">{{endereco_obra}}</span>.</p>

  <h2>3. DOS PRODUTOS E SERVIÇOS CONTRATADOS</h2>
  <p>A CONTRATADA compromete-se a fornecer os produtos e serviços listados abaixo, conforme as especificações do projeto executivo aprovado:</p>
  {{tabela_produtos}}

  <h2>4. DO PREÇO E CONDIÇÕES DE PAGAMENTO</h2>
  <p>O valor total acordado para a execução do presente contrato é de <span class="highlight">{{valor_total}}</span>. O CONTRATANTE obteve um desconto comercial de <span class="highlight">{{desconto}}</span> sobre o valor original.</p>
  <p>O pagamento será efetuado através da modalidade: <span class="highlight">{{metodo_pagamento}}</span>, conforme o seguinte cronograma:</p>
  {{tabela_pagamentos}}

  <div class="page-break"></div>

  <h2>5. DOS PRAZOS DE ENTREGA E MONTAGEM</h2>
  <p>A data prevista para o início da montagem e entrega final dos produtos é <span class="highlight">{{data_prevista_entrega}}</span>, sujeita a alterações em caso de força maior, atrasos na obra civil do CONTRATANTE ou falta de materiais no mercado, mediante aviso prévio documentado.</p>
  <p>Fica estipulado que qualquer alteração de projeto solicitada após a assinatura deste instrumento impactará o prazo de entrega original.</p>

  <h2>6. DAS OBRIGAÇÕES DA CONTRATADA</h2>
  <p>I - Executar os serviços e fornecer os bens conforme as especificações técnicas e de qualidade estabelecidas;<br>
  II - Manter o local de instalação limpo e organizado durante as atividades;<br>
  III - Arcar com os custos de transporte, locomoção e alimentação de sua equipe técnica.</p>

  <h2>7. DAS OBRIGAÇÕES DO CONTRATANTE</h2>
  <p>I - Disponibilizar o ambiente limpo, livre de entulhos e com as instalações elétricas/hidráulicas concluídas nas datas agendadas para medição final e montagem;<br>
  II - Garantir o acesso da equipe técnica da CONTRATADA ao local da obra nos horários permitidos pelo condomínio;<br>
  III - Efetuar o pagamento das parcelas nos prazos estipulados.</p>

  <h2>8. DAS GARANTIAS E ASSISTÊNCIA TÉCNICA</h2>
  <p>A CONTRATADA oferece garantia de 5 (cinco) anos contra defeitos de fabricação em madeiras e MDF, e 1 (um) ano para ferragens e acessórios, contados a partir da data de assinatura do Termo de Conclusão e Vistoria.</p>
  <p>A garantia perderá a validade em casos de mau uso, exposição excessiva a umidade ou luz solar direta, uso indevido de produtos químicos na limpeza, ou alterações estruturais realizadas por terceiros.</p>

  <h2>9. DA RESCISÃO E MULTAS</h2>
  <p>A rescisão imotivada do presente contrato por qualquer das partes sujeitará o infrator ao pagamento de multa penal de 20% (vinte por cento) sobre o valor total do contrato, além do ressarcimento por perdas e danos e despesas já incorridas até o momento do distrato.</p>

  <div class="page-break"></div>

  <h2>10. DAS DISPOSIÇÕES FINAIS</h2>
  <p>Este instrumento vincula as partes e seus sucessores. Qualquer alteração ou aditivo contratual só terá validade se firmado por escrito ou através de aceitação sistêmica registrada.</p>
  <p>E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em formato digital, com validade jurídica reconhecida conforme a MP nº 2.200-2/2001, elegendo o foro da comarca de Balneário Piçarras - SC para dirimir quaisquer dúvidas oriundas deste contrato.</p>

  <div class="signature-block">
    <div class="signature-col">
      <br><br><br>
      <div class="signature-line"></div>
      <p><strong>{{nome_cliente}}</strong><br>CONTRATANTE</p>
    </div>
    <div class="signature-col">
      <br><br><br>
      <div class="signature-line"></div>
      <p><strong>Bender Haussform</strong><br>CONTRATADA</p>
    </div>
  </div>

  <div class="footer">
    Documento gerado em {{data_contrato}} pelo Sistema de Gestão Bender Haussform. Integridade verificada eletronicamente.
  </div>
</body>
</html>',
    true
  )
  ON CONFLICT (nome) DO UPDATE
  SET conteudo = EXCLUDED.conteudo;
END $$;
