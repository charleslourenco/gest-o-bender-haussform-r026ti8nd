import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnaliseKanbanBoard } from '@/components/analise/AnaliseKanbanBoard'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const COLUMNS = [
  { id: 'iniciar', title: 'Iniciar' },
  { id: 'aguardando_liberacao', title: 'Aguardando liberação' },
  { id: 'medida_fina', title: 'Medida fina' },
  { id: 'reuniao_analise', title: 'Reunião de análise' },
  { id: 'caderno_tecnico', title: 'Caderno técnico' },
  { id: 'alteracao_projeto', title: 'Alteração de projeto' },
  { id: 'lista_materiais', title: 'Lista de materiais' },
  { id: 'aguardando_plano_corte', title: 'Concluído (Pronto p/ Produção)' },
]

export default function AnaliseTecnicaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!id) return
      const { data } = await supabase
        .from('formulario_comercial')
        .select('clientes(nome)')
        .eq('id', id)
        .single()

      if (data?.clientes && (data.clientes as any).nome) {
        setClientName((data.clientes as any).nome)
      }
    }
    fetchProjectDetails()
  }, [id])

  return (
    <div className="h-full flex flex-col bg-[#0B1B2E] animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="px-4 py-3 bg-[#132A46] border-b border-slate-800 flex items-center shadow-sm z-10 shrink-0 gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/analise-tecnica')}
          className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-bold text-lg text-white">
          Projeto {clientName ? `- ${clientName}` : ''}
        </h2>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        <AnaliseKanbanBoard title="Itens do Projeto" columns={COLUMNS} formularioComercialId={id} />
      </div>
    </div>
  )
}
