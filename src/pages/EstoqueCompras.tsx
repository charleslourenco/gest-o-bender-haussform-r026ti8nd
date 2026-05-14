import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PackageSearch } from 'lucide-react'
import { EstoqueOverview } from '@/components/estoque/EstoqueOverview'
import { EstoqueLista } from '@/components/estoque/EstoqueLista'
import { ComprasOCR } from '@/components/estoque/ComprasOCR'
import { ConciliacaoListas } from '@/components/estoque/ConciliacaoListas'
import { SolicitacoesCompra } from '@/components/estoque/SolicitacoesCompra'
import { ItensCliente } from '@/components/estoque/ItensCliente'

export default function EstoqueCompras() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <PackageSearch className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-[32px] font-bold text-off-white">Estoque & Compras</h1>
          <p className="text-pale-cornflower mt-1">
            Gestão inteligente de suprimentos e conciliação de notas
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start bg-white p-1 border-b rounded-none shrink-0 overflow-x-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="estoque">Inventário</TabsTrigger>
          <TabsTrigger value="compras">Pedidos & OCR</TabsTrigger>
          <TabsTrigger value="listas">Listas & Conciliação</TabsTrigger>
          <TabsTrigger value="itens-cliente">Itens de Cliente</TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto mt-4 pb-20">
          <TabsContent value="overview" className="m-0 border-none outline-none">
            <EstoqueOverview />
          </TabsContent>
          <TabsContent value="solicitacoes" className="m-0 border-none outline-none">
            <SolicitacoesCompra />
          </TabsContent>
          <TabsContent value="estoque" className="m-0 border-none outline-none">
            <EstoqueLista />
          </TabsContent>
          <TabsContent value="compras" className="m-0 border-none outline-none">
            <ComprasOCR />
          </TabsContent>
          <TabsContent value="listas" className="m-0 border-none outline-none">
            <ConciliacaoListas />
          </TabsContent>
          <TabsContent value="itens-cliente" className="m-0 border-none outline-none">
            <ItensCliente />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
