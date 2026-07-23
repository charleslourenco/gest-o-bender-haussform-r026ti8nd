import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'

export interface DivisaoRow {
  descricao: string
  valor: string
}

interface DivisoesRateioSectionProps {
  rows: DivisaoRow[]
  onChange: (rows: DivisaoRow[]) => void
  totalValor: number
}

export function DivisoesRateioSection({ rows, onChange, totalValor }: DivisoesRateioSectionProps) {
  const totalDivisoes = rows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
  const diff = totalValor - totalDivisoes
  const diffTolerance = 0.001

  function addRow() {
    onChange([...rows, { descricao: '', valor: '' }])
  }

  function updateRow(index: number, field: keyof DivisaoRow, value: string) {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    onChange(next)
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Divisões / Rateio</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-8">
          <Plus className="w-3 h-3 mr-1" /> Adicionar divisão
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma divisão adicionada. Opcional.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
            <span className="text-[11px] font-medium text-muted-foreground">Descrição</span>
            <span className="text-[11px] font-medium text-muted-foreground">Valor (R$)</span>
            <span />
          </div>
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_140px_32px] gap-2 items-center">
              <Input
                value={row.descricao}
                onChange={(e) => updateRow(index, 'descricao', e.target.value)}
                placeholder="Ex: Ajuda de custo"
                className="h-9"
              />
              <CurrencyInput
                value={row.valor}
                onValueChange={(val: number | string) =>
                  updateRow(index, 'valor', val ? val.toString() : '')
                }
                placeholder="R$ 0,00"
                className="h-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                onClick={() => removeRow(index)}
                title="Remover divisão"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-1 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total das divisões:</span>
            <span className="font-semibold">{formatCurrency(totalDivisoes)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor da conta:</span>
            <span className="font-semibold">{formatCurrency(totalValor)}</span>
          </div>
          <div
            className={`flex justify-between text-sm font-medium ${
              Math.abs(diff) <= diffTolerance ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            <span>Diferença:</span>
            <span>{formatCurrency(diff)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
