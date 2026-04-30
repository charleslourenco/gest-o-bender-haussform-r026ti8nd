import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FormProvider, useComercialForm } from '@/hooks/use-comercial-form'
import { fetchLeads } from '@/services/comercial'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Step1Cliente } from '@/components/comercial/form/step-1'
import { Step2Obra } from '@/components/comercial/form/step-2'
import { Step3Ambientes } from '@/components/comercial/form/step-3'
import { Step4Produtos } from '@/components/comercial/form/step-4'
import { Step5Pagamento } from '@/components/comercial/form/step-5'
import { Step6Documentos } from '@/components/comercial/form/step-6'
import { Step7Revisao } from '@/components/comercial/form/step-7'
import { Step8Contrato } from '@/components/comercial/form/step-8'

function FormWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { step, setStep, setLead, canAdvance } = useComercialForm()
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('matriz_permissoes')
      .select('nivel_acesso')
      .eq('usuario_id', user.id)
      .eq('modulo', 'Comercial')
      .single()
      .then(({ data }) => {
        if (data && (data.nivel_acesso === 'Editor' || data.nivel_acesso === 'Admin')) {
          setHasPermission(true)
        } else {
          setHasPermission(false)
        }
      })
  }, [user])

  useEffect(() => {
    fetchLeads().then((leads) => {
      const found = leads.find((l) => l.id === id)
      if (found) setLead(found)
      setLoading(false)
    })
  }, [id, setLead])

  if (hasPermission === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-off-white p-4">
        <div className="text-midnight-navy font-bold text-2xl text-center max-w-md">
          Você não tem permissão para acessar este módulo.
        </div>
      </div>
    )
  }

  if (loading || hasPermission === null) {
    return (
      <div className="min-h-screen bg-off-white p-4 md:p-8 flex flex-col">
        <div className="p-6 text-midnight-navy font-bold text-center m-auto animate-pulse">
          <div className="w-12 h-12 border-4 border-dark-denim border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Carregando formulário...
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Cliente />
      case 2:
        return <Step2Obra />
      case 3:
        return <Step3Ambientes />
      case 4:
        return <Step4Produtos />
      case 5:
        return <Step5Pagamento />
      case 6:
        return <Step6Documentos />
      case 7:
        return <Step7Revisao />
      case 8:
        return <Step8Contrato />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-off-white p-4 md:p-8 animate-in fade-in duration-300">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/comercial')}
          className="text-steel-blue hover:text-dark-denim font-bold flex items-center gap-2 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar ao Kanban
        </button>

        <div className="bg-midnight-navy p-8 rounded-t-2xl shadow-md">
          <h1 className="text-[32px] font-bold text-off-white mb-2">Formulário Comercial</h1>
          <div className="text-steel-blue font-semibold">Etapa {step} de 8</div>

          <div className="flex gap-2 mt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-dark-denim' : 'bg-pale-cornflower/20'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-off-white border-x-2 border-b-2 border-steel-blue/20 p-8 rounded-b-2xl shadow-md min-h-[500px] flex flex-col">
          <div className="flex-1">{renderStep()}</div>

          {step < 8 && (
            <div className="mt-12 pt-6 border-t-2 border-steel-blue/20 flex flex-col sm:flex-row justify-between gap-4">
              <button className="bg-pale-cornflower text-midnight-navy px-6 py-3 rounded-lg font-bold hover:opacity-90 min-h-[44px] transition-all order-3 sm:order-1">
                Salvar Rascunho
              </button>
              <div className="flex gap-4 order-1 sm:order-2 w-full sm:w-auto">
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  className="flex-1 sm:flex-none bg-steel-blue text-off-white px-6 py-3 rounded-lg font-bold hover:opacity-90 min-h-[44px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance}
                  className="flex-1 sm:flex-none bg-dark-denim text-off-white px-8 py-3 rounded-lg font-bold hover:opacity-90 min-h-[44px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DocumentacaoLead() {
  return (
    <FormProvider>
      <FormWizard />
    </FormProvider>
  )
}
