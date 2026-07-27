import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface DetalhesContaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'pagar' | 'receber'
  conta: any
  onSuccess: () => void
}

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
}: DetalhesContaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [installments, setInstallments] = useState<any[]>([])
  const [origins, setOrigins] = useState<any[]>([])
  const [bankAccount, setBankAccount] = useState<any>(null)
  const [clienteName, setClienteName] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')

  const table = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber'

  useEffect(() => {
    if (!open || !conta) return
    setObservacoes(conta.observacoes || '')
    setInstallments([])
    setOrigins([])
    setBankAccount(null)
    setClienteName(null)

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
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
              .select('id, numero_nota, fornecedor, valor_total, data_emissao')
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

  const handleSave = async () => {
    if (!conta) return
    setSaving(true)
    try {
      const { error } = await supabase.from(table).update({ observacoes }).eq('id', conta.id)
      if (error) throw error
      toast({ title: 'Observações salvas com sucesso!' })
      onSuccess()
    } catch {
      toast({ title: 'Erro ao salvar observações', variant: 'destructive' })
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
              <InfoRow label="Valor Total" value={formatCurrency(totalValue)} />
              <InfoRow label="Categoria" value={conta.categoria || '-'} />
              <InfoRow label="Status" value={conta.status_pagamento || '-'} />
              <InfoRow label="Vencimento" value={fmtDate(conta.data_vencimento)} />
            </Section>

            {conta.grupo_id ? (
              <Section title={`Parcelas (${installments.length})`}>
                <div className="space-y-1">
                  {installments.map((inst, idx) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between text-sm py-1 border-b last:border-0 gap-2"
                    >
                      <span className="font-medium shrink-0">
                        {idx + 1}/{installments.length}
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
                    <div key={nf.id} className="text-sm">
                      <span className="font-medium">NF: {nf.numero_nota || 'S/N'}</span> —{' '}
                      {nf.fornecedor} — {formatCurrency(Number(nf.valor_total) || 0)}
                      {nf.data_emissao &&
                        ` — ${new Date(nf.data_emissao).toLocaleDateString('pt-BR')}`}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Sem nota fiscal vinculada.</p>
                )
              ) : (
                <>
                  <InfoRow label="Cliente" value={clienteName || '-'} />
                  {conta.formulario_comercial_id && (
                    <InfoRow label="Formulário" value={conta.formulario_comercial_id} />
                  )}
                </>
              )}
            </Section>

            <Section title={tipo === 'pagar' ? 'Pagamento' : 'Recebimento'}>
              <InfoRow label="Meio de Pagamento" value={conta.meio_pagamento || '-'} />
              <InfoRow
                label="Conta Bancária"
                value={
                  bankAccount
                    ? `${bankAccount.nome_exibicao}${bankAccount.banco ? ' — ' + bankAccount.banco : ''}`
                    : '-'
                }
              />
              <InfoRow label="Data Pagamento" value={fmtDate(conta.data_pagamento)} />
              {conta.antecipado && <InfoRow label="Antecipado" value="Sim" />}
            </Section>

            <Section title="Observações">
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre este lançamento..."
                rows={3}
              />
              <Button size="sm" onClick={handleSave} disabled={saving} className="mt-2">
                {saving ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
