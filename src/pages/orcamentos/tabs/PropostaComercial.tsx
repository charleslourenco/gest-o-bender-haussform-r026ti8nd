import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FileText, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function PropostaComercial({ orcamento }: { orcamento: any }) {
  const [ambientes, setAmbientes] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
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

  const saveDescricoes = async () => {
    setIsSaving(true)
    try {
      for (const amb of ambientes) {
        await supabase
          .from('orcamentos_ambientes')
          .update({ descricao_comercial: amb.descricao_comercial })
          .eq('id', amb.id)
      }
      toast({
        title: 'Descrições Comerciais Salvas',
        description: 'Memoriais descritivos atualizados com sucesso.',
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
      description: 'Aguarde, a proposta comercial de alto padrão está sendo processada.',
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

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Proposta Comercial - Bender Haussform</title>
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
      </style>
    </head>
    <body>
      <div class="page page-dark center-content">
        <div class="logo">BENDER</div>
        <h1>Proposta Comercial</h1>
        <p style="margin-top: 40px; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">Apresentação de Projeto de Interiores</p>
      </div>
      
      <div class="page">
        <div class="page-content">
          <div class="watermark">BENDER</div>
          <h3>Nossa Essência</h3>
          <h2>Perfil Institucional</h2>
          <p>A Bender Haussform transcende o conceito tradicional de fábrica de móveis. Atuamos como um estúdio de design e engenharia onde a precisão alemã encontra a sensibilidade arquitetônica brasileira. Nossa vocação é transformar matérias-primas nobres em espaços de vivência excepcionais.</p>
          <p>Com um parque fabril de vanguarda localizado em Balneário Piçarras, Santa Catarina, detemos controle absoluto sobre cada etapa do processo — desde a seleção criteriosa dos insumos até a montagem milimétrica no seu ambiente.</p>
          <div class="footer"><span>Bender Haussform</span><span>02</span></div>
        </div>
      </div>

      <div class="page page-dark">
        <div class="page-content center-content">
          <h2 style="color: #c4a15a;">MANIFESTO DE DESIGN</h2>
          <p style="max-width: 500px; font-size: 18px; line-height: 2; text-align: center; font-family: 'Playfair Display', serif; font-style: italic;">
            "Acreditamos que o espaço que você habita molda a forma como você vive. Não construímos apenas móveis; construímos a infraestrutura para as suas melhores memórias."
          </p>
          <div class="footer"><span>Bender Haussform</span><span>03</span></div>
        </div>
      </div>

      <div class="page">
        <div class="page-content">
          <h3>O Padrão Bender</h3>
          <h2>Excelência em cada detalhe</h2>
          <p>Nosso design é pautado pelo minimalismo funcional. Cada linha, cada junção e cada acabamento tem um propósito claro. Rejeitamos o excesso em favor da sofisticação atemporal.</p>
          <p>Acreditamos na durabilidade. Nossos móveis não são projetados para durar anos, mas sim décadas. Para isso, selecionamos apenas fornecedores globais que compartilham da nossa obsessão por qualidade.</p>
          <div class="footer"><span>Bender Haussform</span><span>04</span></div>
        </div>
      </div>

      <div class="page">
        <div class="page-content">
          <h3>Como trabalhamos</h3>
          <h2>Plano de Execução</h2>
          <p><strong>1. Medida Fina e Vistoria:</strong> Após a aprovação do projeto, nossa equipe de engenharia realiza uma conferência milimétrica no local. Consideramos prumos, esquadros e infraestrutura existente para garantir encaixes perfeitos.</p>
          <p><strong>2. Caderno Técnico:</strong> Desenvolvemos detalhamentos técnicos exaustivos para que a produção seja executada com zero margem de erro. Nada é deixado ao acaso.</p>
          <div class="footer"><span>Bender Haussform</span><span>05</span></div>
        </div>
      </div>

      <div class="page">
        <div class="page-content">
          <h3>Como trabalhamos</h3>
          <h2>Plano de Execução</h2>
          <p><strong>3. Usinagem de Precisão:</strong> Em nossa fábrica, máquinas com controle numérico (CNC) cortam, furam e fitam cada peça com precisão absoluta, assegurando que o projeto virtual se materialize perfeitamente na realidade.</p>
          <p><strong>4. Montagem e Entrega:</strong> Nossas equipes de instalação são formadas por artesãos especialistas, garantindo que o requinte planejado na fábrica seja perfeitamente instalado em seu ambiente.</p>
          <div class="footer"><span>Bender Haussform</span><span>06</span></div>
        </div>
      </div>

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
                  <td>${amb.descricao_comercial ? amb.descricao_comercial.replace(/\n/g, '<br/>') : 'Mobiliário sob medida para o ambiente.'}</td>
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
          <div class="footer"><span>Bender Haussform</span><span>07</span></div>
        </div>
      </div>

      <div class="page">
        <div class="page-content">
          <h3>Pagamento</h3>
          <h2>Condições Comerciais</h2>
          <p>A Bender Haussform oferece flexibilidade para viabilizar a execução do seu projeto de alto padrão.</p>
          <p><strong>À Vista:</strong> Desconto de 5% sobre o valor total do investimento, via PIX ou Transferência Bancária.</p>
          <p><strong>Parcelado:</strong> Entrada de 40% para liberação do pedido de produção e o saldo dividido em até 6x sem juros no cartão de crédito, ou via boleto bancário sujeito à aprovação de crédito.</p>
          <div class="footer"><span>Bender Haussform</span><span>08</span></div>
        </div>
      </div>

      ${[9, 10, 11, 12, 13]
        .map(
          (pageNum) => `
      <div class="page">
        <div class="page-content">
          <h3>Informações Importantes</h3>
          <h2>Termos e Diretrizes (0${pageNum - 8})</h2>
          <p>Este documento constitui uma proposta preliminar. Os valores aqui expressos estão sujeitos à validação final após a Medida Fina presencial, onde variações de escopo ou dimensões reais poderão ensejar reajustes proporcionais.</p>
          <p>A aprovação desta proposta dá início à elaboração do Caderno Técnico e do Contrato de Fornecimento, que especificarão detalhadamente todos os acabamentos, ferragens, sistemas de abertura e cronogramas logísticos aplicáveis ao projeto.</p>
          <div class="footer"><span>Bender Haussform</span><span>${pageNum < 10 ? '0' + pageNum : pageNum}</span></div>
        </div>
      </div>
      `,
        )
        .join('')}

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
            Proposta Comercial (Cliente Final)
          </h2>
          <p className="text-muted-foreground mt-1">
            Preencha os memoriais descritivos. Os valores são sincronizados automaticamente com o
            Orçamento Interno.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={saveDescricoes}
            disabled={isSaving}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Textos
          </Button>
          <Button
            onClick={handleGeneratePdf}
            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[200px] shadow-md"
          >
            <FileText className="w-4 h-4 mr-2" /> Gerar Proposta em PDF
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-1/4 font-semibold uppercase tracking-wider text-xs">
                Item / Ambiente
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
                      Móvel Planejado
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{amb.nome}</div>
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
                  Nenhum ambiente cadastrado. Volte à Aba de Orçamento Interno para adicionar
                  ambientes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
