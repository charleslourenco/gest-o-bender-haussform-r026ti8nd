import { useState } from 'react'
import { NAO_COMERCIAL_CATEGORIAS } from './constants'

interface Props {
  leadNome: string
  onClose: () => void
  onConfirm: (categoria: string) => void
}

export function MoverParaNaoComercialModal({ leadNome, onClose, onConfirm }: Props) {
  const [categoria, setCategoria] = useState('Outros Assuntos')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full relative z-10 shadow-xl animate-in fade-in-50 zoom-in-95 duration-200">
        <h2 className="text-foreground font-bold text-xl mb-2">Mover para Não Comercial</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Selecione a categoria de <strong className="text-foreground">{leadNome}</strong>. O lead
          sairá do kanban Comercial e passará a aparecer no kanban Não Comercial, na coluna "Novo".
        </p>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2.5 text-sm mb-6 outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          {NAO_COMERCIAL_CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-muted text-foreground border border-input px-5 py-2.5 rounded-md hover:bg-accent hover:text-accent-foreground font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(categoria)}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md hover:bg-primary/90 font-medium transition-colors shadow-sm"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  )
}
