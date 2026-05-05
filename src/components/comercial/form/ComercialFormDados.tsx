import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FormState, defaultState } from './FormUtils'
import {
  SectionPessoal,
  SectionEndereco,
  SectionObra,
  SectionProdutos,
  SectionTotais,
  SectionPagamento,
  SectionDatas,
} from './FormSections'

export function ComercialFormDados({ dossie, onSaved }: { dossie: any; onSaved: () => void }) {
  const [data, setData] = useState<FormState>(defaultState)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (dossie) {
      const cli = dossie.cliente || {}
      const form = dossie.formulario || {}
      const pagamentosArr = Array.isArray(form.pagamentos)
        ? form.pagamentos
        : [form.pagamentos || {}]
      const pagData = pagamentosArr[0] || {}

      setData((p) => ({
        ...p,
        nome: cli.nome || '',
        email: cli.email || '',
        telefone: cli.telefone || '',
        cpf: form.cpf || cli.cpf || '',
        data_nascimento: form.data_nascimento || '',
        profissao: form.profissao || '',
        estado_civil: form.estado_civil || 'Solteiro',
        end_cep: form.cep || '',
        end_rua: form.rua || '',
        end_numero: form.numero || '',
        end_complemento: form.complemento || '',
        end_bairro: form.bairro || '',
        end_municipio: form.municipio || '',
        end_estado: form.estado || '',
        obra_cep: form.obra_cep || '',
        obra_rua: form.obra_rua || '',
        obra_numero: form.obra_numero || '',
        obra_complemento: form.obra_complemento || '',
        obra_bairro: form.obra_bairro || '',
        obra_municipio: form.obra_municipio || '',
        obra_estado: form.obra_estado || '',
        produtos:
          typeof form.produtos_servicos === 'string'
            ? JSON.parse(form.produtos_servicos || '[]')
            : form.produtos_servicos?.length > 0
              ? form.produtos_servicos
              : p.produtos,
        desconto: Number(form.desconto) || 0,
        forma_pagamento: pagData.forma === 'Parcelado' ? 'Parcelado' : 'À vista',
        pagamento_a_vista_meio: pagData.meio || pagData.metodo || 'PIX',
        pagamento_parcelado: pagData.parcelas || p.pagamento_parcelado,
        data_venda:
          (form.datas as any)?.data_venda ||
          dossie.criado_em?.split('T')[0] ||
          new Date().toISOString().split('T')[0],
        data_acesso_imovel: (form.datas as any)?.data_acesso_imovel || '',
        data_medicao_final: (form.datas as any)?.data_medicao_final || '',
        data_entrega_minima: (form.datas as any)?.data_entrega_minima || '',
        data_entrega_maxima: (form.datas as any)?.data_entrega_maxima || '',
      }))
    }
  }, [dossie])

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
        /* ignore */
      }
    }
  }

  const handleSave = async () => {
    if (!data.cpf || data.telefone.replace(/\D/g, '').length < 10) {
      toast.error('Preencha CPF e Telefone válido antes de salvar.')
      return
    }

    setSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('formulario_comercial')
        .update({
          cpf: data.cpf || null,
          data_nascimento: data.data_nascimento || null,
          profissao: data.profissao || null,
          estado_civil: data.estado_civil || null,
          cep: data.end_cep || null,
          rua: data.end_rua || null,
          numero: data.end_numero || null,
          complemento: data.end_complemento || null,
          bairro: data.end_bairro || null,
          municipio: data.end_municipio || null,
          estado: data.end_estado || null,
          obra_cep: data.obra_cep || null,
          obra_rua: data.obra_rua || null,
          obra_numero: data.obra_numero || null,
          obra_complemento: data.obra_complemento || null,
          obra_bairro: data.obra_bairro || null,
          obra_municipio: data.obra_municipio || null,
          obra_estado: data.obra_estado || null,
          produtos_servicos: data.produtos as any,
          desconto: data.desconto || 0,
          pagamentos: [
            {
              forma: data.forma_pagamento,
              meio: data.pagamento_a_vista_meio,
              parcelas: data.forma_pagamento === 'Parcelado' ? data.pagamento_parcelado : [],
            },
          ],
          datas: {
            data_venda: data.data_venda,
            data_acesso_imovel: data.data_acesso_imovel,
            data_medicao_final: data.data_medicao_final,
            data_entrega_minima: data.data_entrega_minima,
            data_entrega_maxima: data.data_entrega_maxima,
          },
          atualizado_em: new Date().toISOString(),
        })
        .eq('cliente_id', dossie.cliente_id)
        .eq('user_id', authData.user?.id)

      if (error) throw error

      await supabase
        .from('clientes')
        .update({
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
        })
        .eq('id', dossie.cliente_id)

      toast.success('Dados salvos com sucesso!')
      onSaved()
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <SectionPessoal data={data} update={update} />
      <SectionEndereco data={data} update={update} updateViaCep={updateViaCep} />
      <SectionObra data={data} update={update} updateViaCep={updateViaCep} />
      <SectionProdutos data={data} update={update} />
      <SectionTotais data={data} update={update} />
      <SectionPagamento data={data} update={update} />
      <SectionDatas data={data} update={update} />

      <div className="flex justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-dark-denim text-off-white px-[32px] py-[16px] rounded-[8px] font-bold text-lg hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : '💾 Salvar Todos os Dados'}
        </button>
      </div>
    </div>
  )
}
