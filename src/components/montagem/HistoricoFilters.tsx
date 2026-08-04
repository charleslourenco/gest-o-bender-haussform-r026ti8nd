import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'
import { MontadorOption } from '@/services/historico-montagem'

export interface HistoricoFiltros {
  montador_id: string
  data_inicio: string
  data_fim: string
  acao: string
}

export const DEFAULT_FILTROS: HistoricoFiltros = {
  montador_id: 'todos',
  data_inicio: '',
  data_fim: '',
  acao: 'todos',
}

export function HistoricoFilters({
  filtros,
  onChange,
  montadores,
  onClear,
  compact = false,
}: {
  filtros: HistoricoFiltros
  onChange: (filtros: HistoricoFiltros) => void
  montadores: MontadorOption[]
  onClear: () => void
  compact?: boolean
}) {
  const hasActiveFilters =
    filtros.montador_id !== 'todos' ||
    filtros.data_inicio !== '' ||
    filtros.data_fim !== '' ||
    filtros.acao !== 'todos'

  return (
    <div className={compact ? 'space-y-2' : 'flex flex-wrap items-end gap-3'}>
      <div className={compact ? 'space-y-1' : 'space-y-1'}>
        <Label className="text-xs text-muted-foreground">Montador</Label>
        <Select
          value={filtros.montador_id}
          onValueChange={(val) => onChange({ ...filtros, montador_id: val })}
        >
          <SelectTrigger className={compact ? 'h-8 w-full' : 'h-9 w-[200px]'}>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {montadores.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={compact ? 'space-y-1' : 'space-y-1'}>
        <Label className="text-xs text-muted-foreground">Data Início</Label>
        <Input
          type="date"
          value={filtros.data_inicio}
          onChange={(e) => onChange({ ...filtros, data_inicio: e.target.value })}
          className={compact ? 'h-8 w-full' : 'h-9 w-[160px]'}
        />
      </div>

      <div className={compact ? 'space-y-1' : 'space-y-1'}>
        <Label className="text-xs text-muted-foreground">Data Fim</Label>
        <Input
          type="date"
          value={filtros.data_fim}
          onChange={(e) => onChange({ ...filtros, data_fim: e.target.value })}
          className={compact ? 'h-8 w-full' : 'h-9 w-[160px]'}
        />
      </div>

      <div className={compact ? 'space-y-1' : 'space-y-1'}>
        <Label className="text-xs text-muted-foreground">Ação</Label>
        <Select value={filtros.acao} onValueChange={(val) => onChange({ ...filtros, acao: val })}>
          <SelectTrigger className={compact ? 'h-8 w-full' : 'h-9 w-[160px]'}>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="alocado">Alocado</SelectItem>
            <SelectItem value="desalocado">Desalocado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

export const applyFiltros = <T extends { montador_id: string; criado_em: string; acao: string }>(
  records: T[],
  filtros: HistoricoFiltros,
): T[] => {
  return records.filter((r) => {
    if (filtros.montador_id !== 'todos' && r.montador_id !== filtros.montador_id) return false
    if (filtros.acao !== 'todos' && r.acao !== filtros.acao) return false
    if (filtros.data_inicio) {
      const recordDate = new Date(r.criado_em)
      const startDate = new Date(filtros.data_inicio + 'T00:00:00')
      if (recordDate < startDate) return false
    }
    if (filtros.data_fim) {
      const recordDate = new Date(r.criado_em)
      const endDate = new Date(filtros.data_fim + 'T23:59:59')
      if (recordDate > endDate) return false
    }
    return true
  })
}
