import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnaliseProjetoKanbanBoard } from '@/components/analise/AnaliseProjetoKanbanBoard'

export default function AnaliseTecnica() {
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const { count, error } = await supabase
          .from('solicitacoes_compra')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pendente')

        if (error) {
          console.error('Erro ao buscar solicitações pendentes:', error)
          return
        }

        if (count !== null && count > 0) {
          toast.warning(`Atenção: Existem ${count} solicitações de compra pendentes.`)
        }
      } catch (err) {
        console.error('Erro no processamento das solicitações de compra:', err)
      }
    }

    fetchPendingRequests()
  }, [])

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <AnaliseProjetoKanbanBoard />
    </div>
  )
}
