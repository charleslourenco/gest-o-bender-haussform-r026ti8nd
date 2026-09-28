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
import { Package, AlertTriangle, Loader2, Info, Plus, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CaixaPapelaoAbertaSvg } from '@/components/estoque/CaixaPapelaoIcons'
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

interface ClienteOption {
  id: string
  nome: string
}

export function AdicionarACaixaDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
}: AdicionarACaixaDialogProps) {
  const { toast } = useToast()

  const [caixas, setCaixas] = useState<CaixaOption[]>([])
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [selectedCaixaId, setSelectedCaixaId] = useState<string>('')
  const [quantidade, setQuantidade] = useState<string>('1')
  const [loadingCaixas, setLoadingCaixas] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado para criação inline de caixa dentro do próprio diálogo
  const [showCreateCaixa, setShowCreateCaixa] = useState(false)
  const [novoNomeCaixa, setNovoNomeCaixa] = useState('')
  const [novoClienteId, setNovoClienteId] = useState('')
  const [isCreatingCaixa, setIsCreatingCaixa] = useState(false)

  // Dados calculados de alocações e caixas reservadas
  const [alocacoesAtivasQtd, setAlocacoesAtivasQtd] = useState(0)
  const [caixasReservadasQtd, setCaixasReservadasQtd] = useState(0)
  const [loadingDisponibilidade, setLoadingDisponibilidade] = useState(false)

  useEffect(() => {
    if (!isOpen || !item) {
      setSelectedCaixaId('')
      setQuantidade('1')
      setShowCreateCaixa(false)
      setNovoNomeCaixa('')
      setNovoClienteId('')
      return
    }

    loadInitialData()
  }, [isOpen, item])

  async function loadInitialData() {
    setLoadingCaixas(true)
    setLoadingDisponibilidade(true)

    try {
      // 1. Buscar APENAS caixas abertas (status em separação, excluindo entregue)
      // Conforme especificação: REMOVER o fallback que exibia entregues.
      const { data: caixasData, error: caixasError } = await supabase
        .from('estoque_caixas' as any)
        .select(
          'id, nome, status, cliente:clientes(id, nome), formulario_comercial:formulario_comercial(id, nome_cliente)',
        )
        .neq('status', 'entregue')
        .order('criado_em', { ascending: false })

      if (caixasError) {
        console.error('Erro ao buscar caixas abertas:', caixasError)
      } else if (caixasData) {
        const abertas = caixasData as unknown as CaixaOption[]
        setCaixas(abertas)
        if (abertas.length > 0) {
          setSelectedCaixaId(abertas[0].id)
        } else {
          setSelectedCaixaId('')
        }
      }

      // 2. Buscar clientes para viabilizar criação in-line caso precise
      const { data: clientesData } = await supabase
        .from('clientes' as any)
        .select('id, nome')
        .order('nome')

      if (clientesData) {
        setClientes(clientesData as ClienteOption[])
      }

      // 3. Buscar alocações ativas do item
      const { data: alocData, error: alocError } = await supabase
        .from('estoque_alocacoes' as any)
        .select('quantidade')
        .eq('item_id', item.id)
        .eq('status', 'ativo')

      if (!alocError && alocData) {
        const totalAloc = alocData.reduce((acc, curr) => acc + Number(curr.quantidade || 0), 0)
        setAlocacoesAtivasQtd(totalAloc)
      }

      // 4. Buscar quantidades já reservadas em outras caixas
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

  // Criar caixa in-line sem sair do diálogo
  const handleCreateCaixaInline = async () => {
    if (!novoClienteId) {
      toast({
        title: 'Selecione o cliente',
        description: 'Todo pacote/caixa pertence a um cliente.',
        variant: 'destructive',
      })
      return
    }

    const clienteSelecionado = clientes.find((c) => c.id === novoClienteId)
    const nomeFinal =
      novoNomeCaixa.trim() ||
      `Caixa - ${clienteSelecionado?.nome || 'Cliente'} (${new Date().toLocaleDateString('pt-BR')})`

    setIsCreatingCaixa(true)
    try {
      const { data: created, error } = await supabase
        .from('estoque_caixas' as any)
        .insert({
          nome: nomeFinal,
          cliente_id: novoClienteId,
          status: 'separacao',
        })
        .select('id, nome, status, cliente:clientes(id, nome)')
        .single()

      if (error) throw error

      if (created) {
        const novaOpcao: CaixaOption = {
          id: created.id,
          nome: created.nome,
          status: created.status,
          cliente: created.cliente,
        }

        // Adiciona à lista de caixas e seleciona imediatamente
        setCaixas((prev) => [novaOpcao, ...prev])
        setSelectedCaixaId(novaOpcao.id)
        setShowCreateCaixa(false)
        setNovoNomeCaixa('')
        setNovoClienteId('')

        toast({
          title: 'Caixa criada com sucesso!',
          description: `A caixa "${nomeFinal}" foi criada e já está selecionada.`,
        })
      }
    } catch (err: any) {
      console.error('Erro ao criar caixa inline:', err)
      toast({
        title: 'Erro ao criar caixa',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingCaixa(false)
    }
  }

  // Saldo físico atual do item na tabela estoque_itens
  const saldoAtual = Number(item?.quantidade || 0)

  // Quantidade disponível considerando alocações ativas
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
      return 'Selecione uma caixa de destino aberta.'
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
        // Somar à quantidade existente
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-midnight-navy dark:text-slate-100">
            <CaixaPapelaoAbertaSvg size={22} className="shrink-0" />
            Adicionar à Caixa (Separação)
          </DialogTitle>
          <DialogDescription>
            Aloque uma quantidade deste material diretamente para uma caixa aberta de um cliente.
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
                <span className="text-muted-foreground">Saldo em estoque:</span>{' '}
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

          {/* Seleção da Caixa Aberta OU Aviso claro com botão "Criar caixa agora" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="caixa-select"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Caixa de Destino (Somente Abertas) *
              </Label>
              {!showCreateCaixa && caixas.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2 text-steel-blue hover:text-dark-denim dark:text-blue-400"
                  onClick={() => setShowCreateCaixa(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova Caixa
                </Button>
              )}
            </div>

            {loadingCaixas ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3 justify-center border border-dashed rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-steel-blue" />
                Carregando caixas em separação...
              </div>
            ) : caixas.length === 0 && !showCreateCaixa ? (
              /* AVISO CLARO CONFORME ESPECIFICAÇÃO: Nenhuma caixa em separação + Criar caixa agora */
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-800">
                    <CaixaPapelaoAbertaSvg size={26} className="shrink-0" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      Nenhuma caixa em separação
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                      Não há caixas abertas no momento. As caixas entregues não recebem novos itens.
                      Crie uma caixa agora para adicionar este item.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowCreateCaixa(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs text-xs h-9"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar caixa agora
                </Button>
              </div>
            ) : showCreateCaixa ? (
              /* PAINEL IN-LINE PARA CRIAR CAIXA NA HORA */
              <div className="rounded-xl border border-steel-blue/30 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-blue-200/60 dark:border-blue-900/50">
                  <span className="text-xs font-bold text-steel-blue dark:text-blue-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Criar Caixa Agora
                  </span>
                  {caixas.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowCreateCaixa(false)}
                    >
                      Cancelar criação
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente *</Label>
                  <Select value={novoClienteId} onValueChange={setNovoClienteId}>
                    <SelectTrigger className="bg-background text-xs h-9">
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Nome / Identificação da Caixa (opcional)</Label>
                  <Input
                    value={novoNomeCaixa}
                    onChange={(e) => setNovoNomeCaixa(e.target.value)}
                    placeholder="Ex: Armários Suíte / Ferragens"
                    className="bg-background text-xs h-9"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleCreateCaixaInline}
                  disabled={!novoClienteId || isCreatingCaixa}
                  className="w-full bg-steel-blue hover:bg-dark-denim text-white text-xs h-8"
                >
                  {isCreatingCaixa ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Criando caixa...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Confirmar e Selecionar Caixa
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* SELEÇÃO NORMAL DE CAIXAS ABERTAS */
              <Select value={selectedCaixaId} onValueChange={setSelectedCaixaId}>
                <SelectTrigger id="caixa-select" className="w-full">
                  <SelectValue placeholder="Selecione uma caixa em separação..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {caixas.map((caixa) => {
                    const clienteNome =
                      caixa.cliente?.nome ||
                      caixa.formulario_comercial?.nome_cliente ||
                      'Sem cliente vinculado'
                    return (
                      <SelectItem key={caixa.id} value={caixa.id} className="text-xs">
                        <div className="flex flex-col py-0.5 text-left">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <CaixaPapelaoAbertaSvg size={16} className="shrink-0" /> {clienteNome}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-5">
                            Caixa: {caixa.nome}
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
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Quantidade a Adicionar *
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
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
              disabled={showCreateCaixa || caixas.length === 0}
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
                  O item passará a figurar na caixa aberta do cliente. Se já estiver nela, a
                  quantidade será somada.
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
              showCreateCaixa ||
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
