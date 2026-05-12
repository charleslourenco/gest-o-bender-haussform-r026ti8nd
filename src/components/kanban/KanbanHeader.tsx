import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateCardDialog } from './CreateCardDialog'

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
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4 p-6 bg-white border-b border-steel-blue/10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-midnight-navy">{title}</h2>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-steel-blue hover:bg-steel-blue/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Card Avulso
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-navy/40" />
          <Input
            placeholder="Buscar por nome, código ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-off-white border-steel-blue/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-midnight-navy/40" />
          <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
            <SelectTrigger className="w-[180px] bg-off-white border-steel-blue/20">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Responsáveis</SelectItem>
              <SelectItem value="unassigned">Não Atribuído</SelectItem>
              {uniqueAnalysts.map((id: string) => (
                <SelectItem key={id} value={id}>
                  {usersMap[id]?.nome || 'Desconhecido'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
            <SelectTrigger className="w-[180px] bg-off-white border-steel-blue/20">
              <SelectValue placeholder="Consultor" />
            </SelectTrigger>
            <SelectContent>
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

      <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
