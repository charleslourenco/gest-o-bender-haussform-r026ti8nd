import { Lead } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserX, UserMinus, Copy, FlaskConical, X } from 'lucide-react'

export type MotivoSaidaQuadro =
  | 'perdido'
  | 'Não é lead (engano, spam ou outro assunto)'
  | 'Cadastro repetido'
  | 'Teste'

interface SaidaDoQuadroModalProps {
  open: boolean
  lead: Lead | null
  onClose: () => void
  onSelectOption: (option: MotivoSaidaQuadro) => void
}

export function SaidaDoQuadroModal({
  open,
  lead,
  onClose,
  onSelectOption,
}: SaidaDoQuadroModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-full max-w-md bg-background border shadow-xl overflow-hidden p-6">
        <DialogHeader className="space-y-1.5 min-w-0 text-left">
          <DialogTitle className="text-lg font-bold text-foreground break-words whitespace-normal pr-6">
            Por que este atendimento está saindo do quadro?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground break-words whitespace-normal">
            {lead?.nome ? (
              <>
                Atendimento:{' '}
                <strong className="text-foreground font-semibold break-words">{lead.nome}</strong>.
                Selecione o desfecho deste atendimento para retirá-lo do quadro:
              </>
            ) : (
              'Selecione o desfecho deste atendimento para retirá-lo do quadro:'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5 py-3 w-full min-w-0">
          {/* Opção a: Cliente perdido */}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-3.5 border-border hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-foreground group transition-all whitespace-normal"
            onClick={() => onSelectOption('perdido')}
          >
            <div className="flex items-start gap-3 w-full min-w-0">
              <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                <UserMinus className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-xs text-foreground break-words whitespace-normal">
                  Cliente perdido
                </span>
                <span className="text-[11px] text-muted-foreground font-normal break-words whitespace-normal leading-relaxed">
                  Abre o fluxo de perda com motivo obrigatório e move para a coluna de Perdido.
                </span>
              </div>
            </div>
          </Button>

          {/* Opção b: Não é lead */}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-3.5 border-border hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-foreground group transition-all whitespace-normal"
            onClick={() => onSelectOption('Não é lead (engano, spam ou outro assunto)')}
          >
            <div className="flex items-start gap-3 w-full min-w-0">
              <div className="p-2 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                <UserX className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-xs text-foreground break-words whitespace-normal">
                  Não é lead (engano, spam ou outro assunto)
                </span>
                <span className="text-[11px] text-muted-foreground font-normal break-words whitespace-normal leading-relaxed">
                  Descarta o atendimento como engano ou contato indevido.
                </span>
              </div>
            </div>
          </Button>

          {/* Opção c: Cadastro repetido */}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-3.5 border-border hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-foreground group transition-all whitespace-normal"
            onClick={() => onSelectOption('Cadastro repetido')}
          >
            <div className="flex items-start gap-3 w-full min-w-0">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                <Copy className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-xs text-foreground break-words whitespace-normal">
                  Cadastro repetido
                </span>
                <span className="text-[11px] text-muted-foreground font-normal break-words whitespace-normal leading-relaxed">
                  Exclui o cadastro duplicado mantendo os registros originais.
                </span>
              </div>
            </div>
          </Button>

          {/* Opção d: Teste */}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 px-3.5 border-border hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-foreground group transition-all whitespace-normal"
            onClick={() => onSelectOption('Teste')}
          >
            <div className="flex items-start gap-3 w-full min-w-0">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-xs text-foreground break-words whitespace-normal">
                  Teste
                </span>
                <span className="text-[11px] text-muted-foreground font-normal break-words whitespace-normal leading-relaxed">
                  Descarta atendimento criado exclusivamente para testes ou simulações.
                </span>
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter className="w-full flex-row justify-end items-center gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
