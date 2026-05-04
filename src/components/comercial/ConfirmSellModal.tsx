import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lead } from '@/types'
import { moveLeadToClient } from '@/services/comercial'
import { useAuth } from '@/hooks/use-auth'

interface Props {
  lead: Lead
  onClose: () => void
}

export function ConfirmSellModal({ lead, onClose }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dossieId, setDossieId] = useState<string | null>(null)

  const handleStartDoc = async () => {
    setIsLoading(true)
    setError('')
    try {
      const id = await moveLeadToClient(lead, user?.id || '')
      setDossieId(id)
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-midnight-navy opacity-80 transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-off-white rounded-[8px] p-[32px] max-w-md w-full relative z-10 border-t-[4px] border-dark-denim shadow-2xl text-center animate-fade-in-up">
        <h2 className="text-midnight-navy font-[700] text-[24px] mb-[16px]">
          Parabéns pela venda! 🎉
        </h2>
        {error && <p className="text-steel-blue text-[14px] font-[700] mb-[16px]">{error}</p>}

        {dossieId ? (
          <>
            <p className="text-midnight-navy mb-[32px] text-[16px]">
              A pasta do cliente {lead.nome} e o formulário comercial foram criados com sucesso!
            </p>
            <div className="flex flex-col gap-[16px]">
              <button
                onClick={() => navigate(`/clientes/${dossieId}`)}
                className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 min-h-[44px] font-[700] transition-all duration-200 w-full focus:outline-none focus:ring-2 focus:ring-dark-denim focus:ring-offset-2"
              >
                Ir para a Pasta do Cliente
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-midnight-navy mb-[32px] text-[16px]">
              Você acaba de fechar uma venda com {lead.nome}. Vamos preparar a pasta do cliente.
            </p>
            <div className="flex flex-col gap-[16px]">
              <button
                onClick={handleStartDoc}
                disabled={isLoading}
                className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 min-h-[44px] font-[700] transition-all duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-dark-denim focus:ring-offset-2"
              >
                {isLoading ? 'Processando...' : 'Preparar Pasta'}
              </button>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 min-h-[44px] font-[700] transition-all duration-200 w-full disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-steel-blue focus:ring-offset-2"
              >
                Voltar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
