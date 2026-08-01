import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsersRound } from 'lucide-react'
import { ListaCLT } from './gestao-pessoas/ListaCLT'
import { ListaPJ } from './gestao-pessoas/ListaPJ'
import { ListaFornecedores } from './gestao-pessoas/ListaFornecedores'
import { useParams } from 'react-router-dom'
import { PastaCLT } from './gestao-pessoas/PastaCLT'
import { PastaPJ } from './gestao-pessoas/PastaPJ'

export default function GestaoPessoas() {
  const { tipo, id } = useParams<{ tipo: string; id: string }>()

  if (tipo === 'clt' && id) {
    return <PastaCLT id={id === 'novo' ? null : id} />
  }

  if (tipo === 'pj' && id) {
    return <PastaPJ id={id === 'novo' ? null : id} />
  }

  return (
    <div className="pt-0 pb-6 px-6 h-full flex flex-col">
      <Tabs defaultValue="clt" className="flex-1 flex flex-col min-h-0 w-full mt-0">
        <div className="flex flex-row items-center justify-between w-full bg-midnight-navy text-off-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 mr-2">
              <UsersRound className="w-5 h-5 text-off-white" />
              <h2 className="text-lg font-bold text-off-white">Gestão de Pessoas</h2>
            </div>
            <TabsList className="bg-off-white/10 border-none h-9">
              <TabsTrigger
                value="clt"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white"
              >
                Time CLT
              </TabsTrigger>
              <TabsTrigger
                value="pj"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white"
              >
                Parceiros PJ
              </TabsTrigger>
              <TabsTrigger
                value="fornecedores"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white"
              >
                Fornecedores
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap"></div>
        </div>

        <TabsContent
          value="clt"
          className="m-0 flex-1 data-[state=inactive]:hidden flex-col flex min-h-0"
        >
          <ListaCLT />
        </TabsContent>
        <TabsContent
          value="pj"
          className="m-0 flex-1 data-[state=inactive]:hidden flex-col flex min-h-0"
        >
          <ListaPJ />
        </TabsContent>
        <TabsContent
          value="fornecedores"
          className="m-0 flex-1 data-[state=inactive]:hidden flex-col flex min-h-0"
        >
          <ListaFornecedores />
        </TabsContent>
      </Tabs>
    </div>
  )
}
