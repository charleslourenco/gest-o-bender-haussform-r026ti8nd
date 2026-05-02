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

  const handleSaveDraft = async (isGenerate = false) => {
    setSaving(true)
    try {
      const { data: savedForm, error } = await supabase
        .from('formulario_comercial')
        .upsert(
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
        .select()
        .single()
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

      if (!isGenerate) {
        toast.success('Rascunho salvo com sucesso!')
      }
      return savedForm
    } catch (e: any) {
      if (!isGenerate) {
        toast.error(e.message)
      }
      throw e
    } finally {
      setSaving(false)
    }
  }

  const [generating, setGenerating] = useState(false)
  const [validationError, setValidationError] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [apiErrorMessage, setApiErrorMessage] = useState('')

  const handleGenerate = async () => {
    if (!isValid) {
      setValidationError(true)
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setValidationError(false)
    setGenerating(true)

    try {
      const savedForm = await handleSaveDraft(true)
      if (!savedForm) throw new Error('Erro ao salvar rascunho.')

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Usuário não autenticado.')

      const { data: templates, error: tempError } = await supabase.from('templates').select('*')
      if (tempError) throw tempError
      if (!templates || templates.length === 0) {
        toast.error('Nenhum template encontrado no sistema.')
        setGenerating(false)
        return
      }

      toast.info(`Gerando ${templates.length} documentos...`, { id: 'gerando-doc' })

      const projeto_id = savedForm.id

      const dados_formulario = {
        // Original fields expected by the edge function
        nome: data.nome,
        cpf: data.cpf,
        profissao: data.profissao,
        estado_civil: data.estado_civil,
        telefone: data.telefone,
        email: data.email,
        cep: data.end_cep,
        rua: data.end_rua,
        numero: data.end_numero,
        complemento: data.end_complemento,
        bairro: data.end_bairro,
        municipio: data.end_municipio,
        estado: data.end_estado,

        // Required exactly by User Story specifications
        cliente_nome: data.nome || null,
        cliente_cpf_cnpj: data.cpf || null,
        cliente_profissao: data.profissao || null,
        cliente_estado_civil: data.estado_civil || null,
        cliente_telefone: data.telefone || null,
        cliente_email: data.email || null,

        cliente_cep: data.end_cep || null,
        cliente_rua: data.end_rua || null,
        cliente_numero: data.end_numero || null,
        cliente_complemento: data.end_complemento || null,
        cliente_bairro: data.end_bairro || null,
        cliente_cidade: data.end_municipio || null,
        cliente_estado: data.end_estado || null,

        obra_cep: data.obra_cep || null,
        obra_rua: data.obra_rua || null,
        obra_numero: data.obra_numero || null,
        obra_complemento: data.obra_complemento || null,
        obra_bairro: data.obra_bairro || null,
        obra_cidade: data.obra_municipio || null,
        obra_estado: data.obra_estado || null,

        datas: {
          acesso_movel: data.data_medida,
          assinatura_contrato: new Date().toISOString().split('T')[0],
        },
        data_acesso_movel: data.data_medida || null,
        data_assinatura_contrato: new Date().toISOString().split('T')[0],

        testemunha_01_nome: null,
        testemunha_01_cpf: null,
        testemunha_02_nome: null,
        testemunha_02_cpf: null,
        assinante_nome: data.nome || null,
        assinante_cpf: data.cpf || null,

        produtos_servicos: data.produtos.map((p) => ({
          ...p,
          nome_produto: p.nome,
          valor_total: p.qtd * p.valor_unitario,
        })),
        bloco_produtos_servicos: data.produtos.map((p) => ({
          nome: p.nome,
          descricao: p.descricao,
          valor: p.qtd * p.valor_unitario,
        })),
        ...data.produtos.reduce(
          (acc, p, i) => {
            if (i < 12) {
              acc[`produto_linha_${i + 1}_nome`] = p.nome || null
              acc[`produto_linha_${i + 1}_descricao`] = p.descricao || null
              acc[`produto_linha_${i + 1}_valor`] = p.qtd * p.valor_unitario || null
            }
            return acc
          },
          {} as Record<string, any>,
        ),

        forma_pagamento: data.forma_pagamento === 'A_VISTA' ? 'À Vista' : 'Parcelado',
        metodo_pagamento: data.forma_pagamento === 'A_VISTA' ? data.pagamento_a_vista_meio : null,
        data_pagamento: data.forma_pagamento === 'A_VISTA' ? data.pagamento_a_vista_data : null,
        pagamentos:
          data.forma_pagamento === 'PARCELADO'
            ? data.pagamento_parcelado.map((p, i) => ({
                numero: i + 1,
                valor: p.valor,
                data_vencimento: p.data,
              }))
            : [],
        bloco_parcelas:
          data.forma_pagamento === 'PARCELADO'
            ? data.pagamento_parcelado.map((p, i) => ({
                numero: i + 1,
                valor: p.valor,
                data_vencimento: p.data,
              }))
            : [],
        ...(data.forma_pagamento === 'PARCELADO'
          ? data.pagamento_parcelado.reduce(
              (acc, p, i) => {
                if (i < 12) {
                  acc[`parcela_${i + 1}_numero`] = i + 1
                  acc[`parcela_${i + 1}_valor`] = p.valor || null
                  acc[`parcela_${i + 1}_data_vencimento`] = p.data || null
                }
                return acc
              },
              {} as Record<string, any>,
            )
          : {}),

        empresa_nome: 'Minha Empresa de Móveis',
        empresa_cnpj: '00.000.000/0001-00',
        empresa_endereco: 'Rua Exemplo, 123',
        empresa_telefone: '(00) 0000-0000',
        empresa_email: 'contato@empresa.com',

        vendedor_nome: data.vendedor_nome || null,
        vendedor_cpf: null,
        vendedor_email: userData.user.email || null,
        vendedor_telefone: null,

        numero_projeto: projeto_id.substring(0, 8).toUpperCase(),
        valor_total: total,
        desconto: data.desconto || null,
        data_venda: new Date().toISOString().split('T')[0],
      }

      const promises = templates.map((t) =>
        supabase.functions
          .invoke('gerar_documento_cliente', {
            body: {
              template_nome: t.nome,
              cliente_id: clienteId,
              projeto_id,
              dados_formulario,
            },
          })
          .then((res) => {
            if (res.error) throw res.error
            if (!res.data?.sucesso)
              throw new Error(res.data?.mensagem || `Falha no template ${t.nome}`)
            return { template: t.nome, url: res.data.arquivo_url, avisos: res.data.avisos }
          })
          .catch((err) => {
            throw new Error(`Erro em ${t.nome}: ${err.message}`)
          }),
      )

      const results = await Promise.allSettled(promises)

      const failed = results.filter((r) => r.status === 'rejected')

      toast.dismiss('gerando-doc')

      // Garante que o dossiê exista no banco
      const { data: existingDossie } = await supabase
        .from('dossies')
        .select('id')
        .eq('formulario_comercial_id', projeto_id)
        .maybeSingle()
      if (!existingDossie) {
        await supabase.from('dossies').insert({
          user_id: userData.user.id,
          cliente_id: clienteId,
          formulario_comercial_id: projeto_id,
          status: 'em_documentacao',
        })
      }

      if (failed.length === templates.length) {
        toast.error('Não foi possível gerar o dossiê. Tente novamente.')
        setApiErrorMessage('Todos os templates falharam. Verifique a configuração dos documentos.')
      } else if (failed.length > 0) {
        const failedNames = failed.map((f: any) => f.reason?.message).join(', ')
        toast.warning('Dossiê gerado com avisos. Verifique os documentos.')
        toast.error(`Falhas: ${failedNames}`)
        setShowSuccessModal(true)
      } else {
        toast.success('Dossiê gerado com sucesso!')
        setShowSuccessModal(true)
      }
    } catch (e: any) {
      toast.dismiss('gerando-doc')
      toast.error('Erro no servidor. Tente novamente em alguns instantes.')
      setApiErrorMessage(e.message || 'Ocorreu um erro ao gerar o dossiê.')
    } finally {
      setGenerating(false)
    }
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
            onClick={() => handleSaveDraft(false)}
            disabled={saving || generating}
            className="bg-steel-blue text-off-white px-[16px] py-[8px] rounded-[4px] font-bold hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {saving && !generating ? 'Salvando...' : 'Salvar Rascunho'}
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
              onClick={() => handleSaveDraft(false)}
              disabled={saving || generating}
              className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] font-bold min-h-[44px] hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {saving && !generating ? 'Salvando...' : 'Salvar Rascunho'}
            </button>

            <div className="flex flex-col items-end gap-2">
              {validationError && (
                <span className="text-steel-blue text-[14px] font-medium">
                  Preencha todos os campos obrigatórios corretamente.
                </span>
              )}
              <button
                onClick={handleGenerate}
                disabled={saving || generating}
                className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] font-bold min-h-[44px] hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-off-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Gerando dossiê...
                  </>
                ) : (
                  'Gerar Dossiê'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-midnight-navy mb-4">FORMULÁRIO FINALIZADO!</h2>
            <p className="text-steel-blue mb-4 font-medium">
              Agora você precisa finalizar a documentação:
            </p>
            <ul className="list-disc pl-5 text-steel-blue mb-6 space-y-2">
              <li>Revise o contrato e encaminhe para assinatura</li>
              <li>Prepare a Ata de reunião de análise</li>
              <li>Faça upload dos renders e do arquivo do projeto</li>
            </ul>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  if (onClose) onClose()
                  navigate(`/clientes/${clienteId}`)
                }}
                className="bg-dark-denim text-white px-4 py-2 rounded font-bold hover:bg-opacity-90 transition-colors"
              >
                IR PARA CLIENTES
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Erro ao gerar dossiê</h2>
            <p className="text-steel-blue mb-6">{apiErrorMessage}</p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowErrorModal(false)}
                className="bg-steel-blue text-white px-4 py-2 rounded font-bold hover:bg-opacity-90 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
