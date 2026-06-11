import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function AnaliseKanbanCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onCheckOutsourced,
}: any) {
  const needsCheck = card.outsourced_checked === false || card.outsourced_checked === null
  const [users, setUsers] = useState<any[]>([])
  const [analistaId, setAnalistaId] = useState<string>(card.analista_id || '')
  const { toast } = useToast()

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nome')
        .eq('status', true)
        .order('nome')
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  const handleAssign = async (userId: string) => {
    setAnalistaId(userId)
    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ analista_id: userId })
      .eq('id', card.id)

    if (error) {
      toast({ title: 'Erro ao atribuir analista', variant: 'destructive' })
      setAnalistaId(card.analista_id || '')
    } else {
      toast({ title: 'Analista atribuído com sucesso' })
    }
  }

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex flex-col gap-1.5 p-2 w-full h-fit bg-[#1A3D63] text-white rounded-md shadow-sm cursor-grab hover:shadow-md hover:border-blue-400/50 transition-all border border-transparent ${card.is_outsourced ? 'border-orange-500' : ''} ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex flex-row items-center justify-between gap-1 w-full text-[10px] mb-0.5">
        {card.codigo_rastreio ? (
          <span className="font-bold text-blue-200 truncate">{card.codigo_rastreio}</span>
        ) : (
          <span className="text-transparent">N/A</span>
        )}
        {needsCheck && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCheckOutsourced()
            }}
            title="Possui Terceirizado?"
            className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center justify-center hover:bg-amber-600 cursor-pointer shrink-0"
          >
            ⚠️
          </button>
        )}
      </div>

      {card.clientes?.nome && (
        <span className="truncate text-slate-300 text-[10px] leading-none">
          {card.clientes.nome}
        </span>
      )}

      <h4 className="font-medium text-xs leading-snug line-clamp-2 w-full break-words">
        {card.nome_produto}
      </h4>

      <div
        className="mt-1 flex items-center gap-1 border-t border-slate-700/50 pt-1.5"
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onClick={stopPropagation}
      >
        <Select value={analistaId} onValueChange={handleAssign}>
          <SelectTrigger className="h-7 bg-[#0F243B] border-slate-700/50 text-[10px] px-2 text-slate-300 w-full focus:ring-0 focus:ring-offset-0">
            <div className="flex items-center gap-1.5 truncate">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <SelectValue placeholder="Atribuir responsável" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[#132A46] border-slate-700">
            {users.map((u) => (
              <SelectItem
                key={u.id}
                value={u.id}
                className="text-xs text-slate-200 focus:bg-[#1A3D63] focus:text-white"
              >
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
