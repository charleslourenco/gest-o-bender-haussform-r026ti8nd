CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  conteudo text NOT NULL,
  ativo boolean DEFAULT true,
  atualizado_em timestamp DEFAULT now()
);

ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS conteudo_preenchido text;
ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS valor_total numeric;
ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS data_prevista_entrega date;

INSERT INTO public.document_templates (nome, conteudo) VALUES
('contrato', $CONTENT$Na Bender, acreditamos que um projeto de interiores é muito mais do que a soma de seus materiais. É a tradução de um estilo de vida em forma, proporção e detalhe. Cada móvel projetado por nossa equipe carrega um processo meticuloso que começa muito antes da primeira peça ser cortada — e só termina quando o cliente, ao cruzar a porta de seu novo ambiente, sente exatamente o que imaginou.
A aparente complexidade deste documento é, na verdade, um reflexo do cuidado que dedicamos a cada etapa da sua experiência conosco. Cada cláusula foi escrita para proteger não apenas nossos interesses, mas principalmente a sua tranquilidade, o seu investimento e a qualidade do resultado final.

A ESTRUTURA DE QUATRO MÃOS
O processo colaborativo que garante a excelência Bender

🎨 O CONSULTOR | O Estilo
Define a identidade visual do projeto, traduzindo as necessidades e sonhos do cliente em conceitos estéticos precisos e coerentes.

👤 O CLIENTE | A Vida
O protagonista do processo. Valida cada decisão, garantindo que o espaço final seja, verdadeiramente, feito para a sua vida.

📐 O ANALISTA | A Forma
Converte os conceitos estéticos em precisão técnica. É o responsável pelas medições milimétricas e pela viabilidade construtiva do projeto.

🔨 O MONTADOR | A Materialização
Executa com maestria artesanal o que foi planejado com rigor técnico — transformando matéria-prima em ambiente.

POR QUE ESTE PROCESSO É TÃO DETALHADO?
✦ Clareza previne mal-entendidos e retrabalho
✦ Transparência constrói confiança duradoura
✦ Precisão assegura qualidade em cada detalhe
✦ Respeito mútuo é a base de toda colaboração bem-sucedida

Cada etapa existe por uma razão. Cada documento tem um propósito. Juntos, eles constroem a experiência Bender. Sendo assim, celebramos o:

CONTRATO UNIFICADO DE SOLUÇÕES PARA INTERIORES: PROJETOS, MOBILIÁRIO E GESTÃO

que se regerá pelas cláusulas e condições a seguir estabelecidas, em conformidade com o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Código Civil Brasileiro, comprometendo-se ambas ao cumprimento fiel de todas as disposições aqui pactuadas.

Este instrumento é estruturado em módulos independentes. A CONTRATANTE declara ciência de que a eficácia jurídica das cláusulas contidas neste instrumento está estritamente vinculada à contratação expressa e ao pagamento dos referidos serviços descritos na tabela de produtos e serviços contratados.

CLÁUSULA 1 — IDENTIFICAÇÃO DAS PARTES

1.1. CONTRATADA
Razão Social: BENDER MÓVEIS E DESIGN LTDA.
CNPJ: 14.871.048/0001-80
Sede: Rua Bender, 149, Bairro Nossa Senhora da Conceição, Balneário Piçarras, SC, CEP 88380-000
Representante Legal: Daiana Gabriela Bender — CPF: 011.494.920-40
E-mail: projetos@benderhaussform.com
Telefone: (47) 98879-3627

1.2. CONTRATANTE
Nome Completo: [CLIENTE_NOME]
CPF/CNPJ: [CLIENTE_CPF_CNPJ]
Profissão: [CLIENTE_PROFISSAO]
Estado Civil: [CLIENTE_ESTADO_CIVIL]
E-mail: [CLI_EMAIL]
Telefone: [CLIENTE_TELEFONE]
CEP: [CLIENTE_CEP]
Rua: [CLIENTE_RUA]
Número: [CLIENTE_NUMERO]
Complemento: [CLIENTE_COMPLEMENTO]
Bairro: [CLIENTE_BAIRRO]
Cidade: [CLIENTE_CIDADE]
Estado: [CLIENTE_ESTADO]

CLÁUSULA 2 — OBJETO DO CONTRATO
2.1.1 MÓDULO 01: Serviço De Criação De Projetos, Fabricação, Montagem E Instalação De Móveis Sob Medida
2.1.2 MÓDULO 02: Fornecimento, Entrega e Montagem de Móveis Soltos
2.1.3 MÓDULO 03: Serviços de acompanhamento de obras de interiores:
A: Plano Bender Essencial | B: Plano Bender Forma | C: Plano Bender Hauss
2.2. As cláusulas deste contrato tratam de todos os produtos e serviços fornecidos pela Contratada, contudo, somente as cláusulas de que tratam dos produtos e serviços relacionados na tabela da cláusula 4 mantêm sua aplicabilidade.

CLÁUSULA 3 — LOCAL DE ENTREGA E PRESTAÇÃO DOS SERVIÇOS
CEP: [OBRA_CEP]
Rua: [OBRA_RUA]
Número: [OBRA_NUMERO]
Complemento: [OBRA_COMPLEMENTO]
Bairro: [OBRA_BAIRRO]
Cidade: [OBRA_CIDADE]
Estado: [OBRA_ESTADO]

CLÁUSULA 4 — DESCRIÇÃO DOS PRODUTOS, SERVIÇOS E FINANCEIRO
[BLOCO_PRODUTOS_SERVICOS]
[METODO_PAGAMENTO]
[DATA_PAGAMENTO]
[BLOCO_PARCELAS_TEXTO]

Multa moratória: 2% (dois por cento) sobre o valor em atraso
Juros de mora: 1% (um por cento) ao mês, pro rata die
Correção monetária: IPCA, ou índice que venha a substituí-lo

A CONTRATADA poderá suspender a execução dos serviços até a regularização integral do débito, sem que tal suspensão configure inadimplemento ou atraso de sua parte.

4.4. Pagamentos por Cheque: Quando o pagamento for realizado por cheque, este deverá ser entregue nominal e cruzado à CONTRATADA. A devolução, sustação ou insuficiência de fundos caracteriza inadimplência imediata.

4.5. Recibos e Comprovantes: A CONTRATADA emitirá recibo ou comprovante de pagamento para cada parcela quitada, no prazo de até 2 (dois) dias úteis após a confirmação do pagamento.

4.6. Condição para Início da Fabricação: A fabricação somente será iniciada após: (1) aprovação e assinatura do Caderno Técnico pela CONTRATANTE e (2) confirmação da regularidade financeira do contrato.

MÓDULO 01 - SERVIÇO DE CRIAÇÃO DE PROJETOS, FABRICAÇÃO, MONTAGEM E INSTALAÇÃO DE MÓVEIS SOB MEDIDA

CLÁUSULA 5 — A JORNADA BENDER: DO PROJETO À ENTREGA
🧑‍💻 PROJETO: Elaboração de projeto executivo completo dos móveis, incluindo plantas baixas, cortes, elevações e detalhes construtivos.
⚙️ FABRICAÇÃO: Produção dos móveis sob medida com os materiais, acabamentos e ferragens especificados no Caderno Técnico aprovado.
🚚 ENTREGA: Transporte dos móveis fabricados até o local de instalação, com embalagem e proteção adequadas.
👷 MONTAGEM: Instalação dos móveis no imóvel conforme projeto aprovado.

5.2. Visão Geral:
FASE 01 — A CONCEPÇÃO: Consultoria, projeto 3D e aprovação conceitual — Já Concluída
FASE 02 — A REALIZAÇÃO: Documentação técnica, fabricação, instalação e garantia — Regulada por este Contrato

5.3. DOCUMENTAÇÃO TÉCNICA
5.3.1. Ata Pré-Preenchida: O Consultor Bender consolida todas as especificações estéticas do projeto aprovado em uma Ata de Reunião de Análise pré-preenchida.
5.3.2. Medição Fina: O Analista Técnico Bender realiza a medição detalhada e milimétrica do local de instalação.
5.3.3. Reunião de Análise: Encontro presencial ou remoto entre Consultor(a) Bender, Analista Técnico Bender e CONTRATANTE.
5.3.4. Ata Final e Caderno Técnico: Da Reunião de Análise nasce a Ata finalizada, assinada por todas as partes. Com base nela, o Analista elabora o Caderno Técnico.
CONDIÇÃO INDISPENSÁVEL: A aprovação e assinatura do Caderno Técnico pela CONTRATANTE é requisito obrigatório para o início da Execução.

5.4. EXECUÇÃO
5.4.1. Aquisição de Materiais: Após aprovação do Caderno Técnico e confirmação financeira, a CONTRATADA procederá à aquisição dos materiais.
5.4.2. Fabricação Bender: Produção em conformidade rigorosa com as especificações do Caderno Técnico.
5.4.3. Montagem Bender: Protocolo de respeito ao ambiente do cliente — cautela, talento, paciência e respeito.
5.4.4. Logística: Carregamento, transporte e descarga com proteção adequada.
5.4.5. Proteção do Imóvel: Aplicação de manta salva-pisos, salva-quinas e demais elementos de proteção.
5.4.6. Montagem com Intervenção Controlada: Instalação organizada, com foco na ordem, silêncio e intervenção mínima.

Protocolo de Conformidade na Entrega:
☑️ Item fabricado conforme Caderno Técnico | ✖️ Divergência entre item fabricado e projeto aprovado
☑️ Montagem concluída conforme projeto | ✖️ Falha de instalação ou acabamento
☑️ Funcionamento correto de ferragens e mecanismos | ✖️ Mecanismo com defeito
☑️ Ausência de danos ao imóvel | ✖️ Dano identificado ao imóvel durante a montagem

5.4.7. Entrega Formal: A CONTRATANTE assinará o Termo de Conclusão e Vistoria, podendo registrar não-conformidades identificadas.
5.4.8. Correções Pós-Entrega: A CONTRATADA realizará a correção de todas as não-conformidades confirmadas, sem custo adicional.

CLÁUSULA 6 — PRAZOS E ENTREGA
6.1. Prazo de Execução: 50 a 70 dias úteis, contados a partir da data de assinatura, do acesso liberado ao imóvel e da liberação financeira — condições cumulativas.
6.2. Carência Operacional: 15 (quinze) dias úteis além do prazo estimado, sem penalidade.
6.3. Penalidade por Atraso: 0,5% por semana de atraso, até o limite de 5% do valor total do contrato.
6.3.1. Data Prevista de Liberação do Imóvel: [DATA_PREVISTA_ENTREGA_IMOVEL]
6.3.2. O prazo somente se inicia a partir da Liberação Efetiva do imóvel, comunicada com antecedência mínima de 10 dias úteis.
6.4. Suspensão Justificada: O prazo ficará suspenso em caso de demora da CONTRATANTE para aprovação de documentos, impossibilidade de acesso ao imóvel, ou caso fortuito/força maior.

CLÁUSULA 7 — ALTERAÇÕES E AJUSTES
7.1. Qualquer alteração deverá ser solicitada formalmente antes do início da fase afetada.
7.2. As alterações aprovadas serão registradas em Aditivo Contratual assinado pelas partes.
7.3. Alterações após o início da fase correspondente poderão gerar custos adicionais e impacto no prazo, de responsabilidade exclusiva da CONTRATANTE.

CLÁUSULA 8 — GARANTIAS
✅ MDF e Ferragens: 3 (três) anos
✅ LED, Vidros, Espelhos e serralheria: 1 (um) ano
✅ Móveis Soltos: 1 (um) ano
Exclusões: ❌ Uso inadequado ❌ Danos por terceiros ❌ Desgaste natural ❌ Alterações não autorizadas ❌ Umidade/infiltrações

CLÁUSULA 9 — RESPONSABILIDADES SOBRE O IMÓVEL E DANOS
9.1. A CONTRATANTE é responsável por garantir que o imóvel esteja em condições adequadas para a montagem.
9.2. A CONTRATADA adotará todas as precauções razoáveis para evitar danos ao imóvel.
9.3. A CONTRATADA não se responsabiliza por vícios ocultos do imóvel não identificáveis na Medição Fina.

CLÁUSULA 10 — RESCISÃO E PENALIDADES
a) Até a Medição Fina: 5% do valor total
b) Após Medição Fina e antes do Caderno Técnico: 8% do valor total
c) Após Caderno Técnico e antes da Fabricação: 10% + reembolso de custos
d) Após início da Fabricação: 12% + reembolso de materiais
e) Após Expedição/Entrega: 15% + reembolso de todos os custos
10.3. Rescisão por Acordo Mútuo mediante instrumento escrito.

