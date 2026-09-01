import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Save, Pencil, Paperclip, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { getInvoiceSignedUrl } from '@/services/notas-fiscais-storage'

interface DetalhesContaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'pagar' | 'receber'
  conta: any
  onSuccess: () => void
  onEdit?: (tipo: 'pagar' | 'receber', conta: any) => void
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

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
      <div className="rounded-md border p-3 space-y-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '-'
}

export function DetalhesContaDialog({
  open,
  onOpenChange,
  tipo,
  conta,
  onSuccess,
  onEdit,
}: DetalhesContaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [installments, setInstallments] = useState<any[]>([])
  const [origins, setOrigins] = useState<any[]>([])
  const [bankAccount, setBankAccount] = useState<any>(null)
  const [clienteName, setClienteName] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')

  const [status, setStatus] = useState('aguardando')
  const [meioPagamento, setMeioPagamento] = useState('')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [dataPagamento, setDataPagamento] = useState('')
  const [antecipado, setAntecipado] = useState(false)
  const [contas, setContas] = useState<any[]>([])

  const table = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber'

  useEffect(() => {
    if (!open || !conta) return
    setObservacoes(conta.observacoes || '')
    setStatus((conta.status_pagamento || 'aguardando').toLowerCase())
    setMeioPagamento(conta.meio_pagamento || '')
    setContaBancariaId(conta.conta_bancaria_id || 'none')
    setDataPagamento(conta.data_pagamento || '')
    setAntecipado(!!conta.antecipado)
    setInstallments([])
    setOrigins([])
    setBankAccount(null)
    setClienteName(null)

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data: contasData } = await supabase
          .from('contas_bancarias')
          .select('id, nome_exibicao, banco, status')
          .order('nome_exibicao')
        if (!cancelled) setContas((contasData || []).filter((c: any) => c.status))

        const grupoId = conta.grupo_id
        let groupData: any[] = []
        if (grupoId) {
          const { data } = await supabase
            .from(table)
            .select('*')
            .eq('grupo_id', grupoId)
            .order('data_vencimento', { ascending: true })
          groupData = data || []
        } else {
          groupData = [conta]
        }
        if (cancelled) return

        const inst = groupData.filter(
          (i) => (i.status_pagamento || '').toLowerCase() !== 'agrupado',
        )
        setInstallments(inst)

        if (tipo === 'pagar') {
          const originals = groupData.filter(
            (i) => (i.status_pagamento || '').toLowerCase() === 'agrupado',
          )
          const nfIds = [
            ...new Set(
              [...originals.map((o) => o.nota_fiscal_id), conta.nota_fiscal_id].filter(Boolean),
            ),
          ] as string[]
          if (nfIds.length > 0) {
            const { data: nfs } = await supabase
              .from('notas_fiscais')
              .select('id, numero_nota, fornecedor, valor_total, data_emissao, arquivo_url')
              .in('id', nfIds)
            if (!cancelled) setOrigins(nfs || [])
          }
        } else if (conta.cliente_id) {
          const { data: c } = await supabase
            .from('clientes')
            .select('nome')
            .eq('id', conta.cliente_id)
            .single()
          if (!cancelled) setClienteName(c?.nome || null)
        }

        if (conta.conta_bancaria_id) {
          const { data: b } = await supabase
            .from('contas_bancarias')
            .select('nome_exibicao, banco, agencia, numero_conta')
            .eq('id', conta.conta_bancaria_id)
            .single()
          if (!cancelled) setBankAccount(b)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, conta, table, tipo])

  const isPago = status.toLowerCase() === 'pago'

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

  const handleOpenEdit = () => {
    onOpenChange(false)
    if (onEdit && conta) {
      onEdit(tipo, conta)
    }
  }

  const handleSave = async () => {
    if (!conta) return
    setSaving(true)
    try {
      const payload: any = {
        observacoes,
        status_pagamento: status,
      }

      if (isPago) {
        payload.meio_pagamento = meioPagamento || null
        payload.conta_bancaria_id = contaBancariaId === 'none' ? null : contaBancariaId
        payload.data_pagamento = dataPagamento || null
        payload.antecipado = antecipado
      } else {
        payload.meio_pagamento = null
        payload.conta_bancaria_id = null
        payload.data_pagamento = null
        payload.antecipado = false
      }

      const { error } = await supabase
        .from(table)
        .update({ ...payload, atualizado_em: new Date().toISOString() })
        .eq('id', conta.id)
      if (error) throw error
      toast({ title: 'Alterações salvas com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao salvar alterações.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!conta) return null

  const totalValue = installments.reduce((acc, i) => acc + (Number(i.valor) || 0), 0)
  const entityLabel = tipo === 'pagar' ? 'Fornecedor' : 'Cliente'
  const entityName =
    tipo === 'pagar' ? conta.fornecedor || '-' : clienteName || conta.entityName || '-'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Detalhes — {tipo === 'pagar' ? 'Conta a Pagar' : 'Conta a Receber'}
          </DialogTitle>
          <DialogDescription>Informações completas do lançamento financeiro.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="space-y-4">
            <Section title="Informações Gerais">
              <InfoRow label={entityLabel} value={entityName} />
              <InfoRow label="Descrição" value={conta.descricao || '-'} />
              <InfoRow
                label="Valor do Lançamento"
                value={formatCurrency(Number(conta.valor) || 0)}
              />
              {installments.length > 1 && (
                <InfoRow label="Valor Total (Grupo)" value={formatCurrency(totalValue)} />
              )}
              <InfoRow label="Categoria" value={conta.categoria || '-'} />
              <InfoRow label="Vencimento" value={fmtDate(conta.data_vencimento)} />
              {tipo === 'receber' && conta.numero_parcela && (
                <InfoRow label="Nº da Parcela" value={conta.numero_parcela} />
              )}

              <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                <Label htmlFor="detalhe-status" className="text-sm font-medium">
                  Status
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="detalhe-status">
                    <SelectValue placeholder="Selecione o status" />
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
            </Section>

            {conta.grupo_id ? (
              <Section title={`Parcelas do Grupo (${installments.length})`}>
                <div className="space-y-1">
                  {installments.map((inst, idx) => (
                    <div
                      key={inst.id}
                      className={`flex items-center justify-between text-sm py-1 border-b last:border-0 gap-2 ${
                        inst.id === conta.id ? 'font-semibold text-primary' : ''
                      }`}
                    >
                      <span className="shrink-0">
                        {idx + 1}/{installments.length} {inst.id === conta.id ? '(atual)' : ''}
                      </span>
                      <span>{fmtDate(inst.data_vencimento)}</span>
                      <span>{formatCurrency(Number(inst.valor) || 0)}</span>
                      <span className="capitalize text-right">
                        {(inst.status_pagamento || '-').toLowerCase() === 'pago'
                          ? 'Paga'
                          : inst.status_pagamento || '-'}
                        {inst.antecipado ? ' (antecipada)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            ) : (
              <Section title="Parcela única">
                <p className="text-sm text-gray-500">
                  Este lançamento não possui parcelas vinculadas.
                </p>
              </Section>
            )}

            <Section title="Origem">
              {tipo === 'pagar' ? (
                origins.length > 0 ? (
                  origins.map((nf) => (
                    <div
                      key={nf.id}
                      className="text-sm flex items-center justify-between gap-2 border-b last:border-0 py-1"
                    >
                      <div>
                        <span className="font-medium">NF: {nf.numero_nota || 'S/N'}</span> —{' '}
                        {nf.fornecedor} — {formatCurrency(Number(nf.valor_total) || 0)}
                        {nf.data_emissao &&
                          ` — ${new Date(nf.data_emissao).toLocaleDateString('pt-BR')}`}
                      </div>
                      {nf.arquivo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-blue-600"
                          onClick={() => handleViewComprovante(nf.arquivo_url)}
                        >
                          <Paperclip className="w-3.5 h-3.5 mr-1" /> Ver NF
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Sem nota fiscal vinculada.</p>
                )
              ) : (
                <>
                  <InfoRow label="Cliente" value={clienteName || '-'} />
                  {conta.formulario_comercial_id && (
                    <InfoRow label="Formulário Comercial" value={conta.formulario_comercial_id} />
                  )}
                </>
              )}
            </Section>

            {conta.comprovante_url && (
              <Section title="Anexo / Comprovante">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-xs text-muted-foreground">
                      {conta.comprovante_url}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0 text-blue-600"
                    onClick={() => handleViewComprovante(conta.comprovante_url)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir Anexo
                  </Button>
                </div>
              </Section>
            )}

            <Section title={tipo === 'pagar' ? 'Pagamento' : 'Recebimento'}>
              {isPago ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="detalhe-meio" className="text-sm font-medium">
                      Meio de Pagamento
                    </Label>
                    <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                      <SelectTrigger id="detalhe-meio">
                        <SelectValue placeholder="Selecione o meio de pagamento" />
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

                  <div className="space-y-1.5">
                    <Label htmlFor="detalhe-conta" className="text-sm font-medium">
                      Conta Bancária
                    </Label>
                    <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                      <SelectTrigger id="detalhe-conta">
                        <SelectValue placeholder="Selecione a conta bancária" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {contas.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_exibicao}
                            {c.banco ? ` — ${c.banco}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="detalhe-data-pagamento" className="text-sm font-medium">
                      Data de Pagamento
                    </Label>
                    <Input
                      id="detalhe-data-pagamento"
                      type="date"
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="detalhe-antecipado"
                      checked={antecipado}
                      onCheckedChange={(v) => setAntecipado(v === true)}
                    />
                    <Label htmlFor="detalhe-antecipado" className="cursor-pointer text-sm">
                      Antecipado
                    </Label>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Os campos de pagamento ficam disponíveis quando o status é definido como
                  &ldquo;Pago&rdquo;.
                </p>
              )}
            </Section>

            <Section title="Observações">
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre este lançamento..."
                rows={3}
              />
            </Section>

            <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2 border-t">
              <div>
                {onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleOpenEdit}
                  >
                    <Pencil className="w-4 h-4 mr-1.5" /> Editar Lançamento Completo
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
