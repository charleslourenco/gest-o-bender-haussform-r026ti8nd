import { useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { deleteContaPagar, deleteContaReceber } from '@/services/contas-financeiras'
import { getInvoiceSignedUrl, uploadInvoiceFile } from '@/services/notas-fiscais-storage'
import { formatCurrency } from '@/lib/utils'
import {
  FileText,
  Paperclip,
  Trash2,
  Upload,
  ExternalLink,
  Layers,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react'

export type EditarTipo = 'pagar' | 'receber'

interface EditarContaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: EditarTipo
  conta: any
  onSuccess: () => void
}

const STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'a_classificar', label: 'A Classificar' },
  { value: 'pago', label: 'Pago' },
  { value: 'agrupado', label: 'Agrupado' },
]

const MEIO_PAGAMENTO_OPTIONS = [
  { value: 'Pix', label: 'Pix' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Cartão', label: 'Cartão' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'Cheque', label: 'Cheque' },
]

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '-'
}

export function EditarContaDialog({
  open,
  onOpenChange,
  tipo,
  conta,
  onSuccess,
}: EditarContaDialogProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [fetchingExtra, setFetchingExtra] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Form states
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [entidade, setEntidade] = useState('')
  const [categoria, setCategoria] = useState('')
  const [status, setStatus] = useState('aguardando')
  const [meioPagamento, setMeioPagamento] = useState('')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [dataPagamento, setDataPagamento] = useState('')
  const [antecipado, setAntecipado] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [numeroParcela, setNumeroParcela] = useState('')
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null)

  // Contextual data loaded asynchronously
  const [clientes, setClientes] = useState<any[]>([])
  const [contasBancarias, setContasBancarias] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [origins, setOrigins] = useState<any[]>([])

  const table = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber'

  // Auxiliares tipados para contornar instabilidade do gerador de tipos
  const dbContasPagar = supabase.from('contas_pagar' as any)
  const dbContasReceber = supabase.from('contas_receber' as any)
  const dbNotasFiscais = supabase.from('notas_fiscais' as any)

  // Reset/populate form when dialog opens or conta changes
  useEffect(() => {
    if (open && conta) {
      setDescricao(conta.descricao || '')
      setValor(conta.valor !== undefined && conta.valor !== null ? conta.valor.toString() : '')
      setDataVencimento(conta.data_vencimento || '')
      setEntidade(tipo === 'pagar' ? conta.fornecedor || '' : conta.cliente_id || 'none')
      setCategoria(conta.categoria || '')
      setStatus((conta.status_pagamento || 'aguardando').toLowerCase())
      setMeioPagamento(conta.meio_pagamento || 'Pix')
      setContaBancariaId(conta.conta_bancaria_id || 'none')
      setDataPagamento(conta.data_pagamento || new Date().toISOString().split('T')[0])
      setAntecipado(!!conta.antecipado)
      setObservacoes(conta.observacoes || '')
      setNumeroParcela(conta.numero_parcela || '')
      setComprovanteUrl(conta.comprovante_url || null)
      setConfirmDelete(false)
      setInstallments([])
      setOrigins([])
    }
  }, [open, conta, tipo])

  // Load auxiliary data (clientes, contas bancárias, parcelas do grupo, notas fiscais de origem)
  useEffect(() => {
    if (!open || !conta) return
    let cancelled = false

    const loadExtra = async () => {
      setFetchingExtra(true)
      try {
        const { data: contasData } = await supabase
          .from('contas_bancarias')
          .select('id, nome_exibicao, banco, status')
          .eq('status', true)
          .order('nome_exibicao')

        if (!cancelled && contasData) {
          setContasBancarias(contasData)
        }

        if (tipo === 'receber') {
          const { data: clientesData } = await supabase
            .from('clientes')
            .select('id, nome')
            .order('nome')

          if (!cancelled && clientesData) {
            setClientes(clientesData)
          }
        }

        // Group / installments inspection
        const grupoId = conta.grupo_id
        let groupData: any[] = []
        if (grupoId) {
          const query = tipo === 'pagar' ? dbContasPagar : dbContasReceber
          const { data: gData } = await query
            .select('*')
            .eq('grupo_id', grupoId)
            .order('data_vencimento', { ascending: true })
          groupData = (gData as any[]) || []
        } else {
          groupData = [conta]
        }

        if (cancelled) return

        const inst = groupData.filter(
          (i) => (i.status_pagamento || '').toLowerCase() !== 'agrupado',
        )
        setInstallments(inst)

        // Origins (Notas Fiscais) for contas a pagar
        if (tipo === 'pagar') {
          const originals = groupData.filter(
            (i) => (i.status_pagamento || '').toLowerCase() === 'agrupado',
          )
          const nfIds = Array.from(
            new Set(
              [...originals.map((o) => o.nota_fiscal_id), conta.nota_fiscal_id].filter(Boolean),
            ),
          ) as string[]
          if (nfIds.length > 0) {
            const { data: nfs } = await dbNotasFiscais
              .select('id, numero_nota, fornecedor, valor_total, data_emissao, arquivo_url')
              .in('id', nfIds)
            if (!cancelled) setOrigins((nfs as any[]) || [])
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares do lançamento:', err)
      } finally {
        if (!cancelled) setFetchingExtra(false)
      }
    }

    loadExtra()

    return () => {
      cancelled = true
    }
  }, [open, conta, table, tipo])

  // File viewing / upload / removal handlers
  const handleViewComprovante = async (url: string) => {
    const { url: signed, error } = await getInvoiceSignedUrl(url)
    if (error || !signed) {
      toast({
        title: 'Erro ao acessar anexo',
        description: error || 'Não foi possível gerar o link do comprovante.',
        variant: 'destructive',
      })
      return
    }
    window.open(signed, '_blank')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const { path, error } = await uploadInvoiceFile(file)
      if (error || !path) {
        throw new Error(error || 'Falha no upload do arquivo.')
      }
      setComprovanteUrl(path)
      toast({
        title: 'Anexo carregado',
        description: 'O arquivo foi enviado. Salve o formulário para confirmar a alteração.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro no upload',
        description: err.message || 'Não foi possível enviar o anexo.',
        variant: 'destructive',
      })
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveComprovante = () => {
    setComprovanteUrl(null)
    toast({
      title: 'Anexo removido',
      description: 'Lembre-se de salvar o formulário para persistir a remoção.',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conta) return
    setLoading(true)
    try {
      const valorNum = Number(valor) || 0
      const isPago = status.toLowerCase() === 'pago'

      if (isPago && (!contaBancariaId || contaBancariaId === 'none')) {
        toast({
          title: 'Conta bancária obrigatória',
          description:
            'Ao definir status como Pago, selecione a conta bancária para atualizar o saldo.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const payload: any = {
        descricao: descricao || null,
        valor: valorNum,
        data_vencimento: dataVencimento || null,
        categoria: categoria || null,
        status_pagamento: status,
        meio_pagamento: isPago ? meioPagamento || null : null,
        conta_bancaria_id: isPago ? (contaBancariaId === 'none' ? null : contaBancariaId) : null,
        data_pagamento: isPago ? dataPagamento || new Date().toISOString().split('T')[0] : null,
        antecipado: isPago ? antecipado : false,
        observacoes: observacoes || null,
        comprovante_url: comprovanteUrl || null,
        atualizado_em: new Date().toISOString(),
      }

      if (tipo === 'pagar') {
        payload.fornecedor = entidade || 'Desconhecido'
        const { error } = await dbContasPagar.update(payload).eq('id', conta.id)
        if (error) throw error
      } else {
        payload.cliente_id = entidade === 'none' ? null : entidade
        payload.numero_parcela = numeroParcela || '1/1'
        const { error } = await dbContasReceber.update(payload).eq('id', conta.id)
        if (error) throw error
      }

      toast({ title: 'Sucesso', description: 'Lançamento atualizado com sucesso.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar',
        description: err.message || 'Falha ao atualizar o lançamento.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!conta) return
    setDeleting(true)
    try {
      const { error } =
        tipo === 'pagar' ? await deleteContaPagar(conta.id) : await deleteContaReceber(conta.id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Lançamento excluído com sucesso.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Falha ao excluir.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!conta) return null

  const isPago = status.toLowerCase() === 'pago'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {tipo === 'pagar' ? 'Conta a Pagar' : 'Conta a Receber'}</DialogTitle>
          <DialogDescription>
            Atualize todos os dados do lançamento financeiro com visão completa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Seção 1: Dados Principais */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-descricao" className="text-xs font-semibold">
                Descrição <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Pagamento de Fornecedor / Venda de Projeto"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-entidade" className="text-xs font-semibold">
                  {tipo === 'pagar' ? 'Fornecedor' : 'Cliente'}
                </Label>
                {tipo === 'pagar' ? (
                  <Input
                    id="edit-entidade"
                    value={entidade}
                    onChange={(e) => setEntidade(e.target.value)}
                    placeholder="Nome do fornecedor"
                  />
                ) : (
                  <Select value={entidade} onValueChange={setEntidade}>
                    <SelectTrigger id="edit-entidade">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-categoria" className="text-xs font-semibold">
                  Categoria
                </Label>
                <Input
                  id="edit-categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Insumos / Venda de Projetos"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-valor" className="text-xs font-semibold">
                  Valor (R$) <span className="text-rose-500">*</span>
                </Label>
                <CurrencyInput
                  id="edit-valor"
                  value={valor}
                  onValueChange={(val: number | undefined) =>
                    setValor(val !== undefined ? val.toString() : '')
                  }
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-vencimento" className="text-xs font-semibold">
                  Vencimento
                </Label>
                <Input
                  id="edit-vencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-status" className="text-xs font-semibold">
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Número da parcela para Contas a Receber */}
            {tipo === 'receber' && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-parcela" className="text-xs font-semibold">
                  Nº da Parcela
                </Label>
                <Input
                  id="edit-parcela"
                  value={numeroParcela}
                  onChange={(e) => setNumeroParcela(e.target.value)}
                  placeholder="Ex: 1/3, 2/5, 1/1"
                />
              </div>
            )}
          </div>

          {/* Seção 2: Dados de Pagamento (ativada quando status = Pago) */}
          {isPago ? (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dados de Pagamento / Baixa Bancária
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-conta-bancaria" className="text-xs font-semibold">
                    Conta Bancária <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                    <SelectTrigger id="edit-conta-bancaria">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione uma conta...</SelectItem>
                      {contasBancarias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_exibicao}
                          {c.banco ? ` — ${c.banco}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-meio-pagamento" className="text-xs font-semibold">
                    Meio de Pagamento <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                    <SelectTrigger id="edit-meio-pagamento">
                      <SelectValue placeholder="Selecione o meio" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEIO_PAGAMENTO_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-data-pagamento" className="text-xs font-semibold">
                    Data do Pagamento
                  </Label>
                  <Input
                    id="edit-data-pagamento"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2 pb-2">
                  <Checkbox
                    id="edit-antecipado"
                    checked={antecipado}
                    onCheckedChange={(v) => setAntecipado(v === true)}
                  />
                  <Label htmlFor="edit-antecipado" className="cursor-pointer text-xs font-medium">
                    Pagamento Antecipado
                  </Label>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-2.5 text-xs text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                Campos de baixa bancária e data de liquidação ficam disponíveis quando o status for
                marcado como <strong>Pago</strong>.
              </span>
            </div>
          )}

          {/* Seção 3: Anexo / Comprovante */}
          <div className="space-y-1.5 rounded-lg border p-3">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              Anexo / Comprovante
            </Label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                )}
                {uploadingFile
                  ? 'Enviando...'
                  : comprovanteUrl
                    ? 'Substituir Arquivo'
                    : 'Adicionar Anexo'}
              </Button>

              {comprovanteUrl && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => handleViewComprovante(comprovanteUrl)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Ver Anexo Atual
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleRemoveComprovante}
                    title="Remover anexo"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                  </Button>
                </>
              )}
            </div>
            {comprovanteUrl && (
              <p className="text-[11px] text-muted-foreground truncate pt-1">
                Caminho: {comprovanteUrl}
              </p>
            )}
          </div>

          {/* Seção 4: Origem & Parcelas Vinculadas (se houver) */}
          {(origins.length > 0 || installments.length > 1 || conta.formulario_comercial_id) && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Contexto / Origem / Parcelas
              </h4>

              {origins.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-foreground">
                    Nota(s) Fiscal(is) vinculada(s):
                  </span>
                  {origins.map((nf) => (
                    <div
                      key={nf.id}
                      className="text-xs flex items-center justify-between border-b last:border-0 py-1"
                    >
                      <span>
                        <strong>NF {nf.numero_nota || 'S/N'}</strong> — {nf.fornecedor}
                        {nf.data_emissao ? ` (${fmtDate(nf.data_emissao)})` : ''}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(Number(nf.valor_total) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tipo === 'receber' && conta.formulario_comercial_id && (
                <div className="text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Formulário Comercial:</span>
                  <span className="font-mono">{conta.formulario_comercial_id}</span>
                </div>
              )}

              {installments.length > 1 && (
                <div className="space-y-1 pt-1 border-t">
                  <span className="text-xs font-medium text-foreground">
                    Parcelas vinculadas ao grupo ({installments.length}):
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {installments.map((inst, idx) => (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between text-xs py-1 px-1.5 rounded ${
                          inst.id === conta.id
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span>
                          {idx + 1}/{installments.length} {inst.id === conta.id ? '(atual)' : ''}
                        </span>
                        <span>{fmtDate(inst.data_vencimento)}</span>
                        <span>{formatCurrency(Number(inst.valor) || 0)}</span>
                        <span className="capitalize">{inst.status_pagamento || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção 5: Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-observacoes" className="text-xs font-semibold">
              Observações
            </Label>
            <Textarea
              id="edit-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione notas, instruções ou observações sobre este lançamento..."
              rows={3}
            />
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2">
            <div className="flex gap-2">
              {confirmDelete ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={loading || uploadingFile}>
                {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
