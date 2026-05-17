import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateCardDialog } from './CreateCardDialog'

export function KanbanHeader({ title, searchQuery, setSearchQuery }: any) {
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

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-navy/40" />
          <Input
            placeholder="Buscar de forma unificada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-off-white border-steel-blue/20"
          />
        </div>
      </div>

      <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
