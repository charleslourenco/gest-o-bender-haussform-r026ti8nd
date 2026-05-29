import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClientesList } from '@/components/area-clientes/clientes-list'
import { ClienteFolder } from '@/components/area-clientes/cliente-folder'
import { Users } from 'lucide-react'

export default function AreaClientes() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'lista' | 'pasta'>(id ? 'pasta' : 'lista')
  const [selectedDossieId, setSelectedDossieId] = useState<string | null>(id || null)

  useEffect(() => {
    if (id) {
      setSelectedDossieId(id)
      setActiveTab('pasta')
    } else {
      setActiveTab('lista')
      setSelectedDossieId(null)
    }
  }, [id])

  return (
    <div className="h-full flex flex-col bg-off-white animate-in fade-in duration-300">
      {/* Header Padronizado */}
      <div className="shrink-0 bg-midnight-navy px-6 lg:px-8 py-6 z-10 relative border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/5 shadow-inner">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-off-white tracking-tight truncate">Clientes</h1>
            <p className="text-sm text-pale-cornflower mt-1 truncate">
              Gestão de clientes e acompanhamento de projetos
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo do Módulo */}
      <div className="flex-1 p-6 overflow-hidden min-h-0">
        <div className="h-full bg-white rounded-xl border border-steel-blue/20 overflow-hidden shadow-sm flex flex-col">
          {activeTab === 'lista' ? (
            <ClientesList
              onSelect={(dossieId) => {
                navigate(`/clientes/${dossieId}`)
              }}
            />
          ) : (
            <ClienteFolder dossieId={selectedDossieId!} onBack={() => navigate('/clientes')} />
          )}
        </div>
      </div>
    </div>
  )
}
