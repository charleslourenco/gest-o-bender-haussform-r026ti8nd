import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClientesList } from '@/components/area-clientes/clientes-list'
import { ClienteFolder } from '@/components/area-clientes/cliente-folder'

export default function AreaClientes() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'lista' | 'pasta'>(id ? 'pasta' : 'lista')
  const [selectedFormId, setSelectedFormId] = useState<string | null>(id || null)

  useEffect(() => {
    if (id) {
      setSelectedFormId(id)
      setActiveTab('pasta')
    } else {
      setActiveTab('lista')
      setSelectedFormId(null)
    }
  }, [id])

  return (
    <div className="h-full flex flex-col bg-background">
      {activeTab === 'lista' ? (
        <ClientesList
          onSelect={(formId) => {
            navigate(`/clientes/${formId}`)
          }}
        />
      ) : (
        <ClienteFolder formId={selectedFormId!} onBack={() => navigate('/clientes')} />
      )}
    </div>
  )
}
