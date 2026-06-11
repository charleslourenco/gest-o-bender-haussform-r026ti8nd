import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserCircle2, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

export function AnaliseKanbanCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onCheckOutsourced,
  onDelete,
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

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()

    if (card.is_parent_card && card.formulario_comercial_id) {
      const { error } = await supabase
        .from('formulario_comercial')
        .delete()
        .eq('id', card.formulario_comercial_id)

      if (error) {
        toast({
          title: 'Erro ao excluir projeto',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Projeto excluído com sucesso!' })
        if (onDelete) onDelete(card.id)
      }
    } else {
      const { error } = await supabase.from('produtos_servicos_projeto').delete().eq('id', card.id)

      if (error) {
        toast({ title: 'Erro ao excluir card', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Card excluído com sucesso!' })
        if (onDelete) onDelete(card.id)
      }
    }
  }

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
      className={`flex flex-col gap-1.5 p-3 w-full h-fit bg-[#1A3D63] text-[#F6FAFD] rounded-lg shadow-sm cursor-grab hover:shadow-md hover:border-[#4B7BB0] transition-all border ${card.is_outsourced ? 'border-orange-500' : 'border-[#2A5282]'} ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex flex-row items-center gap-1 w-full text-[10px] mb-0.5">
        {card.codigo_rastreio ? (
          <span className="font-bold text-blue-600 truncate bg-blue-50 px-1.5 py-0.5 rounded">
            {card.codigo_rastreio}
          </span>
        ) : (
          <span className="text-transparent">N/A</span>
        )}
        <div className="ml-auto flex items-center gap-1">
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="text-[#F6FAFD]/60 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-500/20 shrink-0"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                title={card.is_parent_card ? 'Excluir Projeto' : 'Excluir Card'}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {card.is_parent_card ? 'Excluir Projeto?' : 'Excluir Card?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {card.is_parent_card
                    ? 'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.'
                    : 'Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white border-none"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {card.clientes?.nome && (
        <span className="truncate text-[#F6FAFD]/70 font-medium text-xs leading-none mb-1">
          {card.clientes.nome}
        </span>
      )}

      <div className="flex flex-col gap-1 w-full my-1">
        {card.is_parent_card && card.project_item_names ? (
          card.project_item_names
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map((item: string, i: number) => (
              <div
                key={i}
                className="text-xs text-[#F6FAFD] bg-[#0F294A] border border-[#2A5282] px-2 py-1 rounded w-full break-words leading-tight"
              >
                • {item}
              </div>
            ))
        ) : (
          <div className="text-xs text-[#F6FAFD] bg-[#0F294A] border border-[#2A5282] px-2 py-1 rounded w-full break-words leading-tight">
            • {card.nome_produto}
          </div>
        )}
      </div>

      <div
        className="mt-2 flex items-center gap-1 border-t border-[#2A5282] pt-2"
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onClick={stopPropagation}
      >
        <Select value={analistaId} onValueChange={handleAssign}>
          <SelectTrigger className="h-8 bg-[#0F294A] border-[#2A5282] text-xs px-2 text-[#F6FAFD] w-full focus:ring-1 focus:ring-[#4B7BB0]">
            <div className="flex items-center gap-1.5 truncate">
              <UserCircle2 className="h-4 w-4 shrink-0 text-[#F6FAFD]/60" />
              <SelectValue placeholder="Atribuir responsável" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id} className="text-xs">
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
