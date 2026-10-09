import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lead } from '@/types'
import { moveLeadToClient } from '@/services/comercial'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'

interface Props {
  lead: Lead
  onClose: () => void
  pendingUpdates?: {
    categoria?: string
    notas_pessoais?: string
  }
  onSuccess?: () => void
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ConfirmSellModal({ lead, onClose, pendingUpdates, onSuccess }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dossieId, setDossieId] = useState<string | null>(null)

  const handleStartDoc = async () => {
    setIsLoading(true)
    setError('')
    try {
      let activeUserId = user?.id

      // Se o user ainda não estiver no contexto, tenta obter da sessão do Supabase
      if (!activeUserId || !UUID_REGEX.test(activeUserId)) {
        const { data: sessionData } = await supabase.auth.getSession()
        activeUserId = sessionData?.session?.user?.id
      }

      if (!activeUserId || !UUID_REGEX.test(activeUserId)) {
        setError('Carregando autenticação... Por favor, aguarde um instante e tente novamente.')
        setIsLoading(false)
        return
      }

      const id = await moveLeadToClient(lead, activeUserId)

      // Gravar alterações pendentes (categoria e/ou notas_pessoais) se houverem
      if (
        pendingUpdates &&
        (pendingUpdates.categoria || pendingUpdates.notas_pessoais !== undefined)
      ) {
        const updatesToPersist: Record<string, any> = {}
        if (pendingUpdates.categoria) updatesToPersist.categoria = pendingUpdates.categoria
        if (pendingUpdates.notas_pessoais !== undefined)
          updatesToPersist.notas_pessoais = pendingUpdates.notas_pessoais
        const { error: updErr } = await supabase
          .from('leads')
          .update(updatesToPersist)
          .eq('id', lead.id)
        if (updErr) {
          console.warn(
            '[ConfirmSellModal] Falha ao persistir alterações pendentes da venda:',
            updErr,
          )
        }
      }

      setDossieId(id)
      setIsLoading(false)
      onSuccess?.()
    } catch (err: any) {
      setError(err?.message || 'Erro ao processar venda')
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
