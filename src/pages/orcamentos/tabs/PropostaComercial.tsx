import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FileText, Save, Loader2, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

const DEFAULT_TEXTOS = {
  essencia:
    'A Bender Haussform transcende o conceito tradicional de fábrica de móveis. Atuamos como um estúdio de design e engenharia onde a precisão alemã encontra a sensibilidade arquitetônica brasileira. Nossa vocação é transformar matérias-primas nobres em espaços de vivência excepcionais.\n\nCom um parque fabril de vanguarda localizado em Balneário Piçarras, Santa Catarina, detemos controle absoluto sobre cada etapa do processo — desde a seleção criteriosa dos insumos até a montagem milimétrica no seu ambiente.',
  manifesto:
    '"Acreditamos que o espaço que você habita molda a forma como você vive. Não construímos apenas móveis; construímos a infraestrutura para as suas melhores memórias."',
  padrao:
    'Nosso design é pautado pelo minimalismo funcional. Cada linha, cada junção e cada acabamento tem um propósito claro. Rejeitamos o excesso em favor da sofisticação atemporal.\n\nAcreditamos na durabilidade. Nossos móveis não são projetados para durar anos, mas sim décadas. Para isso, selecionamos apenas fornecedores globais que compartilham da nossa obsessão por qualidade.',
  execucao1:
    '1. Medida Fina e Vistoria: Após a aprovação do projeto, nossa equipe de engenharia realiza uma conferência milimétrica no local. Consideramos prumos, esquadros e infraestrutura existente para garantir encaixes perfeitos.\n\n2. Caderno Técnico: Desenvolvemos detalhamentos técnicos exaustivos para que a produção seja executada com zero margem de erro. Nada é deixado ao acaso.',
  execucao2:
    '3. Usinagem de Precisão: Em nossa fábrica, máquinas com controle numérico (CNC) cortam, furam e fitam cada peça com precisão absoluta, assegurando que o projeto virtual se materialize perfeitamente na realidade.\n\n4. Montagem e Entrega: Nossas equipes de instalação são formadas por artesãos especialistas, garantindo que o requinte planejado na fábrica seja perfeitamente instalado em seu ambiente.',
  pagamento:
    'A Bender Haussform oferece flexibilidade para viabilizar a execução do seu projeto de alto padrão.\n\nÀ Vista: Desconto de 5% sobre o valor total do investimento, via PIX ou Transferência Bancária.\n\nParcelado: Entrada de 40% para liberação do pedido de produção e o saldo dividido em até 6x sem juros no cartão de crédito, ou via boleto bancário sujeito à aprovação de crédito.',
  termos1:
    'Este documento constitui uma proposta preliminar. Os valores aqui expressos estão sujeitos à validação final após a Medida Fina presencial, onde variações de escopo ou dimensões reais poderão ensejar reajustes proporcionais.\n\nA aprovação desta proposta dá início à elaboração do Caderno Técnico e do Contrato de Fornecimento, que especificarão detalhadamente todos os acabamentos, ferragens, sistemas de abertura e cronogramas logísticos aplicáveis ao projeto.',
  termos2:
    'O prazo de entrega inicia-se a partir da assinatura do contrato e aprovação final do caderno técnico. Alterações de projeto solicitadas após esta fase implicarão em revisão de prazos e valores.',
  termos3:
    'A garantia legal e contratual dos produtos segue as diretrizes do código de defesa do consumidor, complementada pelo nosso manual de uso e conservação, entregue juntamente com os móveis.',
  termos4:
    'A preparação do ambiente (hidráulica, elétrica, gesso, pintura) deve estar concluída antes do início da montagem, sob pena de paralisação do cronograma e cobrança de visitas adicionais.',
}

