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
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function EstoqueCompras() {
  const [unreadListas, setUnreadListas] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('documentos_cliente')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'lista de materiais')
        .or('status.eq.pendente,status.eq.novo,status.is.null')

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
          filter: "tipo=eq.'lista de materiais'",
        },
        () => fetchUnread(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="pt-0 pb-6 px-6 animate-in fade-in duration-300 h-full flex flex-col">
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 w-full mt-0">
        <div className="flex flex-row items-center justify-between w-full bg-[#0A1931] text-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 mr-2">
              <PackageSearch className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Estoque & Compras</h2>
            </div>
            <TabsList className="bg-white/10 border-none h-9">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="solicitacoes"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Solicitações
              </TabsTrigger>
              <TabsTrigger
                value="estoque"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Inventário
              </TabsTrigger>
              <TabsTrigger
                value="listas-materiais"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 relative"
              >
                Listas de Materiais
                {unreadListas > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse">
                    {unreadListas}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="documentos"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Documentos & OCR
              </TabsTrigger>
              <TabsTrigger
                value="itens-cliente"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Itens de Cliente
              </TabsTrigger>
              <TabsTrigger
                value="separacao"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Separação
              </TabsTrigger>
              <TabsTrigger
                value="sobras"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Sobras
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap"></div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 min-h-0 w-full">
          <TabsContent value="overview" className="m-0 border-none outline-none">
            <EstoqueOverview />
          </TabsContent>
          <TabsContent value="solicitacoes" className="m-0 border-none outline-none">
            <SolicitacoesCompra />
          </TabsContent>
          <TabsContent value="estoque" className="m-0 border-none outline-none">
            <EstoqueLista />
          </TabsContent>
          <TabsContent value="listas-materiais" className="m-0 border-none outline-none">
            <ListasMateriais />
          </TabsContent>
          <TabsContent value="documentos" className="m-0 border-none outline-none space-y-8">
            <section>
              <h2 className="text-xl font-bold text-midnight-navy mb-4">
                Entrada de Mercadorias (NF/OCR)
              </h2>
              <ComprasOCR />
            </section>
            <section>
              <h2 className="text-xl font-bold text-midnight-navy mb-4">
                Lista de Materiais por projeto
              </h2>
              <ConciliacaoListas />
            </section>
          </TabsContent>
          <TabsContent value="itens-cliente" className="m-0 border-none outline-none">
            <ItensCliente />
          </TabsContent>
          <TabsContent value="separacao" className="m-0 border-none outline-none">
            <CaixasVirtuais />
          </TabsContent>
          <TabsContent value="sobras" className="m-0 border-none outline-none">
            <GestaoSobras />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