CLÁUSULA 11 — PROPRIEDADE INTELECTUAL
Todos os projetos e documentos técnicos são propriedade intelectual exclusiva da CONTRATADA, protegidos pela Lei nº 9.610/1998. A CONTRATANTE recebe direito de uso com a quitação integral do contrato.

MÓDULO 02 - FORNECIMENTO, ENTREGA E MONTAGEM DE MÓVEIS SOLTOS

CLÁUSULA 12 — FORNECIMENTO DE MÓVEIS SOLTOS
📦 FORNECIMENTO: Aquisição conforme especificações da tabela da cláusula 4.
🚚 ENTREGA: Transporte sem custo adicional para a CONTRATANTE.
🔧 MONTAGEM: Instalação dos móveis soltos conforme especificações aprovadas.
12.1. Prazo: até 30 (trinta) dias úteis após confirmação do pagamento.
12.2. Frete: SEM CUSTO para a CONTRATANTE.
12.3. No ato da entrega, inspecionar os móveis, verificar conformidade e ausência de avarias. Não conformidades devem ser registradas imediatamente.
12.4. Montagem inclusa no valor.

CLÁUSULA 13 — GARANTIAS
13.1. Garantia de 12 (doze) meses a partir da data de entrega, cobrindo defeitos de fabricação.
13.2. Exclusões: ❌ Desgaste natural ❌ Mau uso ❌ Produtos abrasivos ❌ Reparos por terceiros não autorizados ❌ Condições ambientais inadequadas

