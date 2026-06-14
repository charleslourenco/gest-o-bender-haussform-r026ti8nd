import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const needsCheck =
    !card.is_outsourced &&
    !card.has_outsourced_dependency &&
    (card.outsourced_checked === false || card.outsourced_checked === null)
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

  // Filter out commercial direct outsourced cards from Kanban
  if (card.is_outsourced && !card.terceirizado_validado) {
    return null
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex flex-col gap-1.5 p-3 w-full h-fit rounded-lg shadow-sm cursor-grab hover:shadow-md transition-all 
        ${card.is_outsourced ? 'bg-orange-100 text-orange-950 border-2 border-orange-400 hover:border-orange-500 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500 dark:hover:border-orange-400' : 'bg-card text-card-foreground border border-border dark:border-cyan-500 hover:border-primary/50 dark:hover:border-cyan-400'} 
        ${card.has_outsourced_dependency ? 'border-l-4 border-l-orange-600 dark:border-l-orange-500' : ''}
        ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}
    >
      <div className="flex flex-row items-center gap-1 w-full text-[10px] mb-0.5">
        {card.codigo_rastreio ? (
          <span className="font-bold text-primary truncate bg-primary/10 px-1.5 py-0.5 rounded">
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
                if (onCheckOutsourced) onCheckOutsourced(card)
              }}
              title="Criar Card Terceirizado"
              className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center justify-center hover:bg-orange-700 dark:bg-orange-500/20 dark:text-orange-400 dark:border dark:border-orange-500/50 dark:hover:bg-orange-500/40 cursor-pointer shrink-0"
            >
              ⚠️
            </button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className={`transition-colors p-1.5 rounded hover:bg-destructive/20 shrink-0 ${card.is_outsourced ? 'text-orange-700 dark:text-orange-400 hover:text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
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
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {card.clientes?.nome && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            if (card.cliente_id) {
              navigate(`/clientes/${card.cliente_id}?tab=documentos`)
            }
          }}
          className={`truncate font-medium text-xs leading-none mb-1 cursor-pointer hover:underline ${card.is_outsourced ? 'text-orange-950 font-bold dark:text-orange-300' : 'text-foreground/80'}`}
        >
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
                className={`text-xs px-2 py-1 rounded w-full break-words leading-tight border ${card.is_outsourced ? 'bg-orange-200/50 border-orange-300 text-orange-950 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-200' : 'bg-muted/50 border-border text-foreground'}`}
              >
                • {item}
              </div>
            ))
        ) : (
          <div
            className={`text-xs px-2 py-1 rounded w-full break-words leading-tight border ${card.is_outsourced ? 'bg-orange-200/50 border-orange-300 text-orange-950 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-200' : 'bg-muted/50 border-border text-foreground'}`}
          >
            • {card.nome_produto}
          </div>
        )}
      </div>

      <div
        className="mt-2 flex items-center gap-1 border-t border-border/50 pt-2"
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onClick={stopPropagation}
      >
        <Select value={analistaId} onValueChange={handleAssign}>
          <SelectTrigger
            className={`h-8 border text-xs px-2 w-full focus:ring-1 ${card.is_outsourced ? 'bg-orange-50 border-orange-300 text-orange-950 dark:bg-orange-950/30 dark:border-orange-500/50 dark:text-orange-300 focus:ring-orange-500' : 'bg-muted/30 border-border text-foreground focus:ring-primary'}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <UserCircle2
                className={`h-4 w-4 shrink-0 ${card.is_outsourced ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}
              />
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
