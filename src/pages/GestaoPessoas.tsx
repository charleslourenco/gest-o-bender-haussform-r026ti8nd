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
    <div className="h-full flex flex-col p-6 space-y-6 bg-off-white">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <UsersRound className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-off-white font-bold text-[32px]">Gestão de Pessoas</h1>
          <p className="text-pale-cornflower mt-1">
            Gestão de equipe, parceiros e controle de férias
          </p>
        </div>
      </div>

      <Tabs defaultValue="clt" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit mb-4">
          <TabsTrigger value="clt">Time CLT</TabsTrigger>
          <TabsTrigger value="pj">Parceiros PJ</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>
        <TabsContent
          value="clt"
          className="flex-1 data-[state=inactive]:hidden flex-col flex min-h-0"
        >
          <ListaCLT />
        </TabsContent>
        <TabsContent
          value="pj"
          className="flex-1 data-[state=inactive]:hidden flex-col flex min-h-0"
        >
          <ListaPJ />
        </TabsContent>
        <TabsContent
          value="fornecedores"
          className="flex-1 data-[state=inactive]:hidden flex-col flex min-h-0"
        >
          <ListaFornecedores />
        </TabsContent>
      </Tabs>
    </div>
  )
}