MÓDULO 03 - SERVIÇOS DE ACOMPANHAMENTO DE OBRAS DE INTERIORES

CLÁUSULA 14 — PLANO BENDER ESSENCIAL
📦 Logística e Gestão: recebimento e conferência de eletrodomésticos e móveis soltos; armazenamento temporário; guarda de chaves.
🎨 Acabamentos: detalhamento das pedras; verificação de marmoraria; medidas para móveis soltos.
🔹 Montagem de móveis soltos.
🔹 Consultoria: indicação de empresa de limpeza pós-obra (não incluso).
Duração: 3 (três) meses | Visitas: até 2 por mês | Total: 6 visitas.

CLÁUSULA 15 — PLANO BENDER FORMA
📦 Logística e Gestão: recebimento, armazenamento, chaves, medidas, montagem de móveis soltos.
🔨 Supervisão Técnica: pedras, marmoraria, luminotécnico, climatização, box, pontos elétricos/hidráulicos/gás.
🎨 Consultoria de Acabamentos: MDF, pedras, cores, paginação de pisos, cortinas, persianas, tapetes.
Duração: 3 (três) meses | Visitas: 1 por semana.

CLÁUSULA 16 — PLANO BENDER HAUSS
📦 Logística e Gestão: recebimento, armazenamento, chaves, medidas, montagem de móveis soltos.
🔨 Supervisão Técnica: pedras, marmoraria, luminotécnico, climatização, box, pontos elétricos/hidráulicos/gás.
🎨 Consultoria de Acabamentos: MDF, pedras, cores, paginação de pisos, cortinas, persianas, tapetes.
🏗️ Acompanhamento de Obras: reformas estruturais, automação residencial, elétrica/hidráulica, pintura.
🎭 Ambientação Final: organização de móveis, quadros e objetos; relatórios fotográficos semanais; até 2 visitas pós-entrega.
Duração: 3 (três) meses | Visitas: 1 por semana.

