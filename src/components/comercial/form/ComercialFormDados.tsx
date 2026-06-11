import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { FormState, defaultState } from './FormUtils'
import {
  SectionPessoal,
  SectionEndereco,
  SectionObra,
  SectionTotais,
  SectionPagamento,
  SectionDatas,
} from './FormSections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

const inputClass =
  'w-full bg-off-white border-2 border-steel-blue rounded-[4px] px-[12px] py-[8px] text-midnight-navy focus:outline-none focus:border-dark-denim transition-colors'

function SectionProdutosEnhanced({ data, update }: { data: any; update: any }) {
  const produtos = data.produtos || []

  const addProduto = () => {
    update('produtos', [
      ...produtos,
      {
        id: Math.random().toString(36).substring(2),
        nome: '',
        quantidade: 1,
        valor_unitario: 0,
        ambiente: '',
        tipo_fluxo: 'Fabricação',
      },
    ])
  }

  const removeProduto = (index: number) => {
    const newArr = [...produtos]
    newArr.splice(index, 1)
    update('produtos', newArr)
  }

  const updateProduto = (index: number, field: string, value: any) => {
    const newArr = [...produtos]
    if (field === 'solicitar_compra') {
      newArr[index] = { ...newArr[index], tipo_fluxo: value ? 'Compra Direta' : 'Fabricação' }
    } else {
      newArr[index] = { ...newArr[index], [field]: value }
    }
    update('produtos', newArr)
  }

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-[12px] gap-[12px]">
        <h2 className="font-bold text-[18px]">SEÇÃO 4 — PRODUTOS E SERVIÇOS</h2>
        <button
          type="button"
          onClick={addProduto}
          className="bg-dark-denim text-off-white px-[16px] py-[8px] rounded-[4px] font-semibold flex items-center gap-[8px] hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Adicionar Item
        </button>
      </div>

      {produtos.length === 0 && (
        <p className="text-[14px] text-midnight-navy/70 mb-4">Nenhum produto adicionado.</p>
      )}

      <div className="space-y-4">
        {produtos.map((p: any, i: number) => (
          <div
            key={p.id || i}
            className="flex flex-col gap-4 p-4 border-2 border-steel-blue/50 rounded-md relative bg-off-white/50"
          >
            <button
              onClick={() => removeProduto(i)}
              className="absolute top-2 right-2 text-steel-blue hover:text-red-500 transition-colors"
              title="Remover"
              type="button"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pr-6">
              <div className="md:col-span-5">
                <label className="block text-[14px] font-semibold mb-[4px]">Produto/Serviço</label>
                <input
                  className={inputClass}
                  value={p.nome || p.descricao || ''}
                  onChange={(e) => updateProduto(i, 'nome', e.target.value)}
                  placeholder="Ex: Armário Cozinha"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[14px] font-semibold mb-[4px]">Descrição</label>
                <input
                  className={inputClass}
                  value={p.ambiente || ''}
                  onChange={(e) => updateProduto(i, 'ambiente', e.target.value)}
                  placeholder="Ex: Cozinha"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[14px] font-semibold mb-[4px]">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={p.quantidade || p.qtd || 1}
                  onChange={(e) =>
                    updateProduto(i, 'quantidade', Math.max(1, Number(e.target.value)))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[14px] font-semibold mb-[4px]">Valor Unit. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={p.valor_unitario || ''}
                  onChange={(e) => updateProduto(i, 'valor_unitario', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id={`solicitar-compra-${i}`}
                checked={p.tipo_fluxo === 'Compra Direta'}
                onChange={(e) => updateProduto(i, 'solicitar_compra', e.target.checked)}
                className="w-4 h-4 text-dark-denim border-2 border-steel-blue rounded focus:ring-dark-denim cursor-pointer"
              />
              <label
                htmlFor={`solicitar-compra-${i}`}
                className="text-[14px] font-semibold cursor-pointer select-none text-midnight-navy"
              >
                Solicitar Compra (Item Solto/Terceiro)
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ComercialFormDados({ dossie, onSaved }: { dossie: any; onSaved: () => void }) {
  const [data, setData] = useState<FormState>(defaultState)
  const [saving, setSaving] = useState(false)

  const maskCpf = (v: string) => {
    let r = v.replace(/\D/g, '')
    if (r.length > 11) r = r.substring(0, 11)
    r = r.replace(/(\d{3})(\d)/, '$1.$2')
    r = r.replace(/(\d{3})(\d)/, '$1.$2')
    r = r.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    return r
  }

  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, '')
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
        cpf: form.cpf || cli.cpf ? maskCpf(form.cpf || cli.cpf) : '',
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

  const update = (f: keyof FormState, v: any) => {
    let value = v
    if (f === 'cpf' && typeof v === 'string') value = maskCpf(v)
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
    if (!data.cpf || data.telefone.replace(/\D/g, '').length < 10) {
      toast.error('Preencha CPF e Telefone válido antes de salvar.')
      return
    }

    setSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()

      const valorTotal =
        data.produtos.reduce(
          (acc: number, p: any) =>
            acc + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
          0,
        ) - (data.desconto || 0)
      const ambientesUnicos = Array.from(
        new Set(data.produtos.map((p: any) => p.ambiente || 'Geral')),
      )

      const payload: any = {
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
        const fabricacaoItems = data.produtos.filter((p: any) => p.tipo_fluxo !== 'Compra Direta')
        const compraDiretaItems = data.produtos.filter((p: any) => p.tipo_fluxo === 'Compra Direta')

        if (fabricacaoItems.length > 0) {
          const { data: existingCards } = await supabase
            .from('produtos_servicos_projeto')
            .select('nome_produto')
            .eq('formulario_comercial_id', formId)

          const existingNames = existingCards?.map((c) => c.nome_produto) || []

          const newCards = fabricacaoItems
            .filter(
              (p: any) =>
                !existingNames.includes(p.nome || p.descricao || p.nome_produto || 'Produto'),
            )
            .map((p: any) => ({
              formulario_comercial_id: formId,
              cliente_id: dossie.cliente_id,
              nome_produto: p.nome || p.nome_produto || p.descricao || 'Produto',
              qtd: p.quantidade || p.qtd || 1,
              descricao: p.descricao || '',
              valor_unitario: p.valor_unitario || 0,
              valor_total: p.valor_total || (p.valor_unitario || 0) * (p.quantidade || p.qtd || 1),
              status_analise: 'iniciar',
              codigo_rastreio: null, // Sistema gerará via trigger automaticamente
            }))

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
            .filter(
              (p: any) =>
                !existingReqNames.includes(p.nome || p.descricao || p.nome_produto || 'Item'),
            )
            .map((p: any) => ({
              nome_item: p.nome || p.nome_produto || p.descricao || 'Item de Compra',
              quantidade: p.quantidade || p.qtd || 1,
              unidade: 'un',
              urgencia: 'Média',
              status: 'Pendente',
              usuario_id: authData.user?.id,
              cliente_id: dossie.cliente_id,
              fornecedor: null,
              data_entrega_prevista: data.data_entrega_maxima || null,
              motivo: 'Gerado automaticamente via formulário comercial (Compra Direta)',
            }))

          if (newRequests.length > 0) {
            await supabase.from('solicitacoes_compra').insert(newRequests)
          }
        }
      }

      await supabase
        .from('clientes')
        .update({
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
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
      <SectionProdutosEnhanced data={data} update={update} />
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
