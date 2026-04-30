interface Props {
  onClose: () => void
  onConfirm: () => void
}

export function DeleteLeadModal({ onClose, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-midnight-navy opacity-50" onClick={onClose}></div>
      <div className="bg-off-white rounded-lg p-6 max-w-md w-full relative z-10 border-t-4 border-dark-denim">
        <h2 className="text-midnight-navy font-bold text-[24px] mb-4">Deletar Lead</h2>
        <p className="text-midnight-navy mb-6">
          Tem certeza que deseja deletar este lead? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="bg-steel-blue text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="bg-dark-denim text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px]"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  )
}
