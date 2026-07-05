import { supabase } from '@/lib/supabase/client'

export interface ContaBancaria {
  id: string
  nome_exibicao: string
  banco: string | null
  agencia: string | null
  numero_conta: string | null
  saldo_inicial: number
  saldo_atual: number
  status: boolean
  criado_em: string
  atualizado_em: string
}

export interface TransferenciaBancaria {
  id: string
  conta_origem_id: string
  conta_destino_id: string
  valor: number
  data_transferencia: string
  descricao: string | null
  usuario_id: string | null
  criado_em: string
}

export async function fetchContasBancarias(): Promise<ContaBancaria[]> {
  const { data, error } = await supabase.from('contas_bancarias').select('*').order('nome_exibicao')
  if (error) throw error
  return (data || []) as ContaBancaria[]
}

export async function upsertContaBancaria(conta: Partial<ContaBancaria>): Promise<void> {
  if (conta.id) {
    const { error } = await supabase
      .from('contas_bancarias')
      .update({
        nome_exibicao: conta.nome_exibicao,
        banco: conta.banco,
        agencia: conta.agencia,
        numero_conta: conta.numero_conta,
        saldo_inicial: conta.saldo_inicial,
        status: conta.status,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', conta.id)
    if (error) throw error
  } else {
    const saldoInicial = Number(conta.saldo_inicial) || 0
    const { error } = await supabase.from('contas_bancarias').insert({
      nome_exibicao: conta.nome_exibicao,
      banco: conta.banco,
      agencia: conta.agencia,
      numero_conta: conta.numero_conta,
      saldo_inicial: saldoInicial,
      saldo_atual: saldoInicial,
      status: conta.status ?? true,
    })
    if (error) throw error
  }
}

export async function deleteContaBancaria(id: string): Promise<void> {
  const { error } = await supabase.from('contas_bancarias').delete().eq('id', id)
  if (error) throw error
}

export async function createTransferencia(payload: {
  conta_origem_id: string
  conta_destino_id: string
  valor: number
  data_transferencia: string
  descricao?: string
  usuario_id?: string
}): Promise<void> {
  const { error } = await supabase.from('transferencias_bancarias').insert(payload)
  if (error) throw error
}

export async function fetchTransferencias(): Promise<TransferenciaBancaria[]> {
  const { data, error } = await supabase
    .from('transferencias_bancarias')
    .select('*')
    .order('data_transferencia', { ascending: false })
  if (error) throw error
  return (data || []) as TransferenciaBancaria[]
}
