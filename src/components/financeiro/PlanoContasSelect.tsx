import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  fetchPlanoContas,
  PlanoContaItem,
  NaturezaPlanoContas,
  NATUREZA_LABELS,
  NATUREZA_COLORS,
} from '@/services/plano-contas'

interface PlanoContasSelectProps {
  value: string | null | undefined
  onChange: (item: PlanoContaItem | null) => void
  naturezaFilter?: NaturezaPlanoContas | NaturezaPlanoContas[]
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

export function PlanoContasSelect({
  value,
  onChange,
  naturezaFilter,
  placeholder = 'Selecione uma categoria contábil...',
  className,
  id,
  disabled = false,
}: PlanoContasSelectProps) {
  const [items, setItems] = useState<PlanoContaItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPlanoContas(false)
      .then(({ data }) => {
        if (!cancelled && data) {
          let list = data
          if (naturezaFilter) {
            const filters = Array.isArray(naturezaFilter) ? naturezaFilter : [naturezaFilter]
            list = list.filter((i) => filters.includes(i.natureza as NaturezaPlanoContas))
          }
          setItems(list)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [Array.isArray(naturezaFilter) ? naturezaFilter.join(',') : naturezaFilter])

  const selectedItem = items.find((i) => i.id === value) || null

  const handleValueChange = (newVal: string) => {
    if (newVal === 'none') {
      onChange(null)
    } else {
      const found = items.find((i) => i.id === newVal) || null
      onChange(found)
    }
  }

  return (
    <Select
      value={value || 'none'}
      onValueChange={handleValueChange}
      disabled={disabled || loading}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={loading ? 'Carregando plano de contas...' : placeholder}>
          {selectedItem ? (
            <div className="flex items-center gap-2 truncate">
              {selectedItem.codigo && (
                <span className="font-mono text-xs opacity-70">{selectedItem.codigo}</span>
              )}
              <span className="truncate">{selectedItem.nome}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-normal ml-auto shrink-0 ${
                  NATUREZA_COLORS[selectedItem.natureza as NaturezaPlanoContas]?.badge || ''
                }`}
              >
                {NATUREZA_LABELS[selectedItem.natureza as NaturezaPlanoContas] ||
                  selectedItem.natureza}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="none">
          <span className="text-muted-foreground italic">Nenhuma categoria vinculada</span>
        </SelectItem>
        {items.map((item) => {
          const nat = item.natureza as NaturezaPlanoContas
          const color = NATUREZA_COLORS[nat]
          const label = NATUREZA_LABELS[nat] || item.natureza

          return (
            <SelectItem key={item.id} value={item.id} className="py-2">
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2 truncate">
                  {item.codigo && (
                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                      {item.codigo}
                    </span>
                  )}
                  <span className="font-medium text-sm truncate">{item.nome}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${color?.badge || ''}`}
                >
                  {label}
                </Badge>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
