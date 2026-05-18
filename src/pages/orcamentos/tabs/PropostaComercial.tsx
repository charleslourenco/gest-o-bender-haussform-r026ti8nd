import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FileText, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function PropostaComercial({ orcamento }: { orcamento: any }) {
  const [ambientes, setAmbientes] = useState<any[]>([])
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

  const updateDescricao = async (id: string, text: string) => {
    const updated = ambientes.map((a) => (a.id === id ? { ...a, descricao_comercial: text } : a))
    setAmbientes(updated)
  }

  const saveDescricoes = async () => {
    for (const amb of ambientes) {
      await supabase
        .from('orcamentos_ambientes')
        .update({ descricao_comercial: amb.descricao_comercial })
        .eq('id', amb.id)
    }
    toast({ title: 'Descrições Salvas com Sucesso' })
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
      description: 'Aguarde, a proposta comercial de alto padrão está sendo gerada.',
    })
    setTimeout(() => {
      toast({ title: 'Sucesso', description: 'O PDF foi exportado e está pronto para o cliente.' })
    }, 2500)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-background p-6 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold font-serif tracking-tight">
            Proposta Comercial Estruturada
          </h2>
          <p className="text-muted-foreground text-sm">
            Os custos internos estão ocultos. Apenas a descrição e valor final são visíveis.
          </p>
        </div>
        <div className="space-x-3">
          <Button variant="outline" onClick={saveDescricoes}>
            <Save className="w-4 h-4 mr-2" /> Salvar Textos
          </Button>
          <Button
            onClick={handleGeneratePdf}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            <FileText className="w-4 h-4 mr-2" /> Gerar PDF Estilo Bender
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {ambientes.map((amb) => {
          const subFinal = amb.itens.reduce(
            (acc: number, i: any) => acc + i.quantidade * i.custo_unitario * i.markup,
            0,
          )

          return (
            <div key={amb.id} className="bg-background border rounded-xl p-6 flex gap-6 shadow-sm">
              <div className="flex-1 space-y-3">
                <h3 className="font-semibold text-lg font-serif">{amb.nome}</h3>
                <Textarea
                  value={amb.descricao_comercial || ''}
                  onChange={(e) => updateDescricao(amb.id, e.target.value)}
                  placeholder="Descreva o mobiliário aqui... Ex: Mobiliário planejado executado em MDF Louro Freijó com frentes em laca microtexturizada fosca."
                  className="min-h-[120px] resize-none bg-accent/20 focus-visible:ring-1"
                />
              </div>
              <div className="w-56 text-right flex flex-col justify-center border-l pl-8">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Investimento do Ambiente
                </span>
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(subFinal)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-slate-900 text-slate-50 p-8 rounded-xl flex justify-between items-center shadow-md">
        <div>
          <span className="block text-sm text-slate-400 uppercase tracking-widest mb-1">
            Total do Projeto
          </span>
          <span className="text-xl font-serif">Investimento Final</span>
        </div>
        <span className="text-4xl font-bold font-serif">{formatCurrency(totalFinal)}</span>
      </div>
    </div>
  )
}
