import { Lead } from '@/types'

interface Props {
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmSellModal({ onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-midnight-navy opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-off-white rounded-lg p-6 max-w-md w-full relative z-10 border-t-4 border-dark-denim shadow-xl animate-fade-in-up">
        <h2 className="text-midnight-navy font-bold text-[24px] mb-4">Confirmar Venda</h2>
        <p className="text-midnight-navy mb-6">
          Tem certeza que deseja marcar como vendido? Isso iniciará o processo de documentação.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="bg-steel-blue text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="bg-dark-denim text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200"
          >
            Confirmar Venda
          </button>
        </div>
      </div>
    </div>
  )
}
