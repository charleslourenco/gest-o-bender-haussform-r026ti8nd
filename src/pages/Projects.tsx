import { useState } from 'react'
import { Plus, MoreVertical, Calendar, User, Search } from 'lucide-react'
import { useAppStore } from '@/stores/main'
import { Stage, Project } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STAGES: Stage[] = ['Medição', 'Projeto', 'Aprovação', 'Produção', 'Montagem', 'Finalizado']

export default function Projects() {
  const { projects, moveProject } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedProjectId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Small delay to allow the drag image to generate before adding opacity
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`)
      if (el) el.classList.add('opacity-50')
    }, 0)
  }

  const handleDragEnd = (id: string) => {
    setDraggedProjectId(null)
    const el = document.getElementById(`card-${id}`)
    if (el) el.classList.remove('opacity-50')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault()
    if (draggedProjectId) {
      moveProject(draggedProjectId, stage)
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'Urgente':
        return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'Alta':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      case 'Média':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie o fluxo de trabalho da fábrica via Kanban.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projeto..."
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> Novo Projeto
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar flex gap-6">
        {STAGES.map((stage) => {
          const columnProjects = filteredProjects.filter((p) => p.stage === stage)

          return (
            <div
              key={stage}
              className="flex flex-col min-w-[300px] w-[300px] bg-slate-100/50 rounded-xl border border-slate-200/60 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="p-3 border-b border-slate-200/60 bg-slate-100/80 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  {stage}
                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {columnProjects.length}
                  </span>
                </h3>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                {columnProjects.length === 0 ? (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                    <span className="text-sm text-muted-foreground text-center px-4">
                      Solte projetos aqui
                    </span>
                  </div>
                ) : (
                  columnProjects.map((project) => (
                    <Card
                      key={project.id}
                      id={`card-${project.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={() => handleDragEnd(project.id)}
                      className="cursor-grab active:cursor-grabbing shadow-sm border-slate-200 hover:border-primary/40 hover:shadow-md transition-all group bg-white"
                    >
                      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                        <div className="space-y-1 pr-2">
                          <h4 className="font-semibold text-sm leading-none text-secondary group-hover:text-primary transition-colors">
                            {project.name}
                          </h4>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <User className="h-3 w-3 mr-1" /> {project.client}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                            <DropdownMenuItem>Editar Projeto</DropdownMenuItem>
                            {stage !== 'Finalizado' && (
                              <DropdownMenuItem className="text-primary">
                                Avançar Etapa
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              getPriorityColor(project.priority),
                            )}
                          >
                            {project.priority}
                          </Badge>
                          {project.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 font-normal bg-slate-100 text-slate-600"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Progresso</span>
                            <span className="font-medium">{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-1.5" />
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground pt-1 border-t border-slate-100">
                          <Calendar className="h-3 w-3 mr-1.5 shrink-0" />
                          <span className="truncate">
                            Entrega: {new Date(project.deadline).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.5); }
      `,
        }}
      />
    </div>
  )
}
