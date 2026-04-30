import { Lead } from '@/types'
import { useNavigate } from 'react-router-dom'

interface Props {
  lead: Lead
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmSellModal({ lead, onClose, onConfirm }: Props) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-midnight-navy opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-off-white rounded-lg p-8 max-w-md w-full relative z-10 border-t-4 border-dark-denim shadow-xl animate-fade-in-up text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-midnight-navy font-bold text-[24px] mb-4">Parabéns pela venda!</h2>
        <p className="text-midnight-navy mb-8 text-base">
          Você vendeu um projeto para <strong className="font-bold">{lead.nome}</strong>. Agora
          prepare a documentação do cliente.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              await onConfirm()
              navigate(`/comercial/documentacao/${lead.id}`)
            }}
            className="bg-dark-denim text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-semibold transition-opacity duration-200 w-full"
          >
            Ir para formulário de documentação
          </button>
          <button
            onClick={onClose}
            className="bg-steel-blue text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-semibold transition-opacity duration-200 w-full"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
