import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { maskCpfCnpj, isValidCpfCnpj, detectTipoPessoa } from '@/lib/cpf-cnpj'
import { FormState, defaultState } from './FormUtils'
import {
  SectionPessoal,
  SectionEndereco,
  SectionObra,
  SectionTotais,
  SectionPagamento,
  SectionDatas,
  SectionProdutos,
} from './FormSections'

export function ComercialFormDados({ dossie, onSaved }: { dossie: any; onSaved: () => void }) {
  const [data, setData] = useState<FormState>(defaultState)
  const [saving, setSaving] = useState(false)

  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, '')
    if ((r.length === 12 || r.length === 13) && r.startsWith('55')) {
      r = r.substring(2)
    }
    if (r.length > 11) r = r.substring(0, 11)
    if (r.length > 2) {
      r = r.replace(/^(\d{2})(\d)/g, '($1) $2')
      if (r.length > 9) {
        r = r.replace(/(\d{4,5})(\d{4})$/, '$1-$2')
      }
    }
    return r
  }

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
        telefone: cli.telefone ? maskPhone(cli.telefone) : '',
        cpf: form.cpf || cli.cpf ? maskCpfCnpj(form.cpf || cli.cpf) : '',
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
        produtos: (() => {
          const raw =
            typeof form.produtos_servicos === 'string'
              ? JSON.parse(form.produtos_servicos || '[]')
              : form.produtos_servicos?.length > 0
                ? form.produtos_servicos
                : p.produtos
          return raw.map((item: any) => ({
            id: item.id || Math.random().toString(36).substring(2),
            nome: item.nome || item.descricao || '',
            qtd: item.qtd || item.quantidade || 1,
            descricao: item.descricao || item.ambiente || '',
            valor_unitario: item.valor_unitario || 0,
            is_outsourced: item.is_outsourced || item.tipo_fluxo === 'Compra Direta' || false,
          }))
        })(),
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

  const update = (f: keyof FormState, v: any) => {
    let value = v
    if (f === 'cpf' && typeof v === 'string') value = maskCpfCnpj(v)
    if (f === 'telefone' && typeof v === 'string') value = maskPhone(v)
    setData((p) => ({ ...p, [f]: value }))
  }

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
    if (!data.cpf || !isValidCpfCnpj(data.cpf)) {
      toast.error('CPF/CNPJ inválido. Verifique o documento informado.')
      return
    }

    if (data.telefone.replace(/\D/g, '').length < 10) {
      toast.error('Preencha um telefone válido.')
      return
    }

    setSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()

      const valorTotal =
        data.produtos.reduce(
          (acc: number, p: any) => acc + Number(p.valor_unitario || 0) * Number(p.qtd || 1),
          0,
        ) - (data.desconto || 0)

      if (data.forma_pagamento === 'Parcelado' && data.pagamento_parcelado?.length > 0) {
        const somaParcelas = data.pagamento_parcelado.reduce(
          (acc: number, p: any) => acc + (Number(p.valor) || 0),
          0,
        )
        if (Math.abs(somaParcelas - valorTotal) > 0.01) {
          toast.error(
            `A soma das parcelas (R$ ${somaParcelas.toFixed(2)}) não corresponde ao valor total (R$ ${valorTotal.toFixed(2)}). Ajuste as parcelas ou clique em "Recalcular Parcelas Iguais" antes de salvar.`,
          )
          return
        }
      }

      const ambientesUnicos = Array.from(
        new Set(data.produtos.map((p: any) => p.descricao || 'Geral')),
      )

      const tipoPessoa = detectTipoPessoa(data.cpf) || 'PF'

      const payload: any = {
        cpf: data.cpf || null,
        tipo_pessoa: tipoPessoa,
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
        valor_total: valorTotal,
        parcelas: data.forma_pagamento === 'Parcelado' ? data.pagamento_parcelado : [],
        metodo_pagamento: data.pagamento_a_vista_meio,
        data_pagamento: data.data_venda || null,
        nome_cliente: data.nome,
        ambientes: ambientesUnicos,
        itens: data.produtos,
        especificacoes: JSON.stringify(data.produtos.map((p: any) => p.descricao || p.nome || '')),
        data_prevista_entrega: data.data_entrega_maxima || null,
        atualizado_em: new Date().toISOString(),
      }

      const { error, data: formUpdateData } = await supabase
        .from('formulario_comercial')
        .update(payload)
        .eq('cliente_id', dossie.cliente_id)
        .select('id')

      if (error) throw error

      const formId = formUpdateData?.[0]?.id

      if (formId && data.produtos && data.produtos.length > 0) {
        const compraDiretaItems = data.produtos.filter((p: any) => p.is_outsourced)
        const allItems = data.produtos

        if (allItems.length > 0) {
          const { data: existingCards } = await supabase
            .from('produtos_servicos_projeto')
            .select('nome_produto')
            .eq('formulario_comercial_id', formId)

          const existingNames = existingCards?.map((c) => c.nome_produto) || []

          const newCards = allItems
            .filter((p: any) => {
              const productName = p.nome || p.nome_produto || p.descricao || 'Produto'
              return !existingNames.includes(productName)
            })
            .map((p: any) => {
              const productName = p.nome || p.nome_produto || p.descricao || 'Produto'
              return {
                formulario_comercial_id: formId,
                cliente_id: dossie.cliente_id,
                nome_produto: productName,
                qtd: p.qtd || 1,
                descricao: p.descricao || '',
                valor_unitario: p.valor_unitario || 0,
                valor_total: (p.valor_unitario || 0) * (p.qtd || 1),
                status_analise: 'iniciar',
                is_outsourced: p.is_outsourced || false,
                codigo_rastreio: null,
              }
            })

          if (newCards.length > 0) {
            await supabase.from('produtos_servicos_projeto').insert(newCards)
          }
        }

        if (compraDiretaItems.length > 0) {
          const { data: existingSolicitacoes } = await supabase
            .from('solicitacoes_compra')
            .select('nome_item')
            .eq('cliente_id', dossie.cliente_id)

          const existingReqNames = existingSolicitacoes?.map((s) => s.nome_item) || []

          const newRequests = compraDiretaItems
            .filter((p: any) => {
              const itemName = p.nome || p.nome_produto || p.descricao || 'Item de Compra'
              return !existingReqNames.includes(itemName)
            })
            .map((p: any) => {
              const itemName = p.nome || p.nome_produto || p.descricao || 'Item de Compra'
              return {
                nome_item: itemName,
                quantidade: p.qtd || 1,
                unidade: 'un',
                urgencia: 'Média',
                status: 'Pendente',
                usuario_id: authData.user?.id,
                cliente_id: dossie.cliente_id,
                fornecedor: null,
                data_entrega_prevista: data.data_entrega_maxima || null,
                motivo: 'Gerado automaticamente via formulário comercial (Compra Direta)',
              }
            })

          if (newRequests.length > 0) {
            await supabase.from('solicitacoes_compra').insert(newRequests)
          }
        }
      }

      if (formId) {
        const parcelasParaReceber =
          data.forma_pagamento === 'Parcelado' && data.pagamento_parcelado?.length > 0
            ? data.pagamento_parcelado
            : [
                {
                  data: data.data_venda || new Date().toISOString().split('T')[0],
                  valor: valorTotal,
                  meio: data.pagamento_a_vista_meio || 'PIX',
                },
              ]

        await supabase.from('contas_receber').delete().eq('formulario_comercial_id', formId)

        const contasReceberInserts = parcelasParaReceber.map((p: any, i: number) => ({
          cliente_id: dossie.cliente_id,
          formulario_comercial_id: formId,
          user_id: authData.user?.id,
          numero_parcela: `${i + 1}/${parcelasParaReceber.length}`,
          data_vencimento: p.data,
          valor: p.valor,
          status_pagamento: 'aguardando',
          meio_pagamento: p.meio || 'PIX',
          descricao: `Parcela ${i + 1}/${parcelasParaReceber.length} - ${data.nome || ''}`,
          categoria: 'Venda',
        }))

        if (contasReceberInserts.length > 0) {
          await supabase.from('contas_receber').insert(contasReceberInserts)
        }
      }

      await supabase
        .from('clientes')
        .update({
          nome: data.nome,
          email: data.email,
          telefone: data.telefone.replace(/\D/g, ''),
          cpf: data.cpf,
          tipo_pessoa: tipoPessoa,
        })
        .eq('id', dossie.cliente_id)

      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: 'Dados do cliente atualizados',
      })

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