CLÁUSULA 17 — PROTEÇÃO DE DADOS E IMAGENS (LGPD)
17.1. Dados tratados conforme Lei nº 13.709/2018 — LGPD.
17.2. Dados utilizados exclusivamente para execução do contrato, comunicações, documentos fiscais e obrigações legais.
17.3. A CONTRATANTE pode solicitar confirmação, acesso, correção, anonimização, portabilidade ou eliminação dos dados pelo e-mail projetos@benderhaussform.com.
17.4. A CONTRATANTE autoriza uso de imagens do projeto finalizado para portfólio e divulgação, sem identificação do imóvel ou da CONTRATANTE.
17.5. A autorização não abrange dados pessoais ou endereço completo sem consentimento prévio.
17.6. A autorização de uso de imagens pode ser revogada a qualquer tempo mediante comunicação formal.
17.7. A CONTRATADA garante medidas técnicas adequadas para proteção dos dados pessoais.
17.8. Dados mantidos pelo prazo necessário ao cumprimento das finalidades e obrigações legais.

CLÁUSULA 18 — DOCUMENTAÇÃO COMPLEMENTAR
📐 Medição Fina — Registro técnico das medidas reais do imóvel
📄 Ata de Reunião de Análise — Validação formal de todas as especificações
📄 Termo de Recusa de Participação em Reunião de Análise — Formalização da ausência
📄 Termo de Substituição ou Representação — Autorização para representação
📒 Caderno Técnico — Projeto executivo completo, documento mestre da fabricação
🤝 Termo de Conclusão e Vistoria — Aceite formal da entrega
🛡️ Termo de Garantia — Prazos e condições de garantia
📣 Comunicados — Registros formais de comunicações relevantes

