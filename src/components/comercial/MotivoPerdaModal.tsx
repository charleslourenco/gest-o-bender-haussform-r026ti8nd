import { useState, useId } from 'react'
import { Lead } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { MOTIVOS_PERDA, cleanColumnTitle } from './constants'

export interface MotivoPerdaConfirmData {
  motivo_perda: string
  etapa_perda: string
}

interface MotivoPerdaModalProps {
  open: boolean
  lead: Lead | null
  targetStatus: string
  etapaAnterior: string
  onClose: () => void
  onConfirm: (data: MotivoPerdaConfirmData) => void | Promise<void>
}

export function MotivoPerdaModal({
  open,
  lead,
  targetStatus,
  etapaAnterior,
  onClose,
  onConfirm,
}: MotivoPerdaModalProps) {
  const [motivoSelect, setMotivoSelect] = useState<string>('')
  const [outroTexto, setOutroTexto] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const motivoSelectId = useId()
  const outroTextoId = useId()

  const etapaLimpa = cleanColumnTitle(etapaAnterior) || etapaAnterior || 'Etapa inicial'
  const isOutro = motivoSelect === 'Outro'

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      setError('')
      setMotivoSelect('')
      setOutroTexto('')
      onClose()
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')

    if (!motivoSelect) {
      setError('Selecione obrigatoriamente o motivo da perda.')
      return
    }
    if (isOutro && !outroTexto.trim()) {
      setError('Descreva o motivo da perda no campo de texto.')
      return
    }

    const motivoFinal = isOutro ? outroTexto.trim() : motivoSelect

    try {
      setIsSubmitting(true)
      await onConfirm({
        motivo_perda: motivoFinal,
        etapa_perda: etapaLimpa,
      })
      // Reset
      setMotivoSelect('')
      setOutroTexto('')
      setError('')
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar motivo da perda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-background border shadow-xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-lg font-bold text-foreground">
              Registrar Motivo da Perda
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Para mover o lead{' '}
            <strong className="text-foreground font-semibold">"{lead?.nome || 'Lead'}"</strong> para
            a coluna{' '}
            <strong className="text-foreground font-semibold">
              "{cleanColumnTitle(targetStatus)}"
            </strong>
            , é obrigatório informar o motivo da perda. Caso cancele, o card retornará à etapa
            anterior.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Etapa em que o lead estava quando foi perdido (capturada automaticamente, somente leitura) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Etapa quando perdido (automática)
            </Label>
            <div className="px-3 py-2 rounded-md bg-muted/60 border border-border text-xs text-foreground font-medium flex items-center justify-between">
              <span className="truncate">{etapaLimpa}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Origem
              </span>
            </div>
          </div>

          {/* Select de Motivo */}
          <div className="space-y-1.5">
            <Label htmlFor={motivoSelectId} className="text-xs font-semibold text-foreground">
              Motivo da Perda <span className="text-destructive">*</span>
            </Label>
            <Select
              value={motivoSelect}
              onValueChange={(val) => {
                setMotivoSelect(val)
                if (error) setError('')
              }}
            >
              <SelectTrigger id={motivoSelectId} className="h-9 text-xs">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_PERDA.map((motivo) => (
                  <SelectItem key={motivo} value={motivo} className="text-xs">
                    {motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo texto livre obrigatório se escolher 'Outro' */}
          {isOutro && (
            <div className="space-y-1.5 animate-in fade-in-50 duration-150">
              <Label htmlFor={outroTextoId} className="text-xs font-semibold text-foreground">
                Descreva o motivo <span className="text-destructive">*</span>
              </Label>
              <Input
                id={outroTextoId}
                required
                autoFocus
                placeholder="Explique o motivo do descarte..."
                value={outroTexto}
                onChange={(e) => {
                  setOutroTexto(e.target.value)
                  if (error) setError('')
                }}
                className="h-9 text-xs"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !motivoSelect || (isOutro && !outroTexto.trim())}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Perda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
