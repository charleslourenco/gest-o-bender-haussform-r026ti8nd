import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { RegistrarRetalhoModal } from '@/components/estoque/RegistrarRetalhoModal'

const COLUMNS = [
  { id: 'aguardando_plano_corte', title: 'Aguardando plano de corte' },
  { id: 'router', title: 'Router' },
  { id: 'coladeira', title: 'Coladeira' },
  { id: 'bancada', title: 'Bancada' },
  { id: 'embalagem', title: 'Embalagem' },
  { id: 'expedicao', title: 'Expedição' },
  { id: 'aguardando_agenda', title: 'Concluído (Pronto p/ Montagem)' },
]

export default function Producao() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsModalOpen(true)
    window.addEventListener('open_registrar_retalho', handleOpen)
    return () => window.removeEventListener('open_registrar_retalho', handleOpen)
  }, [])

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 pt-0 space-y-4 animate-in fade-in duration-300">
      <div className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl relative mt-4">
        <KanbanBoard title="Produção" columns={COLUMNS} />
      </div>

      <RegistrarRetalhoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
