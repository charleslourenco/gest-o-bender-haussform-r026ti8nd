import { useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function KanbanHeader({
  title,
  searchQuery,
  setSearchQuery,
  selectedAnalyst,
  setSelectedAnalyst,
  selectedConsultant,
  setSelectedConsultant,
  uniqueAnalysts,
  uniqueConsultants,
  usersMap,
}: any) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [novoCard, setNovoCard] = useState({
    nome_produto: '',
    qtd: 1,
    descricao: '',
  })
  const { toast } = useToast()

  const handleCreateCard = async () => {
    if (!novoCard.nome_produto) {
      toast({
        title: 'Atenção',
        description: 'O nome do produto é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const codigoRastreio = `AVULSO-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`

      let status = 'iniciar'
      if (title === 'Produção') status = 'aguardando_plano_corte'
      if (title === 'Montagem') status = 'aguardando_agenda'

      const { error } = await supabase.from('produtos_servicos_projeto').insert({
        nome_produto: novoCard.nome_produto,
        qtd: novoCard.qtd,
        descricao: novoCard.descricao,
        valor_unitario: 0,
        valor_total: 0,
        status_analise: status,
        codigo_rastreio: codigoRastreio,
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Card avulso criado com sucesso.',
      })

      setIsModalOpen(false)
      setNovoCard({ nome_produto: '', qtd: 1, descricao: '' })

      // Attempt to trigger a kanban refresh locally if it's listening
      window.dispatchEvent(new Event('kanban_updated'))
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar card avulso.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 pb-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-pale-cornflower">{title}</h1>

        <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
          <SheetTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Criar Card Avulso
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Criar Novo Card ({title})</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label htmlFor="nome_produto">Nome do Item/Produto *</Label>
                <Input
                  id="nome_produto"
                  value={novoCard.nome_produto}
                  onChange={(e) => setNovoCard({ ...novoCard, nome_produto: e.target.value })}
                  placeholder="Ex: Armário Cozinha"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qtd">Quantidade</Label>
                <Input
                  id="qtd"
                  type="number"
                  min="1"
                  value={novoCard.qtd}
                  onChange={(e) => setNovoCard({ ...novoCard, qtd: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição / Observações</Label>
                <Input
                  id="descricao"
                  value={novoCard.descricao}
                  onChange={(e) => setNovoCard({ ...novoCard, descricao: e.target.value })}
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCard} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-blue" />
          <Input
            placeholder="Buscar por produto, cliente ou código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-dark-denim border-steel-blue text-off-white placeholder:text-steel-blue/70"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-steel-blue" />
          <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
            <SelectTrigger className="w-[200px] bg-dark-denim border-steel-blue text-off-white">
              <SelectValue placeholder="Filtrar Responsável" />
            </SelectTrigger>
            <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unassigned">Não atribuídos</SelectItem>
              {uniqueAnalysts.map((id: string) => (
                <SelectItem key={id} value={id}>
                  {usersMap[id]?.nome || 'Desconhecido'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
            <SelectTrigger className="w-[200px] bg-dark-denim border-steel-blue text-off-white">
              <SelectValue placeholder="Filtrar Consultor" />
            </SelectTrigger>
            <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
              <SelectItem value="all">Todos os Consultores</SelectItem>
              {uniqueConsultants.map((id: string) => (
                <SelectItem key={id} value={id}>
                  {usersMap[id]?.nome || 'Desconhecido'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
