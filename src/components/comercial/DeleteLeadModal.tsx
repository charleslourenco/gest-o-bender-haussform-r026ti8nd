import { useAuth } from '@/hooks/use-auth'

interface Props {
  onClose: () => void
  onConfirm: () => void
}

export function DeleteLeadModal({ onClose, onConfirm }: Props) {
  const { isAdmin } = useAuth()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-midnight-navy opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-off-white rounded-lg p-6 max-w-md w-full relative z-10 border-t-4 border-dark-denim shadow-xl animate-fade-in-up">
        <h2 className="text-midnight-navy font-bold text-[24px] mb-4">Deletar Lead</h2>
        {isAdmin ? (
          <p className="text-midnight-navy mb-6">
            Tem certeza que deseja deletar este lead? Esta ação não pode ser desfeita.
          </p>
        ) : (
          <p className="text-midnight-navy mb-6">
            Apenas administradores podem excluir leads. Você pode arquivar o lead em vez disso.
          </p>
        )}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="bg-steel-blue text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200"
          >
            Cancelar
          </button>
          {isAdmin && (
            <button
              onClick={onConfirm}
              className="bg-dark-denim text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200"
            >
              Deletar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
