import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  ShoppingCart,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { createNewSaleForClient } from '@/services/vendas'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ComercialFormDados } from '@/components/comercial/form/ComercialFormDados'
import { ClienteDocumentos } from './cliente-documentos'
import { Timeline } from './timeline'
import { ClienteDeleteDialog } from './cliente-delete-dialog'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SaleItem {
  id: string
  criado_em: string
  status: string
  formulario: any
}

function computeSaleValue(form: any): number {
  if (!form) return 0
  const prods =
    typeof form.produtos_servicos === 'string'
      ? JSON.parse(form.produtos_servicos || '[]')
      : form.produtos_servicos || []
  if (!Array.isArray(prods)) return 0
  const subtotal = prods.reduce(
    (a: number, p: any) => a + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
    0,
  )
  return subtotal - (Number(form.desconto) || 0)
}

export function ClienteFolder({ dossieId, onBack }: { dossieId: string; onBack: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') || 'dados'
  const [dossie, setDossie] = useState<any>(null)
  const [sales, setSales] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingSale, setCreatingSale] = useState(false)
  const creatingSaleRef = useRef(false)

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      prev.set('tab', value)
      return prev
    })
  }

  const load = async () => {
    setLoading(true)
    try {
      // Load the selected dossiê (by id or cliente_id fallback)
      const { data } = await supabase
        .from('dossies')
        .select(`
          *,
          cliente:clientes(*),
          formulario:formulario_comercial(*)
        `)
        .or(`id.eq.${dossieId},cliente_id.eq.${dossieId}`)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

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

        // Load ALL sales (dossiês + formulários) for this client
        const { data: allDossies } = await supabase
          .from('dossies')
          .select(`
            id, criado_em, status, formulario_comercial_id,
            formulario:formulario_comercial(id, valor_total, desconto, produtos_servicos, datas, criado_em)
          `)
          .eq('cliente_id', data.cliente_id)
          .order('criado_em', { ascending: false })

        setSales((allDossies as any[]) || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [dossieId])

  const handleNovaVenda = async () => {
    if (!dossie?.cliente_id) return
    // Synchronous double-click guard — prevents creating two identical sales
    if (creatingSaleRef.current) return
    creatingSaleRef.current = true
    setCreatingSale(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) {
        toast.error('Usuário não autenticado.')
        return
      }

      const result = await createNewSaleForClient({
        clienteId: dossie.cliente_id,
        userId,
      })

      toast.success('Nova venda criada com sucesso!')
      // Navigate to the new sale's folder
      navigate(`/clientes/${result.dossieId}`)
    } catch (e: any) {
      toast.error('Erro ao criar nova venda: ' + e.message)
    } finally {
      creatingSaleRef.current = false
      setCreatingSale(false)
    }
  }

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando...</div>
  if (!dossie) return <div className="p-8 text-center text-destructive">Dossiê não encontrado.</div>

  const form = dossie.formulario || {}
  const valTot = computeSaleValue(form)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b pb-4 shrink-0">
        <div className="flex gap-4 items-center min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{dossie.cliente?.nome || '-'}</h1>
            <p className="text-muted-foreground text-sm">
              Vendedor: {dossie.vendedorNome} | Valor da Venda:{' '}
              {valTot > 0 ? formatCurrency(valTot) : '-'} | Data:{' '}
              {dossie.criado_em ? new Date(dossie.criado_em).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleNovaVenda} disabled={creatingSale} className="shrink-0">
            {creatingSale ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Nova Venda
          </Button>
          <ClienteDeleteDialog
            clienteId={dossie.cliente_id}
            clienteNome={dossie.cliente?.nome}
            onDeleted={() => {
              toast.success('Cliente excluído com sucesso.')
              navigate('/clientes')
            }}
            triggerClassName="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors font-medium text-sm"
            triggerVariant="button"
          />
        </div>
      </div>

      {/* Sales list — all independent sales for this client */}
      {sales.length > 1 && (
        <div className="shrink-0 bg-card border border-border rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2 px-1">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              Vendas deste cliente ({sales.length})
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sales.map((sale) => {
              const isActive = sale.id === dossie.id
              const saleValue = sale.formulario?.valor_total ?? computeSaleValue(sale.formulario)
              const dataVenda =
                (sale.formulario?.datas as any)?.data_venda ||
                sale.formulario?.criado_em ||
                sale.criado_em
              return (
                <button
                  key={sale.id}
                  onClick={() => navigate(`/clientes/${sale.id}`)}
                  className={cn(
                    'shrink-0 flex flex-col gap-1 px-3 py-2 rounded-lg border text-left min-w-[180px] transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-background border-border hover:border-primary/50 hover:bg-accent',
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <Calendar className="w-3 h-3" />
                    {dataVenda ? new Date(dataVenda).toLocaleDateString('pt-BR') : 'Sem data'}
                  </span>
                  <span className="text-sm font-bold">
                    {saleValue > 0 ? formatCurrency(saleValue) : '—'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] uppercase tracking-wider font-medium flex items-center gap-1',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {isActive ? 'Venda atual' : 'Abrir venda'}
                    {!isActive && <ChevronRight className="w-3 h-3" />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
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
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-0 bg-transparent h-full font-bold"
          >
            TIMELINE
          </TabsTrigger>
        </TabsList>
        <TabsContent value="dados" className="flex-1 overflow-y-auto mt-4 p-1">
          <ComercialFormDados dossie={dossie} onSaved={load} />
        </TabsContent>
        <TabsContent value="documentos" className="flex-1 overflow-y-auto mt-4 p-1">
          <ClienteDocumentos dossie={dossie} onReload={load} />
        </TabsContent>
        <TabsContent value="timeline" className="flex-1 overflow-y-auto mt-4 p-1">
          <Timeline
            clienteId={dossie.cliente_id}
            formularioId={dossie.formulario_comercial_id}
            saleCreatedAt={(dossie.formulario?.criado_em as string) || dossie.criado_em}
          />
        </TabsContent>{' '}
      </Tabs>
    </div>
  )
}
