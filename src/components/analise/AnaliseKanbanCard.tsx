import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserCircle2, Trash2, Archive, Plus, Layers } from 'lucide-react'
import { getCorVinculoForCard } from '@/lib/subcards-utils'
import { getBadgeProgramacaoSemana } from '@/lib/pcp-capacity'
import { Badge } from '@/components/ui/badge'
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
  subcards = [],
  isDragging,
  onDragStart,
  onDragEnd,
  onCheckOutsourced,
  onDelete,
  onAddSubcard,
  onStatusChange,
}: any) {
  const navigate = useNavigate()

  const needsCheck = !!card && !card.is_outsourced && !card.outsourced_checked

  const [users, setUsers] = useState<any[]>([])
  const [analistaId, setAnalistaId] = useState<string>(card?.analista_id || '')
  const { toast } = useToast()
  const { isAdmin } = useAuth()

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

    if (!isAdmin) {
      toast({
        title: 'Apenas administradores podem excluir cards.',
        variant: 'destructive',
      })
      return
    }

    if (card?.is_parent_card && card?.formulario_comercial_id) {
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ excluido_analise: true } as any)
        .eq('formulario_comercial_id', card.formulario_comercial_id)

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
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ excluido_analise: true } as any)
        .eq('id', card?.id)

      if (error) {
        toast({ title: 'Erro ao excluir card', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Card excluído com sucesso!' })
        if (onDelete) onDelete(card?.id)
      }
    }
  }

  const handleAssign = async (userId: string) => {
    setAnalistaId(userId)
    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ analista_id: userId })
      .eq('id', card?.id)

    if (error) {
      toast({ title: 'Erro ao atribuir analista', variant: 'destructive' })
      setAnalistaId(card?.analista_id || '')
    } else {
      toast({ title: 'Analista atribuído com sucesso' })
    }
  }

  const canArquivar = card?.status_analise === 'aguardando_plano_corte' && !card?.arquivado_analise

  const handleArquivar = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    let error: any
    if (card?.is_parent_card && card?.formulario_comercial_id) {
      const res = await supabase
        .from('formulario_comercial')
        .update({ arquivado_analise: true })
        .eq('id', card.formulario_comercial_id)
      error = res.error
    } else {
      const res = await supabase
        .from('produtos_servicos_projeto')
        .update({ arquivado_analise: true })
        .eq('id', card?.id)
      error = res.error
    }
    if (error) {
      toast({ title: 'Erro ao arquivar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Card arquivado com sucesso!' })
      if (onDelete) onDelete(card?.id)
    }
  }

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
  }

  if (!card) return null

  // Filter out commercial direct outsourced cards from Kanban
  if (card.is_outsourced && !card.terceirizado_validado) {
    return null
  }

  const isAlert =
    card.is_outsourced ||
    card.status_analise === 'aguardando_consultor' ||
    card.status_analise === 'item_terceirizado'

  const cardCorVinculo =
    card?.cor_vinculo || (subcards.length > 0 ? getCorVinculoForCard(card.id) : null)

  // Badge compacto no card pai: 📐 {semana_analise}·{dia_analise} | 🏭 {semana_producao} | 🔧 {semana_montagem}
  // Cards filhos (fases da análise) SEM a tag de agenda.
  const isCardPai = !card?.card_pai_id

  const formatDiaSemanaSigla = (dateStr?: string | null): string => {
    if (!dateStr) return ''
    const clean = dateStr.slice(0, 10)
    const d = new Date(`${clean}T12:00:00`)
    if (isNaN(d.getTime())) return ''
    const siglas = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return siglas[d.getDay()] || ''
  }

  const diaAnaliseSigla = formatDiaSemanaSigla(card?.data_planejada_analise)
  const semAnalise = card?.semana_planejada_analise || ''
  const parteAnalise = semAnalise
    ? `📐 ${semAnalise}${diaAnaliseSigla ? `·${diaAnaliseSigla}` : ''}`
    : '📐 —'

  const semProducao = card?.semana_planejada_producao || ''
  const diaProducaoSigla = formatDiaSemanaSigla(card?.data_planejada_producao)
  const parteProducao = semProducao
    ? `🏭 ${semProducao}${diaProducaoSigla ? `·${diaProducaoSigla}` : ''}`
    : '🏭 —'

  const semMontagem = card?.semana_planejada_montagem || ''
  const diaMontagemSigla = formatDiaSemanaSigla(card?.data_planejada_montagem)
  const parteMontagem = semMontagem
    ? `🔧 ${semMontagem}${diaMontagemSigla ? `·${diaMontagemSigla}` : ''}`
    : '🔧 —'

  const temAlgumaData = Boolean(
    card?.semana_planejada_analise ||
    card?.data_planejada_analise ||
    card?.semana_planejada_producao ||
    card?.data_planejada_producao ||
    card?.semana_planejada_montagem ||
    card?.data_planejada_montagem,
  )

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex flex-col gap-1.5 p-3 w-full h-fit rounded-lg shadow-sm cursor-grab hover:shadow-md transition-all border-2
        ${isAlert ? 'bg-orange-50 text-orange-950 border-orange-200 hover:border-orange-300 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-500/50 dark:shadow-[0_0_15px_rgba(249,115,22,0.3)] dark:hover:border-orange-400' : 'bg-card text-card-foreground border-border hover:border-slate-300 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:hover:border-cyan-400'} 
        ${cardCorVinculo ? 'border-l-4' : ''}
        ${card.has_outsourced_dependency ? 'border-l-4 border-l-orange-500 dark:border-l-orange-500' : ''}
        ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}
      style={
        cardCorVinculo && !card.has_outsourced_dependency
          ? { borderLeftColor: cardCorVinculo }
          : undefined
      }
    >
      {/* Badge compacto de agenda no card pai */}
      {isCardPai && temAlgumaData && (
        <div className="flex items-center mb-0.5">
          <Badge
            variant="outline"
            className="text-[10px] font-mono font-medium px-1.5 py-0.5 border-border bg-muted/60 text-foreground flex items-center gap-1.5"
            title="Tríade de datas da Carteira PCP"
          >
            <span>{parteAnalise}</span>
            <span className="text-muted-foreground/60">|</span>
            <span>{parteProducao}</span>
            <span className="text-muted-foreground/60">|</span>
            <span>{parteMontagem}</span>
          </Badge>
        </div>
      )}

      <div className="flex flex-row items-center gap-1 w-full text-[10px] mb-0.5">
        {card?.codigo_rastreio ? (
          <span className="font-bold text-primary truncate bg-primary/10 px-1.5 py-0.5 rounded">
            {card.codigo_rastreio}
          </span>
        ) : (
          <span className="text-transparent">N/A</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {canArquivar && (
            <button
              onClick={handleArquivar}
              onPointerDown={(e) => e.stopPropagation()}
              title="Arquivar"
              className="text-muted-foreground p-1 rounded hover:bg-primary/10 hover:text-primary cursor-pointer shrink-0"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
          {needsCheck && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (onCheckOutsourced) onCheckOutsourced(card)
              }}
              title="Verificar Terceirizado"
              className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center justify-center hover:bg-orange-700 dark:bg-orange-500/20 dark:text-orange-400 dark:border dark:border-orange-500/50 dark:hover:bg-orange-500/40 cursor-pointer shrink-0"
            >
              ⚠️
            </button>
          )}
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className={`transition-colors p-1.5 rounded hover:bg-destructive/10 shrink-0 ${isAlert ? 'text-orange-700 dark:text-orange-400 hover:text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
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
                    {card.is_parent_card ? 'Excluir Projeto?' : 'Excluir Item?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {card.is_parent_card
                      ? 'Tem certeza que deseja excluir este projeto? Todo o formulário comercial e seus itens serão removidos. O cadastro do cliente permanecerá intacto.'
                      : 'Tem certeza que deseja excluir este item? Apenas este produto/serviço será removido. O restante do projeto e o cliente não serão afetados.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
                  >
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {card?.clientes?.nome && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            if (card?.cliente_id) {
              navigate(`/clientes/${card.cliente_id}?tab=documentos`)
            }
          }}
          className={`truncate font-medium text-xs leading-none mb-1 cursor-pointer hover:underline ${isAlert ? 'text-orange-950 font-bold dark:text-orange-300' : 'text-foreground/80'}`}
        >
          {card.clientes.nome}
        </span>
      )}

      <div className="flex flex-col gap-1 w-full my-1">
        {card?.is_parent_card && card?.project_item_names ? (
          card.project_item_names
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map((item: string, i: number) => (
              <div
                key={i}
                className={`text-xs px-2 py-1 rounded w-full break-words leading-tight border ${isAlert ? 'bg-orange-200/50 border-orange-300 text-orange-950 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-200' : 'bg-muted/50 border-border text-foreground'}`}
              >
                • {item}
              </div>
            ))
        ) : (
          <div
            className={`text-xs px-2 py-1 rounded w-full break-words leading-tight border ${isAlert ? 'bg-orange-200/50 border-orange-300 text-orange-950 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-200' : 'bg-muted/50 border-border text-foreground'}`}
          >
            • {card?.nome_produto || 'Sem nome'}
          </div>
        )}
      </div>

      {/* Subcards list (mini-cards para cada subcard do ambiente) */}
      {!card.is_parent_card && !card.card_pai_id && (
        <div
          className="mt-1 pt-1.5 border-t border-border/60 flex flex-col gap-1.5"
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
          onClick={stopPropagation}
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold">
              <Layers className="w-3 h-3 text-primary" />
              Subcards ({subcards.length})
            </span>
            {onAddSubcard && (
              <button
                type="button"
                onClick={() => onAddSubcard(card)}
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors font-medium"
                title="Adicionar subcard a este ambiente"
              >
                <Plus className="w-3 h-3" />
                Adicionar
              </button>
            )}
          </div>

          {subcards.length > 0 && (
            <div className="flex flex-col gap-1">
              {subcards.map((sub: any) => {
                const subColor = sub.cor_vinculo || cardCorVinculo || getCorVinculoForCard(card.id)
                return (
                  <div
                    key={sub.id}
                    className="p-1.5 rounded bg-muted/40 border border-border flex flex-col gap-1 text-[11px] border-l-4"
                    style={{ borderLeftColor: subColor }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-semibold text-foreground truncate"
                        title={sub.nome_produto}
                      >
                        {sub.nome_produto}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-primary/10 text-primary"
                        title={`↳ ${card.nome_produto}`}
                      >
                        ↳ {card.nome_produto}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <span className="text-[10px] text-muted-foreground">Qtd: {sub.qtd || 1}</span>
                      <Select
                        value={sub.status_analise || 'iniciar'}
                        onValueChange={(val) => onStatusChange?.(sub.id, val)}
                      >
                        <SelectTrigger className="h-5 text-[10px] px-1.5 w-[110px] bg-background border-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciar" className="text-[10px]">
                            Iniciar
                          </SelectItem>
                          <SelectItem value="aguardando_liberacao" className="text-[10px]">
                            Aguardando liberação
                          </SelectItem>
                          <SelectItem value="medida_fina" className="text-[10px]">
                            Medida fina
                          </SelectItem>
                          <SelectItem value="reuniao_analise" className="text-[10px]">
                            Reunião de análise
                          </SelectItem>
                          <SelectItem value="caderno_tecnico" className="text-[10px]">
                            Caderno técnico
                          </SelectItem>
                          <SelectItem value="alteracao_projeto" className="text-[10px]">
                            Alteração de projeto
                          </SelectItem>
                          <SelectItem value="lista_materiais" className="text-[10px]">
                            Lista de materiais
                          </SelectItem>
                          <SelectItem value="aguardando_plano_corte" className="text-[10px]">
                            Concluído
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div
        className="mt-2 flex items-center gap-1 border-t border-border/50 pt-2"
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onClick={stopPropagation}
      >
        <Select value={analistaId} onValueChange={handleAssign}>
          <SelectTrigger
            className={`h-8 border text-xs px-2 w-full focus:ring-1 ${isAlert ? 'bg-orange-50 border-orange-300 text-orange-950 dark:bg-orange-950/30 dark:border-orange-500/50 dark:text-orange-300 focus:ring-orange-500' : 'bg-muted/30 border-border text-foreground focus:ring-primary'}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <UserCircle2
                className={`h-4 w-4 shrink-0 ${isAlert ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}
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
