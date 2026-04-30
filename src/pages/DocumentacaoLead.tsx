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
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (!user)
      return supabase
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

  const handleNext = () => {
    if (!canAdvance) {
      setShake(true)
      setTimeout(() => setShake(false), 300)
      return
    }
    setStep(step + 1)
  }

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
      <div className="min-h-screen bg-off-white p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-[800px] h-[400px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
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
    <div className="min-h-screen bg-off-white p-[24px] animate-in fade-in duration-300">
      <div className="max-w-[800px] mx-auto mb-[24px]">
        <button
          onClick={() => navigate('/comercial')}
          className="text-steel-blue hover:text-dark-denim font-bold flex items-center gap-[8px] transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar ao Kanban
        </button>
      </div>

      <div className="max-w-[800px] mx-auto bg-midnight-navy p-[24px] rounded-t-[8px]">
        <h1 className="text-[32px] font-bold text-off-white mb-[8px] leading-tight">
          Formulário Comercial
        </h1>
        <div className="text-steel-blue text-[14px] font-bold mb-[16px]">Etapa {step} de 8</div>

        <div className="flex gap-[8px]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`h-[8px] flex-1 rounded-[4px] transition-all duration-500 ${
                step === i
                  ? 'bg-dark-denim'
                  : step > i
                    ? 'bg-steel-blue'
                    : 'bg-pale-cornflower opacity-50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-[800px] mx-auto bg-off-white p-[24px] rounded-b-[8px] shadow-sm border border-steel-blue min-h-[500px] flex flex-col mb-[48px]">
        <div className="flex-1">{renderStep()}</div>

        {step < 8 && (
          <div className="mt-[24px] pt-[24px] border-t-[2px] border-steel-blue flex flex-col md:flex-row justify-between gap-[16px]">
            <button className="bg-pale-cornflower text-midnight-navy px-[24px] py-[12px] rounded-[8px] font-bold hover:opacity-90 min-h-[44px] transition-all duration-200 order-2 md:order-1">
              Salvar Rascunho
            </button>
            <div className="flex flex-col md:flex-row gap-[16px] order-1 md:order-2">
              <button
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
                className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] font-bold hover:opacity-90 min-h-[44px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Voltar
              </button>
              <button
                onClick={handleNext}
                className={`bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] font-bold hover:opacity-90 min-h-[44px] transition-all duration-200 ${shake && !canAdvance ? 'animate-shake' : ''} ${!canAdvance ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Próximo
              </button>
            </div>
          </div>
        )}
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
