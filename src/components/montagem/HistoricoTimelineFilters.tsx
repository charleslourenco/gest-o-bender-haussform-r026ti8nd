import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MontadorOption } from '@/services/historico-montagem'
import { HistoricoFiltros, DEFAULT_FILTROS } from './HistoricoFilters'

export function HistoricoTimelineFilters({
  montadores,
  filtros,
  onChange,
}: {
  montadores: MontadorOption[]
  filtros: HistoricoFiltros
  onChange: (filtros: HistoricoFiltros) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasActiveFilters =
    filtros.montador_id !== 'todos' ||
    filtros.data_inicio !== '' ||
    filtros.data_fim !== '' ||
    filtros.acao !== 'todos'

  if (!expanded && !hasActiveFilters) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(true)}
        className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
      >
        <Filter className="w-3 h-3 mr-1" />
        Filtrar
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="w-3 h-3" />
          Filtros do histórico
        </span>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(DEFAULT_FILTROS)}
              className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-0.5" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            Recolher
          </Button>
        </div>
      </div>
      <div className={cn('grid grid-cols-2 gap-2')}>
        <Select
          value={filtros.montador_id}
          onValueChange={(val) => onChange({ ...filtros, montador_id: val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Montador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os montadores</SelectItem>
            {montadores.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtros.acao} onValueChange={(val) => onChange({ ...filtros, acao: val })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as ações</SelectItem>
            <SelectItem value="alocado">Alocado</SelectItem>
            <SelectItem value="desalocado">Desalocado</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filtros.data_inicio}
          onChange={(e) => onChange({ ...filtros, data_inicio: e.target.value })}
          className="h-8 text-xs"
        />
        <Input
          type="date"
          value={filtros.data_fim}
          onChange={(e) => onChange({ ...filtros, data_fim: e.target.value })}
          className="h-8 text-xs"
        />
      </div>
    </div>
  )
}
