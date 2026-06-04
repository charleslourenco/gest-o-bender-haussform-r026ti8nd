import { useState } from 'react'
import { Plus, Search, FileSearch, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateCardDialog } from './CreateCardDialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function KanbanHeader({ title, searchQuery, setSearchQuery }: any) {
  const [activeTab, setActiveTab] = useState('kanban')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Specific header layout for Análise Técnica
  if (title === 'Análise Técnica') {
    return (
      <div className="w-full px-4 pt-0 mt-0">
        <div className="bg-[#0A1931] text-white px-4 py-3 mb-4 mt-0 rounded-md flex flex-row flex-nowrap items-center justify-between w-full whitespace-nowrap">
          {/* Left Side Group */}
          <div className="flex flex-row items-center gap-6">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Análise Técnica</h2>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="bg-white/10 border-none h-9">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-steel-blue data-[state=active]:text-white text-white/70"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="lista"
                  className="data-[state=active]:bg-steel-blue data-[state=active]:text-white text-white/70"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="indicadores"
                  className="data-[state=active]:bg-steel-blue data-[state=active]:text-white text-white/70"
                >
                  Indicadores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right Side Group */}
          <div className="flex flex-row items-center gap-4">
            <div className="relative w-48 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-9 w-full"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-steel-blue hover:bg-steel-blue/90 text-white h-9 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Card Avulso
            </Button>
          </div>

          <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>
    )
  }

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