CLÁUSULA 19 — DISPOSIÇÕES GERAIS
19.1. Contrato irrevogável e irretratável, obrigando as partes e seus sucessores.
19.2. Este instrumento representa o acordo completo entre as partes, substituindo entendimentos anteriores.
19.3. Qualquer modificação somente terá validade se formalizada por escrito mediante Aditivo Contratual.
19.4. Uma via ficará arquivada no dossiê do cliente. A CONTRATANTE receberá via digital assinada.

CLÁUSULA 20 — FORO
Fica eleito o foro da Comarca de Balneário Piçarras — SC para dirimir quaisquer litígios, com renúncia a qualquer outro foro.

Balneário Piçarras, [DATA_CONTRATO_EXTENSO]$CONTENT$),

('termo_garantia', $CONTENT$TERMO DE GARANTIA DE MÓVEIS SOB MEDIDA

Cliente: [CLIENTE_NOME]
Data de Início da Garantia: [DATA_INICIO_GARANTIA]

1. Prazos de Garantia:
• MDF: 02 (dois) anos
• Acessórios em metal (dobradiças, corrediças, pistões): 02 (dois) anos
• Fitas de LED: 03 (três) meses
• Espelhos e vidros: 01 (um) ano

2. Condições da Garantia:
• A garantia cobre defeitos de fabricação e problemas de qualidade nos materiais e na montagem.
• Assistências técnicas decorrentes da garantia são isentas de custo.
• A garantia não abrange danos decorrentes de mau uso, desgaste natural ou eventos de força maior.

3. Exclusões da Garantia:
• Danos causados por uso inadequado, abuso, acidentes ou negligência.
• Desgaste natural devido ao uso regular.
• Danos causados por força maior, como desastres naturais.
• Problemas decorrentes de modificações, reparos ou manutenção feitos por terceiros não autorizados.

4. Cuidados e Manutenção dos Móveis:
• Evitar exposição direta e prolongada à luz solar e à umidade.
• Limpar com pano macio e seco; não usar produtos abrasivos ou corrosivos.
• Evitar sobrecarga em prateleiras e gavetas.
• Não utilizar os móveis de maneira diferente da sua finalidade designada.

CONTATO PARA ASSISTÊNCIA
Fone e WhatsApp: (47) 99216-8595
E-mail: projetos@benderhaussform.com
Endereço: Rua Bender 149, Bairro Nossa Senhora da Conceição, Balneário Piçarras – SC$CONTENT$),

