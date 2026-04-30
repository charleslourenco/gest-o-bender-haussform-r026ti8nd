import { useState, useEffect } from 'react'
import { Lead } from '@/types'
import { Step1Cliente } from './form/step-1'
import { FormProvider, useComercialForm } from '@/hooks/use-comercial-form'

interface Props {
  lead: Lead
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmSellModal({ lead, onClose, onConfirm }: Props) {
  const [view, setView] = useState<'confirm' | 'form'>('confirm')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirmSale = async () => {
    setIsLoading(true)
    setError('')
    try {
      await onConfirm()
      setView('form')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (view === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-midnight-navy opacity-80 transition-opacity"
          onClick={onClose}
        ></div>
        <div className="bg-off-white rounded-[8px] p-[32px] max-w-md w-full relative z-10 border-t-[4px] border-dark-denim shadow-2xl text-center animate-fade-in-up">
          <h2 className="text-midnight-navy font-[700] text-[24px] mb-[16px]">Confirmar Venda</h2>
          {error && <p className="text-steel-blue text-[14px] font-[700] mb-[16px]">{error}</p>}
          <p className="text-midnight-navy mb-[32px] text-[16px]">
            Tem certeza que deseja marcar como vendido? Isso iniciará o processo de documentação.
          </p>
          <div className="flex flex-col gap-[16px]">
            <button
              onClick={handleConfirmSale}
              disabled={isLoading}
              className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 min-h-[44px] font-[700] transition-all duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processando...' : 'Confirmar Venda'}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 min-h-[44px] font-[700] transition-all duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FormProvider>
      <FormModalWrapper lead={lead} onClose={onClose} />
    </FormProvider>
  )
}

function FormModalWrapper({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { setLead } = useComercialForm()

  useEffect(() => {
    setLead(lead)
  }, [lead, setLead])

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-midnight-navy/80 overflow-y-auto p-0 md:p-4">
      <div className="w-full min-h-screen md:min-h-0 md:max-w-[800px] bg-off-white md:rounded-[8px] flex flex-col shadow-2xl relative animate-fade-in-up">
        {/* HEADER */}
        <div className="bg-midnight-navy p-[24px] md:rounded-t-[8px] shrink-0">
          <h2 className="text-off-white text-[32px] font-[700] leading-tight mb-1">
            Formulário Comercial
          </h2>
          <p className="text-steel-blue text-[14px] font-[600]">Etapa 1 de 8</p>
        </div>

        {/* PROGRESS BAR */}
        <div className="px-[24px] pt-[24px] shrink-0">
          <div className="flex gap-[8px] mb-[24px]">
            <div className="h-[8px] rounded-[4px] bg-dark-denim flex-1" />
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-[8px] rounded-[4px] bg-pale-cornflower opacity-50 flex-1" />
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-[24px] pb-[24px] flex-1">
          <Step1Cliente onClose={onClose} />
        </div>
      </div>
    </div>
  )
}
