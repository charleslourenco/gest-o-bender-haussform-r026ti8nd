import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Package, AlertTriangle, Loader2, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface AdicionarACaixaDialogProps {
  isOpen: boolean
  onClose: () => void
  item: any
  onSuccess?: () => void
}

interface CaixaOption {
  id: string
  nome: string
  status: string
  cliente?: {
    id: string
    nome: string
  } | null
  formulario_comercial?: {
    id: string
    nome_cliente: string
  } | null
}

export function AdicionarACaixaDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
}: AdicionarACaixaDialogProps) {
  const { toast } = useToast()

  const [caixas, setCaixas] = useState<CaixaOption[]>([])
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>('')
  const [quantidade, setQuantidade] = useState<string>('1')
  const [loadingCaixas, setLoadingCaixas] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dados calculados de alocações e caixas reservadas
  const [alocacoesAtivasQtd, setAlocacoesAtivasQtd] = useState(0)
  const [caixasReservadasQtd, setCaixasReservadasQtd] = useState(0)
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false)

  useEffect(() => {
    if (!isOpen || !item) {
      setSelectedCaixaId('')
      setQuantidade('1')
      return
    }

    async function loadData() {
      setLoadingCaixas(true)
      setLoadingDisponibilidade(true)

      try {
        // 1. Buscar caixas da tabela de caixas (aba Separação).
        // Filtramos caixas ativas (excluímos entregue se houver apenas ativas para separação,
        // mas permitimos caixas em 'separacao' ou qualquer status <> 'entregue').
        // Se todas forem 'entregue' ou se tiver status misto, trazemos com preferência para não entregues.
        const { data: caixasData, error: caixasError } = await supabase
          .from('estoque_caixas' as any)
          .select(
            'id, nome, status, cliente:clientes(id, nome), formulario_comercial:formulario_comercial(id, nome_cliente)',
          )
          .order('criado_em', { ascending: false })

        if (caixasError) {
          console.error('Erro ao buscar caixas:', caixasError)
        } else if (caixasData) {
          // Filtrar caixas não entregues primeiro; se não houver nenhuma, exibir todas
          const caixasNaoEntregues = (caixasData as any[]).filter((c) => c.status !== 'entregue')
          const listaFinal =
            caixasNaoEntregues.length > 0 ? caixasNaoEntregues : (caixasData as any[])
          setCaixas(listaFinal)
          if (listaFinal.length > 0) {
            setSelectedCaixaId(listaFinal[0].id)
          }
        }

        // 2. Buscar alocações ativas do item
        const { data: alocData, error: alocError } = await supabase
          .from('estoque_alocacoes' as any)
          .select('quantidade')
          .eq('item_id', item.id)
          .eq('status', 'ativo')

        if (!alocError && alocData) {
          const totalAloc = alocData.reduce((acc, curr) => acc + Number(curr.quantidade || 0), 0)
          setAlocacoesAtivasQtd(totalAloc)
        }

        // 3. Buscar quantidades já reservadas em outras caixas
        // OBS: Como o trigger trg_caixa_item_reservado da tabela estoque_caixas_itens
        // já desconta NEW.quantidade de estoque_itens.quantidade no INSERT,
        // o saldo atual em item.quantidade já reflete o desconto de caixas.
        // No entanto, para garantir que respeitamos a regra
        // "não permitir quantidade maior que o disponível (descontando alocações ativas e quantidades já reservadas em outras caixas)
        // e não ultrapassar o saldo do item", consultamos também estoque_caixas_itens.
        const { data: caixasItensData, error: caixasItensError } = await supabase
          .from('estoque_caixas_itens' as any)
          .select('quantidade')
          .eq('item_id', item.id)
          .eq('status', 'reservado')

        if (!caixasItensError && caixasItensData) {
          const totalReservado = caixasItensData.reduce(
            (acc, curr) => acc + Number(curr.quantidade || 0),
            0,
          )
          setCaixasReservadasQtd(totalReservado)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do diálogo Adicionar à Caixa:', err)
      } finally {
        setLoadingCaixas(false)
        setLoadingDisponibilidade(false)
      }
    }

    loadData()
  }, [isOpen, item])

  // Saldo físico atual do item na tabela estoque_itens
  const saldoAtual = Number(item?.quantidade || 0)

  // Disponível livre:
  // Saldo do item descontando alocações ativas de clientes.
  // Como o trigger já subtrai de estoque_itens quando inserido em estoque_caixas_itens com status='reservado',
  // o saldoAtual já tem o desconto das caixas.
  // Para atender estritamente ao enunciado:
  // disponível = Math.max(0, saldoAtual - alocacoesAtivasQtd)
  // E nunca ultrapassa o saldo do item.
  const quantidadeDisponivel = useMemo(() => {
    const disp = saldoAtual - alocacoesAtivasQtd
    return Math.max(0, Math.min(saldoAtual, disp))
  }, [saldoAtual, alocacoesAtivasQtd])

  const parsedQtd = Number(quantidade)
  const isInvalidQtd = isNaN(parsedQtd) || parsedQtd <= 0
  const isOverSaldo = parsedQtd > saldoAtual
  const isOverDisponivel = parsedQtd > quantidadeDisponivel

  const errorMessage = useMemo(() => {
    if (!quantidade || isNaN(parsedQtd) || parsedQtd <= 0) {
      return 'Informe uma quantidade válida maior que zero.'
    }
    if (isOverSaldo) {
      return `Quantidade (${parsedQtd}) ultrapassa o saldo total do item (${saldoAtual} ${item?.unidade || 'un'}).`
    }
    if (isOverDisponivel) {
      return `Quantidade (${parsedQtd}) ultrapassa o disponível (${quantidadeDisponivel} ${item?.unidade || 'un'}), considerando alocações ativas (${alocacoesAtivasQtd}).`
    }
    if (!selectedCaixaId) {
      return 'Selecione uma caixa de destino.'
    }
    return null
  }, [
    quantidade,
    parsedQtd,
    isOverSaldo,
    isOverDisponivel,
    selectedCaixaId,
    saldoAtual,
    quantidadeDisponivel,
    alocacoesAtivasQtd,
    item,
  ])

  const handleConfirm = async () => {
    if (errorMessage || !selectedCaixaId || isSubmitting) return

    setIsSubmitting(true)
    try {
      // 1. Verificar se o item já existe nesta caixa com status 'reservado'
      const { data: existingItems, error: searchError } = await supabase
        .from('estoque_caixas_itens' as any)
        .select('id, quantidade, status')
        .eq('caixa_id', selectedCaixaId)
        .eq('item_id', item.id)
        .eq('status', 'reservado')

      if (searchError) throw searchError

      const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null

      if (existingItem) {
        // Somar à quantidade existente em vez de duplicar a linha
        const novaQtd = Number(existingItem.quantidade) + parsedQtd
        const { error: updateError } = await supabase
          .from('estoque_caixas_itens' as any)
          .update({ quantidade: novaQtd })
          .eq('id', existingItem.id)

        if (updateError) throw updateError

        toast({
          title: 'Item já estava na caixa — quantidade somada',
          description: `Nova quantidade na caixa: ${novaQtd} ${item?.unidade || 'un'}.`,
        })
      } else {
        // Inserir nova linha na caixa
        const { error: insertError } = await supabase.from('estoque_caixas_itens' as any).insert({
          caixa_id: selectedCaixaId,
          item_id: item.id,
          quantidade: parsedQtd,
          status: 'reservado',
        })

        if (insertError) throw insertError

        toast({
          title: 'Item adicionado à caixa com sucesso!',
          description: `${parsedQtd} ${item?.unidade || 'un'} adicionado(s) à caixa selecionada.`,
        })
      }

      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Erro ao adicionar item à caixa:', err)
      toast({
        title: 'Erro ao adicionar item à caixa',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Adicionar à Caixa
          </DialogTitle>
          <DialogDescription>
            Aloque uma quantidade deste item diretamente para uma caixa virtual na aba Separação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Informações do Item */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
            <div className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {item.nome}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="text-muted-foreground">Saldo do item:</span>{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {saldoAtual} {item.unidade}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Alocações ativas:</span>{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {alocacoesAtivasQtd} {item.unidade}
                </strong>
              </div>
              <div className="col-span-2 pt-1 border-t border-border flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Disponível para caixa:</span>
                <span
                  className={`font-bold text-sm ${
                    quantidadeDisponivel > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500'
                  }`}
                >
                  {quantidadeDisponivel} {item.unidade}
                </span>
              </div>
            </div>
          </div>

          {/* Seleção da Caixa */}
          <div className="space-y-1.5">
            <Label
              htmlFor="caixa-select"
              className="text-xs font-semibold uppercase tracking-wider"
            >
              Caixa de Destino *
            </Label>
            {loadingCaixas ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                Carregando caixas virtuais...
              </div>
            ) : caixas.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Nenhuma caixa virtual encontrada</p>
                  <p className="mt-0.5">
                    Crie uma caixa na aba Separação antes de adicionar materiais.
                  </p>
                </div>
              </div>
            ) : (
              <Select value={selectedCaixaId} onValueChange={setSelectedCaixaId}>
                <SelectTrigger id="caixa-select" className="w-full">
                  <SelectValue placeholder="Selecione uma caixa virtual..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {caixas.map((caixa) => {
                    const clienteNome =
                      caixa.cliente?.nome ||
                      caixa.formulario_comercial?.nome_cliente ||
                      'Sem cliente vinculado'
                    return (
                      <SelectItem key={caixa.id} value={caixa.id} className="text-xs">
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {caixa.nome}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Cliente: {clienteNome}
                            {caixa.status === 'entregue' ? ' (Entregue)' : ''}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quantidade a Adicionar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label
                htmlFor="quantidade-adicionar"
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Quantidade a Adicionar *
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Máx: {quantidadeDisponivel} {item.unidade}
              </span>
            </div>
            <Input
              id="quantidade-adicionar"
              type="number"
              step="any"
              min="0.01"
              max={quantidadeDisponivel}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className={errorMessage ? 'border-red-400 focus-visible:ring-red-400' : ''}
            />
            {errorMessage ? (
              <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  O item passará a aparecer na caixa selecionada na aba Separação. Se o item já
                  estiver na caixa, a quantidade será somada automaticamente.
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              Boolean(errorMessage) ||
              caixas.length === 0 ||
              isSubmitting ||
              loadingCaixas ||
              loadingDisponibilidade
            }
            className="bg-steel-blue hover:bg-dark-denim text-white dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Adicionar à Caixa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