('termo_alteracao', $CONTENT$TERMO DE ALTERAÇÃO DE PROJETO

Para: [CLIENTE_NOME]
Data da Solicitação: [DATA_SOLICITACAO]

1. DESCRIÇÃO DA ALTERAÇÃO SOLICITADA
Acreditamos que um projeto de interiores é a tradução de um estilo de vida e, por isso, compreendemos que as alterações são etapas naturais desse processo. Este documento formaliza o desejo de ajustar [DESCRICAO_ALTERACAO], garantindo que o resultado final permaneça em total harmonia com o que foi idealizado.

2. IMPACTOS DA ALTERAÇÃO
• Revisão Técnica e Colaborativa: Toda a equipe técnica revisará os planos para assegurar que a nova ideia seja perfeita e segura.
• Ajuste de Cronograma: O cronograma poderá ser reajustado para acomodar a mudança com a excelência necessária.
• Transparência Comercial: Caso existam variações de valores, os custos serão apresentados com total transparência.

3. PRÓXIMOS PASSOS
1. A equipe da Bender Haussform enviará proposta atualizada e aditivo com ajustes de valores e novo cronograma.
2. Com aprovação formal nesses documentos, a alteração é integrada imediatamente ao fluxo de produção e montagem.

Nosso compromisso é transformar seu ambiente com o acolhimento e o rigor técnico que você merece.

BENDER MÓVEIS E DESIGN LTDA
CNPJ: 14.871.048/0001-80$CONTENT$),

('termo_conclusao_vistoria', $CONTENT$TERMO DE CONCLUSÃO E VISTORIA — MÓVEIS SOB MEDIDA

Cliente: [CLIENTE_NOME]
CPF/CNPJ: [CLIENTE_CPF_CNPJ]
Endereço da Obra: [OBRA_ENDERECO_COMPLETO]
Data da Vistoria: [DATA_VISTORIA]

✅ CONFORME:
[ ] Todos os móveis instalados conforme projeto
[ ] Acabamentos, silicone, tapa furos
[ ] Funcionamento e regulagem de portas e gavetas OK
[ ] Superfícies sem danos visíveis
[ ] Vidros, espelhos e portas de alumínio OK
[ ] Fitas de LED, iluminação, interruptores e tomadas

⚠️ CORREÇÕES NECESSÁRIAS:
1. Item: _______________ Correção: _______________
2. Item: _______________ Correção: _______________
3. Item: _______________ Correção: _______________

OBS: Este documento formaliza a vistoria e inicia o período de garantia legal e contratual.$CONTENT$),

('termo_nao_conformidade', $CONTENT$TERMO DE NÃO CONFORMIDADE

Para: [CLIENTE_NOME]
CPF/CNPJ: [CLIENTE_CPF_CNPJ]
Data da Ocorrência: [DATA_OCORRENCIA]

1. INTRODUÇÃO E FILOSOFIA DE TRABALHO
Na Bender, entendemos que a pausa é uma forma de cuidado com o seu investimento. Para entregarmos a precisão e a qualidade que definem nossa marca, o ambiente deve estar em total harmonia com o projeto técnico. Este documento formaliza a necessidade de ajustes no local de instalação, fundamentado nas Cláusulas 6.2, 6.3, 8.2 e 9 do Contrato Principal.

2. SITUAÇÃO IDENTIFICADA
Durante o acompanhamento técnico, constatamos que o ambiente ainda não reúne as condições necessárias para o início seguro das atividades. Especificamente: [DESCRICAO_OCORRENCIA]

3. IMPACTOS E PRESERVAÇÃO DA QUALIDADE
3.1. Suspensão do Prazo: O cronograma de execução fica pausado a partir desta data.
3.2. Reagendamento: Assim que o ambiente estiver pronto, definiremos nova data de montagem.
3.3. Custos Adicionais: Eventuais despesas com logística, deslocamento ou adaptações serão apresentadas de forma transparente.

4. PRÓXIMOS PASSOS
1. Regularização das pendências citadas no item 2.
2. Comunicação à Bender assim que as ocorrências tenham sido sanadas.

Agradecemos a compreensão. Nossa prioridade é garantir que a entrega final reflita a excelência e o conforto que você planejou.

BENDER MÓVEIS E DESIGN LTDA
CNPJ: 14.871.048/0001-80$CONTENT$),