export function PropostaComercial({ orcamento }: { orcamento: any }) {
  const [ambientes, setAmbientes] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const [textos, setTextos] = useState<any>(
    orcamento.textos_institucionais && Object.keys(orcamento.textos_institucionais).length > 0
      ? orcamento.textos_institucionais
      : DEFAULT_TEXTOS,
  )
  const [arquiteto, setArquiteto] = useState({
    nome: orcamento.arquiteto_nome || 'Nome do Arquiteto',
    bio:
      orcamento.arquiteto_bio ||
      'Breve biografia do arquiteto parceiro responsável por este projeto.',
    foto: orcamento.arquiteto_foto || 'https://img.usecurling.com/ppl/large?gender=female&seed=2',
  })

  const { toast } = useToast()

  const loadData = async () => {
    const { data } = await supabase
      .from('orcamentos_ambientes')
      .select('*, itens:orcamentos_itens(*)')
      .eq('orcamento_id', orcamento.id)
      .order('criado_em')
    setAmbientes(data || [])
  }

  useEffect(() => {
    loadData()
  }, [orcamento.id])

  const updateDescricao = (id: string, text: string) => {
    const updated = ambientes.map((a) => (a.id === id ? { ...a, descricao_comercial: text } : a))
    setAmbientes(updated)
  }

  const saveAll = async () => {
    setIsSaving(true)
    try {
      for (const amb of ambientes) {
        await supabase
          .from('orcamentos_ambientes')
          .update({ descricao_comercial: amb.descricao_comercial })
          .eq('id', amb.id)
      }

      await supabase
        .from('orcamentos_engenharia')
        .update({
          textos_institucionais: textos,
          arquiteto_nome: arquiteto.nome,
          arquiteto_bio: arquiteto.bio,
          arquiteto_foto: arquiteto.foto,
        })
        .eq('id', orcamento.id)

      toast({
        title: 'Dados Salvos',
        description: 'Textos, memórias descritivas e informações do arquiteto atualizados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const totalFinal = ambientes.reduce((acc, amb) => {
    return (
      acc +
      amb.itens.reduce((sum: number, i: any) => sum + i.quantidade * i.custo_unitario * i.markup, 0)
    )
  }, 0)

  const handleGeneratePdf = () => {
    toast({
      title: 'Gerando PDF de 14 páginas...',
      description: 'Aguarde, a proposta comercial está sendo processada.',
    })

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast({
        title: 'Erro',
        description: 'O bloqueador de pop-ups impediu a geração do PDF.',
        variant: 'destructive',
      })
      return
    }

    const formatHtmlText = (txt: string) => (txt ? txt.replace(/\n/g, '<br/>') : '')

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Proposta Comercial - ${orcamento.cliente_nome_manual || 'Cliente'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
        @page { size: A4; margin: 0; }
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #fff; color: #1a1a1a; -webkit-print-color-adjust: exact; }
        .page { width: 210mm; height: 297mm; page-break-after: always; box-sizing: border-box; position: relative; overflow: hidden; background: #faf9f7; }
        .page-dark { background: #121212; color: #f5f5f5; }
        .page-content { padding: 30mm 25mm; height: 100%; box-sizing: border-box; position: relative; }
        .center-content { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        
        h1 { font-family: 'Playfair Display', serif; font-weight: 400; font-size: 38px; letter-spacing: 4px; margin-bottom: 20px; color: #c4a15a; text-transform: uppercase; }
        h2 { font-family: 'Playfair Display', serif; font-weight: 400; font-size: 28px; letter-spacing: 2px; margin-bottom: 30px; color: #1a1a1a; }
        .page-dark h2 { color: #f5f5f5; }
        h3 { font-weight: 500; font-size: 16px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; color: #c4a15a; }
        
        p { font-size: 13px; line-height: 1.8; margin-bottom: 20px; font-weight: 300; color: #4a4a4a; text-align: justify; }
        .page-dark p { color: #d0d0d0; }
        
        .logo { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 600; letter-spacing: 8px; margin-bottom: 50px; color: #fff; }
        
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th { border-bottom: 1px solid #c4a15a; padding: 15px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #777; font-weight: 600; }
        .table td { border-bottom: 1px solid #e0e0e0; padding: 20px 10px; vertical-align: top; font-size: 12px; color: #333; line-height: 1.6; }
        .table .val { white-space: nowrap; text-align: right; font-weight: 600; color: #1a1a1a; }
        
        .total-box { margin-top: 40px; border-top: 1px solid #1a1a1a; padding-top: 20px; text-align: right; }
        .total-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #777; margin-bottom: 5px; }
        .total-val { font-size: 26px; font-weight: 600; color: #1a1a1a; font-family: 'Playfair Display', serif; }
        
        .footer { position: absolute; bottom: 15mm; left: 25mm; right: 25mm; display: flex; justify-content: space-between; font-size: 9px; color: #aaa; border-top: 1px solid #e0e0e0; padding-top: 8mm; text-transform: uppercase; letter-spacing: 1px; }
        .page-dark .footer { border-color: #333; color: #666; }
        
        .watermark { position: absolute; font-family: 'Playfair Display', serif; font-size: 150px; color: rgba(196, 161, 90, 0.03); top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); white-space: nowrap; pointer-events: none; }
        
        .arq-photo { width: 160px; height: 160px; border-radius: 50%; object-fit: cover; margin-bottom: 30px; border: 2px solid #c4a15a; padding: 4px; }
      </style>
    </head>
    <body>
      <!-- 01 -->
      <div class="page page-dark center-content">
        <div class="logo">BENDER</div>
        <h1>Proposta Comercial</h1>
        <p style="margin-top: 40px; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; text-align: center;">Projeto: ${orcamento.cliente_nome_manual || 'Cliente Final'}</p>
      </div>
      
      <!-- 02 -->
      <div class="page">
        <div class="page-content">
          <div class="watermark">BENDER</div>
          <h3>Nossa Essência</h3>
          <h2>Perfil Institucional</h2>
          <p>${formatHtmlText(textos.essencia)}</p>
          <div class="footer"><span>Bender Haussform</span><span>02</span></div>
        </div>
      </div>

      <!-- 03 -->
      <div class="page page-dark">
        <div class="page-content center-content">
          <h2 style="color: #c4a15a;">MANIFESTO DE DESIGN</h2>
          <p style="max-width: 500px; font-size: 18px; line-height: 2; text-align: center; font-family: 'Playfair Display', serif; font-style: italic;">
            ${formatHtmlText(textos.manifesto)}
          </p>
          <div class="footer"><span>Bender Haussform</span><span>03</span></div>
        </div>
      </div>

      <!-- 04 -->
      <div class="page">
        <div class="page-content">
          <h3>O Padrão Bender</h3>
          <h2>Excelência em cada detalhe</h2>
          <p>${formatHtmlText(textos.padrao)}</p>
          <div class="footer"><span>Bender Haussform</span><span>04</span></div>
        </div>
      </div>

      <!-- 05 -->
      <div class="page">
        <div class="page-content">
          <h3>Como trabalhamos</h3>
          <h2>Plano de Execução (1/2)</h2>
          <p>${formatHtmlText(textos.execucao1)}</p>
          <div class="footer"><span>Bender Haussform</span><span>05</span></div>
        </div>
      </div>

      <!-- 06 -->
      <div class="page">
        <div class="page-content">
          <h3>Como trabalhamos</h3>
          <h2>Plano de Execução (2/2)</h2>
          <p>${formatHtmlText(textos.execucao2)}</p>
          <div class="footer"><span>Bender Haussform</span><span>06</span></div>
        </div>
      </div>

      <!-- 07 ARQUITETO -->
      <div class="page">
        <div class="page-content center-content" style="padding-top: 40mm;">
          <img src="${arquiteto.foto}" class="arq-photo" alt="Arquiteto" onerror="this.style.display='none'"/>
          <h3 style="margin-bottom: 5px;">Projeto Autoral</h3>
          <h2 style="font-size: 32px; margin-bottom: 25px;">${arquiteto.nome}</h2>
          <p style="max-width: 500px; text-align: center; line-height: 1.9; font-size: 14px;">${formatHtmlText(arquiteto.bio)}</p>
          <div class="footer"><span>Bender Haussform</span><span>07</span></div>
        </div>
      </div>

      <!-- 08 ESCOPO COMERCIAL -->
      <div class="page">
        <div class="page-content">
          <h3>O seu projeto</h3>
          <h2>Escopo Comercial</h2>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 25%;">Ambiente</th>
                <th style="width: 55%;">Descrição Comercial</th>
                <th style="width: 20%; text-align: right;">Valor (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${ambientes
                .map((amb) => {
                  const ambVal = amb.itens.reduce(
                    (acc: number, i: any) => acc + i.quantidade * i.custo_unitario * i.markup,
                    0,
                  )
                  return `
                <tr>
                  <td><strong>Móvel Planejado</strong><br/><span style="color: #666;">${amb.nome}</span></td>
                  <td>${amb.descricao_comercial ? formatHtmlText(amb.descricao_comercial) : 'Mobiliário sob medida para o ambiente.'}</td>
                  <td class="val">${formatCurrency(ambVal)}</td>
                </tr>
              `
                })
                .join('')}
            </tbody>
          </table>
          <div class="total-box">
            <div class="total-title">Investimento Total Previsto</div>
            <div class="total-val">${formatCurrency(totalFinal)}</div>
          </div>
          <div class="footer"><span>Bender Haussform</span><span>08</span></div>
        </div>
      </div>

      <!-- 09 -->
      <div class="page">
        <div class="page-content">
          <h3>Pagamento</h3>
          <h2>Condições Comerciais</h2>
          <p>${formatHtmlText(textos.pagamento)}</p>
          <div class="footer"><span>Bender Haussform</span><span>09</span></div>
        </div>
      </div>

      <!-- 10 a 13 TERMOS -->
      ${[
        { t: textos.termos1, num: 10 },
        { t: textos.termos2, num: 11 },
        { t: textos.termos3, num: 12 },
        { t: textos.termos4, num: 13 },
      ]
        .map(
          (page) => `
      <div class="page">
        <div class="page-content">
          <h3>Informações Importantes</h3>
          <h2>Termos e Diretrizes (0${page.num - 9})</h2>
          <p>${formatHtmlText(page.t)}</p>
          <div class="footer"><span>Bender Haussform</span><span>${page.num}</span></div>
        </div>
      </div>
      `,
        )
        .join('')}

      <!-- 14 -->
      <div class="page page-dark center-content">
        <div class="logo" style="margin-bottom: 20px;">BENDER</div>
        <p style="font-family: 'Playfair Display', serif; font-size: 18px; letter-spacing: 2px;">Muito obrigado pela confiança.</p>
        <div class="footer"><span>Bender Haussform</span><span>14</span></div>
      </div>
    </body>
    </html>`

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 800)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold font-serif tracking-tight text-slate-800 dark:text-slate-100">
            Proposta Comercial
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure os textos da proposta e gere o PDF final para o cliente.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={saveAll} disabled={isSaving} className="min-w-[140px]">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Dados
          </Button>
          <Button
            onClick={handleGeneratePdf}
            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[200px] shadow-md"
          >
            <FileText className="w-4 h-4 mr-2" /> Gerar Proposta em PDF
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['ambientes']} className="space-y-4">
        <AccordionItem value="ambientes" className="bg-card border rounded-xl shadow-sm px-6 py-2">
          <AccordionTrigger className="hover:no-underline text-lg font-semibold">
            Memoriais Descritivos dos Ambientes
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/4 font-semibold uppercase tracking-wider text-xs">
                    Ambiente
                  </TableHead>
                  <TableHead className="w-1/2 font-semibold uppercase tracking-wider text-xs">
                    Descrição Comercial (Memorial)
                  </TableHead>
                  <TableHead className="w-1/4 text-right font-semibold uppercase tracking-wider text-xs">
                    Valor (R$)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ambientes.map((amb) => {
                  const subFinal = amb.itens.reduce(
                    (acc: number, i: any) => acc + i.quantidade * i.custo_unitario * i.markup,
                    0,
                  )

                  return (
                    <TableRow key={amb.id}>
                      <TableCell className="align-top pt-4">
                        <div className="font-serif font-semibold text-lg text-slate-800 dark:text-slate-200">
                          {amb.nome}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <Textarea
                          value={amb.descricao_comercial || ''}
                          onChange={(e) => updateDescricao(amb.id, e.target.value)}
                          placeholder="Descreva o mobiliário. Ex: Mobiliário planejado em MDF Louro Freijó..."
                          className="min-h-[120px] resize-y bg-background border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500"
                        />
                      </TableCell>
                      <TableCell className="align-top pt-4 text-right">
                        <span className="text-xl font-bold font-serif text-slate-800 dark:text-slate-200">
                          {formatCurrency(subFinal)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {ambientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum ambiente cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="arquiteto" className="bg-card border rounded-xl shadow-sm px-6 py-2">
          <AccordionTrigger className="hover:no-underline text-lg font-semibold">
            Página do Arquiteto
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Arquiteto</label>
                <Input
                  value={arquiteto.nome}
                  onChange={(e) => setArquiteto({ ...arquiteto, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL da Foto (Quadrada)</label>
                <Input
                  value={arquiteto.foto}
                  onChange={(e) => setArquiteto({ ...arquiteto, foto: e.target.value })}
                  placeholder="https://link-da-imagem.com/foto.jpg"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Biografia / Descrição</label>
                <Textarea
                  value={arquiteto.bio}
                  onChange={(e) => setArquiteto({ ...arquiteto, bio: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="institucional"
          className="bg-card border rounded-xl shadow-sm px-6 py-2"
        >
          <AccordionTrigger className="hover:no-underline text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Páginas Institucionais e Termos
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-600">
                  Pág 02 - Nossa Essência
                </label>
                <Textarea
                  value={textos.essencia}
                  onChange={(e) => setTextos({ ...textos, essencia: e.target.value })}
                  className="h-32"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-600">Pág 03 - Manifesto</label>
                <Textarea
                  value={textos.manifesto}
                  onChange={(e) => setTextos({ ...textos, manifesto: e.target.value })}
                  className="h-32"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-600">Pág 04 - Padrão Bender</label>
                <Textarea
                  value={textos.padrao}
                  onChange={(e) => setTextos({ ...textos, padrao: e.target.value })}
                  className="h-32"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-600">Pág 09 - Pagamento</label>
                <Textarea
                  value={textos.pagamento}
                  onChange={(e) => setTextos({ ...textos, pagamento: e.target.value })}
                  className="h-32"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-amber-600">
                  Pág 05 e 06 - Plano de Execução
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Textarea
                    value={textos.execucao1}
                    onChange={(e) => setTextos({ ...textos, execucao1: e.target.value })}
                    className="h-32"
                  />
                  <Textarea
                    value={textos.execucao2}
                    onChange={(e) => setTextos({ ...textos, execucao2: e.target.value })}
                    className="h-32"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2 mt-4">
                <h4 className="font-semibold text-lg border-b pb-2">
                  Termos e Diretrizes (Págs 10 a 13)
                </h4>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Textarea
                    value={textos.termos1}
                    onChange={(e) => setTextos({ ...textos, termos1: e.target.value })}
                    className="h-32"
                    placeholder="Termo 1"
                  />
                  <Textarea
                    value={textos.termos2}
                    onChange={(e) => setTextos({ ...textos, termos2: e.target.value })}
                    className="h-32"
                    placeholder="Termo 2"
                  />
                  <Textarea
                    value={textos.termos3}
                    onChange={(e) => setTextos({ ...textos, termos3: e.target.value })}
                    className="h-32"
                    placeholder="Termo 3"
                  />
                  <Textarea
                    value={textos.termos4}
                    onChange={(e) => setTextos({ ...textos, termos4: e.target.value })}
                    className="h-32"
                    placeholder="Termo 4"
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="bg-slate-900 text-slate-50 p-8 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-md gap-4">
        <div>
          <span className="block text-sm text-slate-400 uppercase tracking-widest mb-1">
            Investimento Total Previsto
          </span>
          <span className="text-xl font-serif text-amber-500">Valor Final do Cliente</span>
        </div>
        <span className="text-4xl font-bold font-serif text-white">
          {formatCurrency(totalFinal)}
        </span>
      </div>
    </div>
  )
}
