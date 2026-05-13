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
    <div className="h-full flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <Users className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-[32px] font-bold text-off-white">Área de Clientes</h1>
          <p className="text-pale-cornflower mt-1">Gestão de dossiês e documentos dos clientes</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl border border-steel-blue/20">
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
  )
}
