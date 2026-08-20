import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PackageSearch } from 'lucide-react'
import { EstoqueOverview } from '@/components/estoque/EstoqueOverview'
import { EstoqueLista } from '@/components/estoque/EstoqueLista'
import { ComprasOCR } from '@/components/estoque/ComprasOCR'
import { ConciliacaoListas } from '@/components/estoque/ConciliacaoListas'
import { SolicitacoesCompra } from '@/components/estoque/SolicitacoesCompra'
import { ItensCliente } from '@/components/estoque/ItensCliente'
import { CaixasVirtuais } from '@/components/estoque/CaixasVirtuais'
import { GestaoSobras } from '@/components/estoque/GestaoSobras'
import { ListasMateriais } from '@/components/estoque/ListasMateriais'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function EstoqueCompras() {
  const [unreadListas, setUnreadListas] = useState(0)
  const [pendingSolicitacoes, setPendingSolicitacoes] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('documentos_cliente')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'lista_materiais')
        .or('status.eq.Pendente,status.is.null')

      setUnreadListas(count || 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('documentos_changes_unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_cliente',
          filter: 'tipo=eq.lista_materiais',
        },
        () => fetchUnread(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPendingSolicitacoes = useCallback(async () => {
    const { count } = await supabase
      .from('solicitacoes_compra')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pendente')
      .eq('arquivado', false)

    setPendingSolicitacoes(count || 0)
  }, [])

  useEffect(() => {
    fetchPendingSolicitacoes()

    const channel = supabase
      .channel('solicitacoes_compra_pending_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitacoes_compra',
        },
        () => fetchPendingSolicitacoes(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPendingSolicitacoes])

  return (
    <div className="pt-0 pb-6 px-6 animate-in fade-in duration-300 h-full flex flex-col">
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 w-full mt-0">
        <div className="flex flex-row items-center justify-between w-full bg-midnight-navy text-off-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 mr-2">
              <PackageSearch className="w-5 h-5 text-off-white" />
              <h2 className="text-lg font-bold text-off-white">Estoque & Compras</h2>
            </div>
            <TabsList className="bg-off-white/10 border-none h-9">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="solicitacoes"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60 relative"
              >
                Solicitações
                {pendingSolicitacoes > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-off-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse">
                    {pendingSolicitacoes}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="estoque"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Inventário
              </TabsTrigger>
              <TabsTrigger
                value="listas-materiais"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60 relative"
              >
                Listas de Materiais
                {unreadListas > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-off-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse">
                    {unreadListas}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="documentos"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Documentos & OCR
              </TabsTrigger>
              <TabsTrigger
                value="itens-cliente"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Itens de Cliente
              </TabsTrigger>
              <TabsTrigger
                value="separacao"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Separação
              </TabsTrigger>
              <TabsTrigger
                value="sobras"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Sobras
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap"></div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 w-full relative">
          <TabsContent
            value="overview"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <EstoqueOverview />
          </TabsContent>
          <TabsContent
            value="solicitacoes"
            className="m-0 border-none outline-none h-full flex flex-col overflow-hidden"
          >
            <SolicitacoesCompra onDataChange={fetchPendingSolicitacoes} />
          </TabsContent>
          <TabsContent
            value="estoque"
            className="m-0 border-none outline-none h-full flex flex-col overflow-hidden"
          >
            <EstoqueLista />
          </TabsContent>
          <TabsContent
            value="listas-materiais"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <ListasMateriais />
          </TabsContent>
          <TabsContent
            value="documentos"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20 space-y-8"
          >
            <section>
              <h2 className="text-xl font-bold text-midnight-navy dark:text-slate-100 mb-4">
                Entrada de Mercadorias (NF/OCR)
              </h2>
              <ComprasOCR />
            </section>
            <section>
              <h2 className="text-xl font-bold text-midnight-navy dark:text-slate-100 mb-4">
                Lista de Materiais por projeto
              </h2>
              <ConciliacaoListas />
            </section>
          </TabsContent>
          <TabsContent
            value="itens-cliente"
            className="m-0 border-none outline-none h-full flex flex-col overflow-hidden"
          >
            <ItensCliente />
          </TabsContent>
          <TabsContent
            value="separacao"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <CaixasVirtuais />
          </TabsContent>
          <TabsContent
            value="sobras"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <GestaoSobras />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
