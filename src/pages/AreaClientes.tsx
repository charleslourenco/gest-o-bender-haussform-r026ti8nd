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
    <div className="h-full flex flex-col bg-background">
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
  )
}
