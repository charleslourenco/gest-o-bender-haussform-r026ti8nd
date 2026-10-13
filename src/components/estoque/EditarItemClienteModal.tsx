import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, AlertTriangle, Loader2 } from 'lucide-react'

export interface ItemClienteData {
  id: string
  cliente_nome: string
  produto: string
  recebido_em: string
  entregue_em: string | null
  responsavel_entrega: string | null
  recebedor_nome: string | null
  recebedor_cpf: string | null
  comprovante_url: string | null
  assinado_em: string | null
  status: string | null
}

interface EditarItemClienteModalProps {
  item: ItemClienteData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  currentUserId?: string | null
}

/**
 * Separa o nome base do produto e a quantidade quando há sufixo " - N UNID"
 * Ex: "PORTA 949X445 - 3 UNID" -> { baseProduto: "PORTA 949X445", quantidade: 3 }
 */
export function extrairProdutoEQuantidade(produtoCompleto: string): {
  baseProduto: string
  quantidade: number
} {
  if (!produtoCompleto) {
    return { baseProduto: '', quantidade: 1 }
  }

  // Regex para identificar formato " - <N> UNID" no final (case insensitive)
  const regex = /^(.*?)(?:\s*-\s*(\d+)\s*(?:UNID|UNIDADES|UNIDADE|UN)?\s*)?$/i
  const match = produtoCompleto.match(regex)

  if (match && match[2]) {
    const parsedQtd = parseInt(match[2], 10)
    return {
      baseProduto: (match[1] || '').trim(),
      quantidade: isNaN(parsedQtd) || parsedQtd < 1 ? 1 : parsedQtd,
    }
  }

  return {
    baseProduto: produtoCompleto.trim(),
    quantidade: 1,
  }
}

/**
 * Converte data ISO string para formato aceito no input datetime-local (YYYY-MM-DDTHH:mm)
 */
function toDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Converte valor do datetime-local (YYYY-MM-DDTHH:mm) de volta para string ISO UTC
 */
