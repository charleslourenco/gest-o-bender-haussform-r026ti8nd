import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FormState, defaultState } from './form/FormUtils'
import {
  SectionPessoal,
  SectionEndereco,
  SectionObra,
  SectionProdutos,
  SectionPagamento,
  SectionDatas,
  SectionResumo,
} from './form/FormSections'

export function ComercialForm({
  leadId,
  onClose,
  isModal = false,
}: {
  leadId: string
  onClose?: () => void
  isModal?: boolean
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<FormState>(defaultState)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteId, setClienteId] = useState('')

  useEffect(() => {
    async function fetch() {
      const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
      if (lead) setClienteNome(lead.nome)

      let cid = ''
      const { data: cliente } = await supabase
        .from('clientes')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle()
      if (cliente) {
        cid = cliente.id
        setClienteId(cid)
      } else if (lead) {
        const { data: newClient } = await supabase
          .from('clientes')
          .insert({
            lead_id: lead.id,
            nome: lead.nome,
            email: lead.email,
            telefone: lead.telefone,
            status: 'Ativo',
          })
          .select()
          .single()
        if (newClient) {
          cid = newClient.id
          setClienteId(cid)
        }
      }

      const { data: form } = await supabase
        .from('formulario_comercial')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle()
      const { data: userData } = await supabase.auth.getUser()
      let vNome = ''
      if (userData.user) {
        const { data: uInfo } = await supabase
          .from('users')
          .select('nome')
          .eq('id', userData.user.id)
          .single()
        vNome = uInfo?.nome || ''
      }

      if (form) {
        setData((p) => ({
          ...p,
          nome: cliente?.nome || lead?.nome || '',
          cpf: form.cpf || cliente?.cpf || '',
          telefone: cliente?.telefone || lead?.telefone || '',
          email: cliente?.email || lead?.email || '',
          profissao: form.profissao || '',
          estado_civil: form.estado_civil || 'solteiro',
          end_cep: form.cep || '',
          end_municipio: form.municipio || '',
          end_estado: form.estado || '',
          end_rua: form.rua || '',
          end_numero: form.numero || '',
          end_bairro: form.bairro || '',
          end_complemento: form.complemento || '',
          obra_cep: form.obra_cep || '',
          obra_municipio: form.obra_municipio || '',
          obra_estado: form.obra_estado || '',
          obra_rua: form.obra_rua || '',
          obra_numero: form.obra_numero || '',
          obra_bairro: form.obra_bairro || '',
          obra_complemento: form.obra_complemento || '',
          produtos:
            form.produtos_servicos && (form.produtos_servicos as any[]).length > 0
              ? (form.produtos_servicos as any)
              : p.produtos,
          desconto: form.desconto || 0,
          forma_pagamento: (form.pagamentos as any)?.forma || 'A_VISTA',
          pagamento_a_vista_data:
            (form.pagamentos as any)?.a_vista?.data || p.pagamento_a_vista_data,
          pagamento_a_vista_meio:
            (form.pagamentos as any)?.a_vista?.meio || p.pagamento_a_vista_meio,
          pagamento_parcelado: (form.pagamentos as any)?.parcelado || p.pagamento_parcelado,
          data_medida: (form.datas as any)?.medida || '',
          vendedor_nome: (form.dados_etapa_1 as any)?.vendedor_nome || vNome,
        }))
      } else {
        setData((p) => ({
          ...p,
          nome: cliente?.nome || lead?.nome || '',
          telefone: cliente?.telefone || lead?.telefone || '',
          email: cliente?.email || lead?.email || '',
          vendedor_nome: vNome,
        }))
      }
      setLoading(false)
    }
    fetch()
  }, [leadId])

  const update = (f: keyof FormState, v: any) => setData((p) => ({ ...p, [f]: v }))
  const updateViaCep = async (cep: string, isObra: boolean) => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
        const viadata = await res.json()
        if (!viadata.erro) {
          if (isObra) {
            update('obra_municipio', viadata.localidade)
            update('obra_estado', viadata.uf)
            update('obra_rua', viadata.logradouro)
            update('obra_bairro', viadata.bairro)
          } else {
            update('end_municipio', viadata.localidade)
            update('end_estado', viadata.uf)
            update('end_rua', viadata.logradouro)
            update('end_bairro', viadata.bairro)
          }
        }
      } catch {
        /* intentionally ignored */
      }
    }
  }

  const totalProd = useMemo(
    () => data.produtos.reduce((acc, p) => acc + p.qtd * p.valor_unitario, 0),
    [data.produtos],
  )
  const total = Math.max(0, totalProd - data.desconto)
  const totalParc = useMemo(
    () => data.pagamento_parcelado.reduce((acc, p) => acc + p.valor, 0),
    [data.pagamento_parcelado],
  )
  const parcelasBatem = Math.abs(total - totalParc) < 0.01

  const isValid = useMemo(() => {
    if (
      !data.nome ||
      !data.cpf ||
      !data.telefone ||
      !data.email ||
      !data.profissao ||
      !data.estado_civil
    )
      return false
    if (!data.end_cep || !data.end_numero || !data.obra_cep || !data.obra_numero) return false
    if (data.produtos.length === 0 || data.produtos[0].valor_unitario <= 0) return false
    if (!data.data_medida) return false

    const today = new Date()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const todayStr = `${today.getFullYear()}-${m}-${d}`
    if (data.data_medida < todayStr) return false

    if (data.forma_pagamento === 'PARCELADO' && !parcelasBatem) return false
    return true
  }, [data, parcelasBatem])

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('formulario_comercial').upsert(
        {
          lead_id: leadId,
          cliente_id: clienteId,
          cpf: data.cpf,
          profissao: data.profissao,
          estado_civil: data.estado_civil,
          cep: data.end_cep,
          municipio: data.end_municipio,
          estado: data.end_estado,
          rua: data.end_rua,
          numero: data.end_numero,
          bairro: data.end_bairro,
          complemento: data.end_complemento,
          obra_cep: data.obra_cep,
          obra_municipio: data.obra_municipio,
          obra_estado: data.obra_estado,
          obra_rua: data.obra_rua,
          obra_numero: data.obra_numero,
          obra_bairro: data.obra_bairro,
          obra_complemento: data.obra_complemento,
          produtos_servicos: data.produtos as any,
          desconto: data.desconto,
          pagamentos: {
            forma: data.forma_pagamento,
            a_vista:
              data.forma_pagamento === 'A_VISTA'
                ? { data: data.pagamento_a_vista_data, meio: data.pagamento_a_vista_meio }
                : null,
            parcelado: data.forma_pagamento === 'PARCELADO' ? data.pagamento_parcelado : [],
          },
          datas: { medida: data.data_medida },
          dados_etapa_1: { vendedor_nome: data.vendedor_nome },
        },
        { onConflict: 'lead_id' },
      )
      if (error) throw error
      if (clienteId)
        await supabase
          .from('clientes')
          .update({
            nome: data.nome,
            cpf: data.cpf,
            telefone: data.telefone,
            email: data.email,
            profissao: data.profissao,
          })
          .eq('id', clienteId)
      toast.success('Rascunho salvo com sucesso!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    await handleSaveDraft()
    toast.success('Dossiê finalizado! Redirecionando para Onboarding...')
    setTimeout(() => {
      if (onClose) onClose()
      navigate('/area-clientes')
    }, 2000)
  }

  if (loading)
    return (
      <div className="p-8 text-center text-midnight-navy font-bold">Carregando formulário...</div>
    )

  return (
    <div className="flex flex-col h-full bg-off-white overflow-hidden">
      <header className="bg-midnight-navy p-[16px] md:p-[24px] shrink-0 sticky top-0 z-10 flex flex-col md:flex-row md:items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-off-white text-[24px] md:text-[32px] font-[700] leading-tight">
            Formulário Comercial
          </h1>
          <p className="text-steel-blue text-[14px]">Cliente: {clienteNome}</p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="bg-steel-blue text-off-white px-[16px] py-[8px] rounded-[4px] font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
          {isModal && (
            <button
              onClick={onClose}
              className="text-off-white hover:text-steel-blue p-[8px] transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-[16px] md:p-[24px]">
        <div className="max-w-[1000px] mx-auto w-full">
          <SectionPessoal data={data} update={update} updateViaCep={updateViaCep} />
          <SectionEndereco data={data} update={update} updateViaCep={updateViaCep} />
          <SectionObra data={data} update={update} updateViaCep={updateViaCep} />
          <SectionProdutos data={data} update={update} updateViaCep={updateViaCep} total={total} />
          <SectionPagamento
            data={data}
            update={update}
            updateViaCep={updateViaCep}
            total={total}
            parcelasBatem={parcelasBatem}
          />
          <SectionDatas data={data} update={update} updateViaCep={updateViaCep} />
          <SectionResumo data={data} update={update} updateViaCep={updateViaCep} total={total} />
          <div className="flex flex-col md:flex-row justify-between gap-[16px] mt-[32px]">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] font-bold min-h-[44px] hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={!isValid || saving}
              className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] font-bold min-h-[44px] hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Gerar Dossiê
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
