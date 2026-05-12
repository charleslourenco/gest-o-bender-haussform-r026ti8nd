import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter } from 'lucide-react'

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
  return (
    <div className="p-6 pb-2">
      <h1 className="text-2xl font-bold text-pale-cornflower mb-6">{title}</h1>
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
