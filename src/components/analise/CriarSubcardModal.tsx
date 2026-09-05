import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { getCorVinculoForCard } from '@/lib/subcards-utils'

interface CriarSubcardModalProps {
  parentCard: any
  onClose: () => void
  onSuccess: () => void
}

export function CriarSubcardModal({ parentCard, onClose, onSuccess }: CriarSubcardModalProps) {
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState<number | ''>(1)
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!nome.trim() || qtd === '') {
      toast({ description: 'Preencha os campos obrigatórios.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      // Usar a mesma cor_vinculo do pai se já existir, ou gerar cor baseada no pai
      const cor = parentCard?.cor_vinculo || getCorVinculoForCard(parentCard.id)

      // Garantir que o pai tenha cor_vinculo gravada para coerência
      if (!parentCard.cor_vinculo) {
        await supabase
          .from('produtos_servicos_projeto')
          .update({ cor_vinculo: cor })
          .eq('id', parentCard.id)
      }

      // Herdar cliente, formulário do pai
      // Subcard em Análise Técnica nasce com status do pai ou 'iniciar'
      const initialStatus = parentCard?.status_analise || 'iniciar'

      const newSubcard = {
        card_pai_id: parentCard.id,
        cor_vinculo: cor,
        nome_produto: nome.trim(),
        status_analise: initialStatus,
        qtd: Number(qtd),
        valor_unitario: 0,
        valor_total: 0,
        cliente_id: parentCard.cliente_id || null,
        formulario_comercial_id: parentCard.formulario_comercial_id || null,
        descricao: descricao.trim() || null,
      }

      const { error } = await supabase.from('produtos_servicos_projeto').insert([newSubcard])
      if (error) throw error

      toast({ description: 'Subcard criado com sucesso!' })
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar subcard',
        description: err.message || 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Novo Subcard para {parentCard?.nome_produto || 'Ambiente'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-md border p-2 text-xs bg-muted/40 text-muted-foreground flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: parentCard?.cor_vinculo || getCorVinculoForCard(parentCard.id),
              }}
            />
            <span>
              Vinculado a: <strong>{parentCard?.nome_produto}</strong>
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              Nome do Subcard <span className="text-destructive">*</span>
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Lateral arredondada, Serviço de serralheria..."
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">
              Quantidade <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              value={qtd}
              onChange={(e) => setQtd(e.target.value ? Number(e.target.value) : '')}
              className="bg-background border-input text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Descrição (Opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes sobre este subcard..."
              className="resize-none bg-background border-input text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="bg-transparent border-input text-foreground hover:bg-muted/50 hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !nome.trim() || qtd === ''}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {loading ? 'Criando...' : 'Criar Subcard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