function fromDatetimeLocal(localStr: string): string | null {
  if (!localStr) return null
  const d = new Date(localStr)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export function EditarItemClienteModal({
  item,
  open,
  onOpenChange,
  onSaved,
  currentUserId,
}: EditarItemClienteModalProps) {
  const { toast } = useToast()

  // Estados dos campos
  const [clienteNome, setClienteNome] = useState('')
  const [produtoBase, setProdutoBase] = useState('')
  const [quantidade, setQuantidade] = useState<number>(1)
  const [recebidoEm, setRecebidoEm] = useState('')
  const [entregueEm, setEntregueEm] = useState('')
  const [responsavelEntrega, setResponsavelEntrega] = useState('')

  // Clientes para autocompletar
  const [sugestoesClientes, setSugestoesClientes] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Status de bloqueio baseado nas regras
  const isAssinado = !!item?.assinado_em
  const isEntregueSemAssinatura = !!item?.entregue_em && !item?.assinado_em

  // Regra 2:
  // - Item com entrega assinada: BLOQUEAR edição de Produto, Quantidade e Cliente; permitir só corrigir Recebido em.
  const clienteBloqueado = isAssinado
  const produtoBloqueado = isAssinado
  const quantidadeBloqueada = isAssinado
  const recebidoEmBloqueado = false
  // Campos de entrega só são editáveis se já estiver entregue sem assinatura
  const camposEntregaVisiveis = isEntregueSemAssinatura

  // Inicializa dados ao abrir modal ou trocar de item
  useEffect(() => {
    if (!item || !open) return

    const { baseProduto, quantidade: qtd } = extrairProdutoEQuantidade(item.produto)
    setClienteNome(item.cliente_nome || '')
    setProdutoBase(baseProduto)
    setQuantidade(qtd)
    setRecebidoEm(toDatetimeLocal(item.recebido_em))
    setEntregueEm(toDatetimeLocal(item.entregue_em))
    setResponsavelEntrega(item.responsavel_entrega || item.recebedor_nome || '')
  }, [item, open])

  // Carregar sugestões de clientes (únicos, ordenados, combinando estoque_itens_cliente e clientes cadastrados)
  useEffect(() => {
    if (!open) return

    let isMounted = true

    async function carregarClientes() {
      try {
        const [resItens, resClientes] = await Promise.all([
          supabase.from('estoque_itens_cliente').select('cliente_nome'),
          supabase.from('clientes').select('nome'),
        ])

        const setNomes = new Set<string>()

        resItens.data?.forEach((row) => {
          if (row.cliente_nome && typeof row.cliente_nome === 'string') {
            const clean = row.cliente_nome.trim()
            if (clean) setNomes.add(clean)
          }
        })

        resClientes.data?.forEach((row) => {
          if (row.nome && typeof row.nome === 'string') {
            const clean = row.nome.trim()
            if (clean) setNomes.add(clean)
          }
        })

        if (isMounted) {
          const list = Array.from(setNomes).sort((a, b) => a.localeCompare(b, 'pt-BR'))
          setSugestoesClientes(list)
        }
      } catch (err) {
        console.warn('Erro ao carregar lista de clientes para autocompletar:', err)
      }
    }

    carregarClientes()

    return () => {
      isMounted = false
    }
  }, [open])

  // Filtragem de sugestões com normalização
  const datalistId = useMemo(() => `clientes-datalist-${item?.id || 'modal'}`, [item?.id])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

    const cleanCliente = clienteNome.trim()
    const cleanProdutoBase = produtoBase.trim()
    const intQtd = Math.max(1, Math.floor(Number(quantidade) || 1))

    if (!isAssinado) {
      if (!cleanCliente) {
        toast({
          title: 'Campo obrigatório',
          description: 'Informe o nome do cliente.',
          variant: 'destructive',
        })
        return
      }
      if (!cleanProdutoBase) {
        toast({
          title: 'Campo obrigatório',
          description: 'Informe a descrição do produto.',
          variant: 'destructive',
        })
        return
      }
    }

    if (!recebidoEm) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe a data e hora de recebimento.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Determinar campos alterados (UPDATE APENAS DOS CAMPOS ALTERADOS)
      const updates: Record<string, any> = {}
      const alteracoesLog: Record<string, { anterior: any; novo: any }> = {}

      // A) Cliente
      if (!clienteBloqueado && cleanCliente !== item.cliente_nome) {
        updates.cliente_nome = cleanCliente
        alteracoesLog.cliente_nome = { anterior: item.cliente_nome, novo: cleanCliente }
      }

      // B) Produto e Quantidade: gravar no MESMO formato atual: "<PRODUTO> - <N> UNID"
      if (!produtoBloqueado && !quantidadeBloqueada) {
        const novoProdutoFormatado = `${cleanProdutoBase} - ${intQtd} UNID`
        if (novoProdutoFormatado !== item.produto) {
          updates.produto = novoProdutoFormatado
          alteracoesLog.produto = { anterior: item.produto, novo: novoProdutoFormatado }
        }
      }

      // C) Recebido em
      const novoRecebidoEmIso = fromDatetimeLocal(recebidoEm)
      if (novoRecebidoEmIso && novoRecebidoEmIso !== item.recebido_em) {
        updates.recebido_em = novoRecebidoEmIso
        alteracoesLog.recebido_em = { anterior: item.recebido_em, novo: novoRecebidoEmIso }
      }

      // D) Entregue em e Responsável (caso item entregue sem assinatura)
      if (isEntregueSemAssinatura) {
        const novoEntregueEmIso = entregueEm ? fromDatetimeLocal(entregueEm) : null
        if (novoEntregueEmIso !== item.entregue_em) {
          updates.entregue_em = novoEntregueEmIso
          alteracoesLog.entregue_em = { anterior: item.entregue_em, novo: novoEntregueEmIso }
        }

        const cleanResp = responsavelEntrega.trim() || null
        if (cleanResp !== item.responsavel_entrega) {
          updates.responsavel_entrega = cleanResp
          alteracoesLog.responsavel_entrega = {
            anterior: item.responsavel_entrega,
            novo: cleanResp,
          }
        }
      }

      // Se nenhum campo foi alterado, apenas fecha o modal com aviso amigável
      if (Object.keys(updates).length === 0) {
        toast({ title: 'Nenhuma alteração', description: 'Nenhum dado foi modificado.' })
        onOpenChange(false)
        setIsSubmitting(false)
        return
      }

      // 2. Executar UPDATE na linha pelo id (nunca apagar e recriar)
      const { error: updateError } = await supabase
        .from('estoque_itens_cliente')
        .update(updates)
        .eq('id', item.id)

      if (updateError) {
        throw updateError
      }

      // 3. Registrar em logs_ia (acao = 'item_cliente_editado')
      // id do item, campos alterados com valor anterior e valor novo, e o usuário
      let effectiveUserId = currentUserId || null
      if (!effectiveUserId) {
        const { data: userRes } = await supabase.auth.getUser()
        effectiveUserId = userRes?.user?.id || null
      }

      try {
        await supabase.from('logs_ia').insert({
          user_id: effectiveUserId,
          acao: 'item_cliente_editado',
          detalhes: {
            item_id: item.id,
            alteracoes: alteracoesLog,
            campos_alterados: Object.keys(updates),
            cliente_nome: updates.cliente_nome ?? item.cliente_nome,
            produto: updates.produto ?? item.produto,
            usuario_id: effectiveUserId,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (logErr) {
        // Silencioso se der erro no log para não impedir a experiência do usuário
        console.warn('Aviso: falha ao registrar em logs_ia:', logErr)
      }

      toast({
        title: 'Item atualizado com sucesso',
        description: 'Os dados do item foram salvos.',
      })

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar item de cliente:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível atualizar o item.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Item de Cliente</DialogTitle>
          <DialogDescription>
            Atualize as informações do item guardado na fábrica.
          </DialogDescription>
        </DialogHeader>

        {/* Avisos conforme regras de situação */}
        {isAssinado && (
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Item com comprovante de entrega assinado.</p>
              <p>Para alterar o produto ou o cliente, exclua e registre novamente.</p>
            </div>
          </div>
        )}

        {isEntregueSemAssinatura && (
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold">Este item já consta como entregue.</p>
              <p>
                Você pode corrigir dados do item ou ajustar a data e o responsável pela entrega.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-4 py-2">
          {/* Campo: Cliente com Autocomplete */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-cliente" className="text-xs font-medium">
              Cliente{' '}
              {clienteBloqueado && (
                <span className="text-muted-foreground font-normal">(Bloqueado)</span>
              )}
            </Label>
            <Input
              id="edit-cliente"
              list={datalistId}
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              disabled={clienteBloqueado}
              placeholder="Digite ou selecione o cliente..."
              className={
                clienteBloqueado ? 'bg-muted cursor-not-allowed text-muted-foreground' : ''
              }
              required={!clienteBloqueado}
            />
            <datalist id={datalistId}>
              {sugestoesClientes.map((nome, idx) => (
                <option key={`${nome}-${idx}`} value={nome} />
              ))}
            </datalist>
            {!clienteBloqueado && (
              <p className="text-[11px] text-muted-foreground">
                Selecione um cliente existente ou digite um novo nome.
              </p>
            )}
          </div>

          {/* Grid: Produto (sem sufixo) e Quantidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="edit-produto" className="text-xs font-medium">
                Produto{' '}
                {produtoBloqueado && (
                  <span className="text-muted-foreground font-normal">(Bloqueado)</span>
                )}
              </Label>
              <Input
                id="edit-produto"
                value={produtoBase}
                onChange={(e) => setProdutoBase(e.target.value)}
                disabled={produtoBloqueado}
                placeholder="Ex: Fogão 4 bocas Electrolux"
                className={
                  produtoBloqueado ? 'bg-muted cursor-not-allowed text-muted-foreground' : ''
                }
                required={!produtoBloqueado}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-quantidade" className="text-xs font-medium">
                Quantidade{' '}
                {quantidadeBloqueada && (
                  <span className="text-muted-foreground font-normal">(Bloqueado)</span>
                )}
              </Label>
              <Input
                id="edit-quantidade"
                type="number"
                min={1}
                step={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value, 10) || 1))}
                disabled={quantidadeBloqueada}
                className={
                  quantidadeBloqueada ? 'bg-muted cursor-not-allowed text-muted-foreground' : ''
                }
                required={!quantidadeBloqueada}
              />
            </div>
          </div>

          {/* Campo: Recebido em (Data e Hora) */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-recebido-em" className="text-xs font-medium">
              Recebido em
            </Label>
            <Input
              id="edit-recebido-em"
              type="datetime-local"
              value={recebidoEm}
              onChange={(e) => setRecebidoEm(e.target.value)}
              disabled={recebidoEmBloqueado}
              required
            />
          </div>

          {/* Campos adicionais quando entregue sem assinatura */}
          {camposEntregaVisiveis && (
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-foreground">Dados da Entrega</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-entregue-em" className="text-xs font-medium">
                    Entregue em
                  </Label>
                  <Input
                    id="edit-entregue-em"
                    type="datetime-local"
                    value={entregueEm}
                    onChange={(e) => setEntregueEm(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-responsavel" className="text-xs font-medium">
                    Responsável (Entrega)
                  </Label>
                  <Input
                    id="edit-responsavel"
                    value={responsavelEntrega}
                    onChange={(e) => setResponsavelEntrega(e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
