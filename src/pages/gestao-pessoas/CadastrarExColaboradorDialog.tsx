import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2, UserPlus, Info } from 'lucide-react'

interface CadastrarExColaboradorDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

/**
 * Gera um e-mail interno único e determinístico para o ex-colaborador.
 * Garante que a constraint NOT NULL e UNIQUE da tabela auth.users/users seja satisfeita
 * sem exigir que o usuário digite um e-mail real.
 */
function gerarEmailPlaceholder(nome: string): string {
  const slug =
    nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 30) || 'colaborador'

  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const timestamp = Date.now().toString().slice(-4)
  return `${slug}.${timestamp}.${randomSuffix}@excolaborador.local`
}

export function CadastrarExColaboradorDialog({
  isOpen,
  onClose,
  onSuccess,
}: CadastrarExColaboradorDialogProps) {
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [dataSaida, setDataSaida] = useState('')
  const [observacao, setObservacao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReset = () => {
    setNome('')
    setDataSaida('')
    setObservacao('')
    setIsSubmitting(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      handleReset()
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do ex-colaborador.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const emailPlaceholder = gerarEmailPlaceholder(nomeTrim)
      // Senha randômica segura (apenas para satisfazer requisitos de criação de auth.user)
      const senhaPlaceholder = `ExColab#${Math.random().toString(36).slice(2, 10)}!${Date.now()}`

      // Montar anotação/função opcional se fornecida
      const notasAdicionais: string[] = []
      if (dataSaida) {
        const [ano, mes, dia] = dataSaida.split('-')
        const dataFormatada = dia && mes && ano ? `${dia}/${mes}/${ano}` : dataSaida
        notasAdicionais.push(`Saída: ${dataFormatada}`)
      }
      if (observacao.trim()) {
        notasAdicionais.push(observacao.trim())
      }

      const funcaoDesc = notasAdicionais.length > 0 ? notasAdicionais.join(' — ') : 'Ex Colaborador'

      // Criação via edge function admin-users (Garante auth.user + public.users vinculados)
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create',
          userData: {
            nome: nomeTrim,
            email: emailPlaceholder,
            senha: senhaPlaceholder,
            funcao: funcaoDesc,
            status: false, // Sem acesso ao sistema
            ex_colaborador: true, // Já nasce como ex-colaborador
            eh_consultor: false, // NÃO aparece nos dropdowns de consultor do CRM
          },
        },
      })

      if (error) {
        throw new Error(error.message || 'Falha ao registrar ex-colaborador')
      }

      // Se retornou o usuário criado, garantir status=false e ex_colaborador=true no banco diretamente por segurança
      const createdId = data?.user?.id
      if (createdId) {
        await supabase
          .from('users')
          .update({
            status: false,
            ex_colaborador: true,
            eh_consultor: false,
            funcao: funcaoDesc,
          })
          .eq('id', createdId)
      }

      toast({
        title: 'Ex-colaborador cadastrado!',
        description: `"${nomeTrim}" foi adicionado à lista de ex-colaboradores (sem acesso ao sistema).`,
      })

      handleReset()
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar ex-colaborador:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: err.message || 'Ocorreu um erro ao salvar o registro.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border shadow-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Cadastrar Ex-Colaborador
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira o nome para manter o registro e histórico organizado. O registro nasce sem
              acesso ao sistema e sem vínculo como consultor ativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-4">
            {/* Campo Nome (Obrigatório) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="nome-ex-colaborador"
                className="text-xs font-semibold text-foreground"
              >
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nome-ex-colaborador"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silveira"
                className="h-9 text-xs bg-background border-border"
                autoFocus
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Campos Opcionais: Data de saída e observação */}
            <div className="space-y-1.5">
              <Label htmlFor="data-saida-ex" className="text-xs font-medium text-muted-foreground">
                Data de desligamento / saída{' '}
                <span className="text-[11px] font-normal">(opcional)</span>
              </Label>
              <Input
                id="data-saida-ex"
                type="date"
                value={dataSaida}
                onChange={(e) => setDataSaida(e.target.value)}
                className="h-9 text-xs bg-background border-border"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obs-ex" className="text-xs font-medium text-muted-foreground">
                Observação / Área antiga <span className="text-[11px] font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="obs-ex"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Marceneiro sênior, desligado em comum acordo..."
                rows={2}
                className="text-xs bg-background border-border resize-none"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40 border border-border/80 text-[11px] text-muted-foreground">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>
                Não é necessário e-mail ou senha. O colaborador será registrado diretamente com
                status
                <strong> inativo</strong> e marcado como <strong>ex-colaborador</strong>.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !nome.trim()}
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground min-w-[110px] gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