('termo_recusa', $CONTENT$TERMO DE RECUSA DE PARTICIPAÇÃO EM REUNIÃO DE ANÁLISE DE PROJETO

Eu, [CLIENTE_NOME], CPF/CNPJ [CLIENTE_CPF_CNPJ], na qualidade de CONTRATANTE do projeto de móveis sob medida junto à Bender Móveis e Design LTDA, CNPJ: 14.871.048/0001-80, declaro que tenho:

Ciência da Convocação: Declaro ter sido devidamente comunicado(a) e convidado(a) para participar da Reunião de Análise Técnica de Projeto.

Ciência da Importância: Declaro ter sido orientado(a) sobre a importância crítica desta reunião, cujo objetivo é a validação final de todas as especificações técnicas, materiais, acabamentos, ferragens, medidas e demais detalhes do projeto antes de seu envio para a produção.

Recusa Formal de Participação: Por minha livre e espontânea vontade, declaro formalmente a recusa em participar da referida Reunião de Análise Técnica, seja na modalidade presencial ou por videoconferência.

Delegação de Decisão e Aceitação Incondicional: Em virtude da minha recusa, delego plenos poderes à equipe técnica da Bender Móveis e Design LTDA para tomar todas as decisões necessárias durante a reunião e aceito, de forma integral, incondicional e irretratável, todas as definições e especificações técnicas que serão estabelecidas na Ata de Reunião de Análise.

Vinculação à Ata: Estou ciente de que a Ata de Reunião de Análise, mesmo sem a minha presença, será considerada parte integrante do contrato, e que a produção dos meus móveis seguirá rigorosamente as diretrizes nela contidas.

Renúncia a Contestações Futuras: Renuncio expressamente ao direito de realizar quaisquer contestações sobre os pontos definidos na referida Ata, compreendendo que qualquer solicitação de mudança posterior estará sujeita à análise de viabilidade e cobrança de custos adicionais.

[OBRA_CIDADE], [DATA_CONTRATO_EXTENSO]$CONTENT$),

('termo_representacao', $CONTENT$TERMO DE AUTORIZAÇÃO PARA REPRESENTAÇÃO

Eu, [CLIENTE_NOME], [CLIENTE_CPF_CNPJ], cliente da BENDER MÓVEIS E DESIGN LTDA, declaro que autorizo expressamente a(o) arquiteta(o) [REPRESENTANTE_NOME], CPF [REPRESENTANTE_CPF], a me representar integralmente na Reunião de Análise referente ao meu contrato de móveis sob medida.

Concedo à(ao) referida(o) arquiteta(o) plenos poderes para discutir, deliberar, tomar decisões e assinar a Ata de Reunião de Análise em meu nome, reconhecendo e ratificando todas as suas ações como se por mim mesmo(a) fossem praticadas.

Esta autorização visa agilizar o processo de detalhamento e aprovação do projeto, garantindo a continuidade do cronograma de fabricação e instalação, conforme os termos do nosso contrato com a Bender Móveis e Design Ltda.

Balneário Piçarras, [DATA_CONTRATO_EXTENSO]$CONTENT$)
ON CONFLICT (nome) DO UPDATE SET conteudo = EXCLUDED.conteudo;

DROP POLICY IF EXISTS "document_templates_select" ON public.document_templates;
CREATE POLICY "document_templates_select" ON public.document_templates FOR SELECT TO authenticated USING (true);
