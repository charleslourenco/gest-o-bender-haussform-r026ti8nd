import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, Loader2, FileText, Users, ShieldAlert } from 'lucide-react'
import {
  deletePessoa,
  getPessoaResumoExclusao,
  PessoaResumoExclusao,
} from '@/services/pessoa-actions'
import { useToast } from '@/hooks/use-toast'

interface PessoaDeleteDialogProps {
  tipo: 'clt' | 'pj'
  id: string
  nome: string
  onDeleted: () => void
  disabled?: boolean
}

export function PessoaDeleteDialog({
  tipo,
  id,
  nome,
  onDeleted,
  disabled = false,
}: PessoaDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [loadingResumo, setLoadingResumo] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resumo, setResumo] = useState<PessoaResumoExclusao | null>(null)
  const { toast } = useToast()

  const tipoLabel = tipo === 'clt' ? 'Colaborador CLT' : 'Parceiro PJ'

  useEffect(() => {
    if (open && id) {
      setLoadingResumo(true)
      getPessoaResumoExclusao(tipo, id, nome)
        .then((data) => setResumo(data))
        .catch((err) => {
          console.error('Erro ao carregar resumo de exclusão:', err)
          setResumo({
            alocacoesCount: 0,
            documentosCount: 0,
            documentosPaths: [],
            nome,
          })
        })
        .finally(() => setLoadingResumo(false))
    }
  }, [open, tipo, id, nome])

  const handleConfirmDelete = async () => {
    setDeleting(true)
    const result = await deletePessoa(tipo, id)
    setDeleting(false)

    if (!result.success) {
      toast({
        title: 'Erro ao excluir ' + tipoLabel.toLowerCase(),
        description: result.error || 'Não foi possível concluir a exclusão.',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: `${tipoLabel} excluído com sucesso!`,
      description: 'O cadastro, suas alocações e documentos foram removidos.',
    })

    setOpen(false)
    onDeleted()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          disabled={disabled || deleting}
          className="gap-2 font-medium"
        >
          <Trash2 className="w-4 h-4" />
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            Excluir {tipoLabel}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground pt-1">
              <p>
                Tem certeza que deseja remover permanentemente o cadastro de{' '}
                <strong className="text-foreground">{nome || 'esta pessoa'}</strong>?
              </p>

              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-destructive">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Esta ação é irreversível e removerá junto:</span>
                </div>

                {loadingResumo ? (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando vínculos do cadastro...</span>
                  </div>
                ) : (
                  <ul className="space-y-1.5 pt-1 text-foreground">
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        Alocações ativas em cards/subcards:
                      </span>
                      <strong
                        className={
                          (resumo?.alocacoesCount || 0) > 0
                            ? 'text-destructive font-bold'
                            : 'text-muted-foreground'
                        }
                      >
                        {resumo?.alocacoesCount ?? 0}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        Documentos anexados (arquivos e Storage):
                      </span>
                      <strong
                        className={
                          (resumo?.documentosCount || 0) > 0
                            ? 'text-destructive font-bold'
                            : 'text-muted-foreground'
                        }
                      >
                        {resumo?.documentosCount ?? 0}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between pt-1 border-t border-destructive/20">
                      <span>Cadastro na Gestão de Pessoas:</span>
                      <strong className="text-destructive font-bold">1</strong>
                    </li>
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Dica: caso queira apenas remover a pessoa dos selects de novos kanbans mantendo todo
                o histórico e documentos, utilize o botão <strong>Inativar</strong>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirmDelete()
            }}
            disabled={deleting || loadingResumo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Confirmar exclusão'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
