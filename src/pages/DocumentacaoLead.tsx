import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { FormProvider, useComercialForm } from '@/hooks/use-comercial-form'
import { AlertCircle } from 'lucide-react'

function FormContainer() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { lead, setLead, updateData } = useComercialForm()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          setHasPermission(false)
          return
        }

        const res = await supabase.functions.invoke('check-permission', {
          body: { action: 'read', modulo: 'Comercial' },
        })

        if (res.data?.allowed && ['Admin', 'Editor'].includes(res.data?.level)) {
          setHasPermission(true)
        } else {
          setHasPermission(false)
          return
        }

        if (id) {
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .single()

          if (leadError || !leadData) {
            throw new Error('Lead não encontrado')
          }
          setLead(leadData)

          const { data: formData } = await supabase
            .from('formulario_comercial')
            .select('*')
            .eq('lead_id', id)
            .maybeSingle()

          if (formData) {
            updateData('cliente', {
              cpf: formData.cpf || '',
              dataNasc: formData.data_nascimento ? formData.data_nascimento.split('T')[0] : '',
              profissao: formData.profissao || '',
              renda: formData.renda ? String(formData.renda).replace('.', ',') : '',
              refBancaria: formData.referencia_bancaria || '',
            })
          }
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [id, setLead, updateData])

  if (hasPermission === null || isLoading) {
    return (
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
        <header className="bg-midnight-navy p-[24px] shrink-0">
          <div className="max-w-[800px] mx-auto w-full">
            <div className="h-[38px] w-64 bg-pale-cornflower/20 animate-pulse rounded-lg mb-[8px]"></div>
            <div className="h-[20px] w-32 bg-pale-cornflower/20 animate-pulse rounded-lg mb-[24px]"></div>
          </div>
        </header>
        <main className="flex-1 p-[24px] overflow-y-auto">
          <div className="max-w-[800px] mx-auto space-y-4 w-full">
            <div className="h-[44px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
            <div className="h-[44px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
            <div className="h-[44px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
        <header className="bg-midnight-navy p-[24px] shrink-0">
          <div className="max-w-[800px] mx-auto w-full">
            <h1 className="text-off-white text-[32px] font-[700]">Formulário Comercial</h1>
          </div>
        </header>
        <main className="flex-1 p-[24px] flex items-center justify-center overflow-y-auto">
          <div className="bg-pale-cornflower p-[24px] rounded-[8px] text-center border-[2px] border-steel-blue w-full max-w-[400px]">
            <p className="text-midnight-navy font-[600] text-[18px]">
              Você não tem permissão para acessar este módulo.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-[16px] bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 transition-all font-bold w-full min-h-[44px]"
            >
              Voltar ao Início
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
        <header className="bg-midnight-navy p-[24px] shrink-0">
          <div className="max-w-[800px] mx-auto w-full">
            <h1 className="text-off-white text-[32px] font-[700]">Formulário Comercial</h1>
          </div>
        </header>
        <main className="flex-1 p-[24px] flex items-center justify-center overflow-y-auto">
          <div className="bg-off-white p-[24px] rounded-[8px] text-center flex flex-col items-center max-w-[400px] w-full">
            <AlertCircle className="w-12 h-12 text-steel-blue mb-4" />
            <p className="text-midnight-navy font-[600] text-[18px] mb-6">
              {error ? error : "Nenhum lead selecionado. Volte ao Kanban e arraste para 'Vendido'."}
            </p>
            <button
              onClick={() => (error ? window.location.reload() : navigate('/comercial'))}
              className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 transition-all font-bold w-full min-h-[44px]"
            >
              {error ? 'Tentar Novamente' : 'Voltar ao Kanban'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
      <header className="bg-midnight-navy p-[24px] shrink-0">
        <div className="max-w-[800px] mx-auto w-full">
          <h1 className="text-off-white text-[32px] font-[700] mb-[8px]">Formulário Comercial</h1>
          <p className="text-steel-blue text-[14px] font-[600]">Documentação do Cliente</p>
        </div>
      </header>
      <main className="flex-1 p-[24px] overflow-y-auto">
        <div className="max-w-[800px] mx-auto bg-off-white w-full rounded-[8px]">
          <div className="bg-pale-cornflower/30 border-2 border-dashed border-steel-blue rounded-[8px] p-[48px] text-center">
            <h3 className="text-midnight-navy font-[700] text-[20px] mb-[8px]">
              Novo Formulário (Em Breve)
            </h3>
            <p className="text-steel-blue text-[16px]">
              O ambiente está pronto para receber a nova versão de página única.
            </p>
            <div className="mt-[32px] flex justify-center">
              <button
                onClick={() => navigate('/comercial')}
                className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 transition-all duration-200 min-h-[44px] font-bold"
              >
                Voltar ao Kanban
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DocumentacaoLead() {
  return (
    <FormProvider>
      <FormContainer />
    </FormProvider>
  )
}
