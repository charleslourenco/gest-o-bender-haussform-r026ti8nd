import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClientesList } from '@/components/area-clientes/clientes-list'
import { ClienteFolder } from '@/components/area-clientes/cliente-folder'

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
    <div className="h-full flex flex-col animate-in fade-in duration-300 print-format-wrapper">
      {/* Conteúdo do Módulo */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="min-h-[calc(100vh-12rem)] bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
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
