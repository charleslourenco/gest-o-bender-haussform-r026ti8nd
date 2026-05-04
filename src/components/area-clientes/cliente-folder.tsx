import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ComercialFormDados } from '@/components/comercial/form/ComercialFormDados'
import { ClienteDocumentos } from './cliente-documentos'

export function ClienteFolder({ dossieId, onBack }: { dossieId: string; onBack: () => void }) {
  const [dossie, setDossie] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('dossies')
        .select(`
          *,
          cliente:clientes(*),
          formulario:formulario_comercial(*)
        `)
        .eq('id', dossieId)
        .single()

      if (data) {
        let vendedor = '-'
        if (data.user_id) {
          const { data: uData } = await supabase
            .from('users')
            .select('nome')
            .eq('id', data.user_id)
            .single()
          if (uData) vendedor = uData.nome
        }
        data.vendedorNome = vendedor
        setDossie(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [dossieId])

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando...</div>
  if (!dossie) return <div className="p-8 text-center text-destructive">Dossiê não encontrado.</div>

  const form = dossie.formulario

  let prods =
    typeof form?.produtos_servicos === 'string'
      ? JSON.parse(form.produtos_servicos || '[]')
      : form?.produtos_servicos || []
  const valTot = Array.isArray(prods)
    ? prods.reduce(
        (a: number, p: any) =>
          a + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
        0,
      ) - (Number(form?.desconto) || 0)
    : 0

  const isFormSaved = form && form.cpf && (form.datas as any)?.data_venda

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex gap-4 border-b pb-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{dossie.cliente?.nome || '-'}</h1>
          <p className="text-muted-foreground text-sm">
            Vendedor: {dossie.vendedorNome} | Valor da Venda:{' '}
            {valTot > 0
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valTot,
                )
              : '-'}{' '}
            | Data:{' '}
            {dossie.criado_em ? new Date(dossie.criado_em).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="shrink-0 w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-6">
          <TabsTrigger
            value="dados"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 bg-transparent h-full font-bold"
          >
            DADOS
          </TabsTrigger>
          <TabsTrigger
            value="documentos"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 bg-transparent h-full font-bold"
          >
            DOCUMENTOS
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dados" className="flex-1 overflow-y-auto mt-4 p-1">
          <ComercialFormDados dossie={dossie} onSaved={load} />
        </TabsContent>
        <TabsContent value="documentos" className="flex-1 overflow-y-auto mt-4 p-1">
          {!isFormSaved ? (
            <div className="p-12 text-center bg-muted/30 border-2 border-dashed border-steel-blue rounded-lg text-midnight-navy font-semibold">
              Preencha e salve os dados do cliente na aba Dados antes de gerar documentos.
            </div>
          ) : (
            <ClienteDocumentos dossie={dossie} onReload={load} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
