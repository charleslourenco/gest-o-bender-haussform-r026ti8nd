import React, { useState, useEffect, useRef } from 'react'
import { Lead } from '@/types'
import {
  Trash2,
  Archive,
  Phone,
  User,
  Share2,
  Check,
  X,
  Pencil,
  Clock,
  Calendar as CalendarIcon,
  AlertCircle,
  FileText,
  CornerDownRight,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ATENDIMENTO_ABAS,
  AtendimentoAbaConfig,
  LeadMetadados,
  parseLeadMetadados,
  stringifyLeadMetadados,
} from './constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface CardAtendimentoProps {
  lead: Lead
  currentAba: AtendimentoAbaConfig
  users: Array<{ id: string; nome: string }>
  isDragging?: boolean
  unreadCount?: number
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onClick?: () => void
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void> | void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  onForward?: (id: string, destinoAbaId: string) => void
}

export function CardAtendimento({
  lead,
  currentAba,
  users,
  isDragging = false,
  unreadCount = 0,
  onDragStart,
  onDragEnd,
  onClick,
  onUpdateLead,
  onArchive,
  onDelete,
  onForward,
}: CardAtendimentoProps) {
  const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)

  // Estados locais para edição inline
  const [isEditingNome, setIsEditingNome] = useState(false)
  const [nomeValue, setNomeValue] = useState(lead?.nome || '')

  const [isEditingTelefone, setIsEditingTelefone] = useState(false)
  const [telefoneValue, setTelefoneValue] = useState(lead?.telefone || '')

  const [isEditingDescricao, setIsEditingDescricao] = useState(false)
  const [descricaoValue, setDescricaoValue] = useState(meta?.descricao_projeto || '')

  const [elapsed, setElapsed] = useState('')

  const nomeInputRef = useRef<HTMLInputElement>(null)
  const telefoneInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setNomeValue(lead?.nome || '')
  }, [lead?.nome])

  useEffect(() => {
    setTelefoneValue(lead?.telefone || '')
  }, [lead?.telefone])

  useEffect(() => {
    setDescricaoValue(meta?.descricao_projeto || '')
  }, [meta?.descricao_projeto])

  useEffect(() => {
    if (isEditingNome) nomeInputRef.current?.focus()
  }, [isEditingNome])

  useEffect(() => {
    if (isEditingTelefone) telefoneInputRef.current?.focus()
  }, [isEditingTelefone])

  // Timer de permanência
  useEffect(() => {
    const updateTimer = () => {
      try {
        const baseDate = (lead as any).atualizado_em || lead.criado_em
        const parsed = baseDate ? new Date(baseDate).getTime() : Date.now()
        const start = isNaN(parsed) ? Date.now() : parsed
        const diff = Math.max(0, Date.now() - start)

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const mins = Math.floor((diff / 1000 / 60) % 60)

        let str = ''
        if (days > 0) str += `${days}d `
        if (hours > 0 || days > 0) str += `${hours}h `
        str += `${mins}m`
        setElapsed(str)
      } catch {
        setElapsed('-')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [(lead as any).atualizado_em, lead.criado_em])

  const handleSaveNome = async () => {
    const trimmed = nomeValue.trim()
    if (!trimmed) {
      setNomeValue(lead?.nome || '')
      setIsEditingNome(false)
      return
    }
    if (trimmed !== lead?.nome) {
      await onUpdateLead(lead.id, { nome: trimmed })
    }
    setIsEditingNome(false)
  }

  const handleSaveTelefone = async () => {
    const trimmed = telefoneValue.trim()
    if (!trimmed) {
      setTelefoneValue(lead?.telefone || '')
      setIsEditingTelefone(false)
      return
    }
    if (trimmed !== lead?.telefone) {
      await onUpdateLead(lead.id, { telefone: trimmed })
    }
    setIsEditingTelefone(false)
  }

  const handleSaveDescricao = async () => {
    const newMeta: LeadMetadados = {
      ...meta,
      descricao_projeto: descricaoValue.trim(),
    }
    const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)
    await onUpdateLead(lead.id, { notas_pessoais: newNotasPessoais } as any)
    setIsEditingDescricao(false)
  }

  const handleUpdatePrioridade = async (prioridade: 'Alta' | 'Média' | 'Baixa') => {
    const newMeta: LeadMetadados = {
      ...meta,
      prioridade,
    }
    const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)
    await onUpdateLead(lead.id, { notas_pessoais: newNotasPessoais } as any)
  }

  const handleUpdatePrazo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const prazo = e.target.value
    const newMeta: LeadMetadados = {
      ...meta,
      prazo,
    }
    const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)
    await onUpdateLead(lead.id, { notas_pessoais: newNotasPessoais } as any)
  }

  const handleResponsavelChange = async (userId: string) => {
    const val = userId === 'unassigned' ? null : userId
    await onUpdateLead(lead.id, { consultor_id: val })
  }

  const handleForwardSelect = (destinoAbaId: string) => {
    if (onForward && destinoAbaId && destinoAbaId !== 'none') {
      onForward(lead.id, destinoAbaId)
    }
  }

  const consultorRaw = lead?.consultor || (lead as any)?.users
  const consultorNome = Array.isArray(consultorRaw)
    ? consultorRaw[0]?.nome
    : typeof consultorRaw === 'object' && consultorRaw !== null
      ? (consultorRaw as any).nome
      : undefined

  const leadStatus = typeof lead?.status === 'string' ? lead.status : ''
  const isEncaminhado = leadStatus.toLowerCase().includes('encaminhado')
  const forwardedToAba = meta?.encaminhado_para_aba
    ? ATENDIMENTO_ABAS.find((a) => a.id === meta.encaminhado_para_aba)
    : null

  // Cores de prioridade
  const getPriorityBadge = (p?: 'Alta' | 'Média' | 'Baixa') => {
    switch (p) {
      case 'Alta':
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 text-[10px] font-semibold flex items-center gap-1 hover:bg-red-500/20">
            <span>🔴</span> Alta
          </Badge>
        )
      case 'Média':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-500/20">
            <span>🟡</span> Média
          </Badge>
        )
      case 'Baixa':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] font-semibold flex items-center gap-1 hover:bg-emerald-500/20">
            <span>🟢</span> Baixa
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Sem prioridade
          </Badge>
        )
    }
  }

  if (!lead || !lead.id) return null

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select, [role="combobox"]')) return
        onClick?.()
      }}
      className={cn(
        'bg-card border border-border/80 dark:border-border rounded-lg p-3.5 mb-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative flex flex-col gap-2.5',
        'hover:border-primary/50 dark:hover:border-primary/50',
        isDragging && 'opacity-50 ring-2 ring-primary border-primary',
        isEncaminhado && 'bg-muted/30 border-dashed',
      )}
    >
      {/* Header do Card: Nome inline + Badge de Novas Mensagens + Ícone 💬 + Botões de Ação */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          {isEditingNome ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={nomeInputRef}
                value={nomeValue}
                onChange={(e) => setNomeValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNome()
                  if (e.key === 'Escape') {
                    setNomeValue(lead.nome)
                    setIsEditingNome(false)
                  }
                }}
                className="h-7 text-xs font-semibold py-0 px-1.5"
              />
              <button
                type="button"
                onClick={handleSaveNome}
                className="p-1 hover:bg-emerald-500/10 text-emerald-600 rounded"
                title="Salvar"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setNomeValue(lead.nome)
                  setIsEditingNome(false)
                }}
                className="p-1 hover:bg-rose-500/10 text-rose-600 rounded"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/nome flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClick?.()
                }}
                className="font-semibold text-sm text-foreground hover:text-primary transition-colors text-left truncate leading-tight focus:outline-none"
                title="Abrir conversa do lead"
              >
                {lead.nome || 'Sem nome'}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditingNome(true)
                }}
                className="opacity-0 group-hover/nome:opacity-100 text-muted-foreground hover:text-foreground p-0.5 transition-opacity"
                title="Editar nome"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {unreadCount > 0 && (
                <Badge
                  className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0 rounded-full shadow-xs flex items-center gap-1 shrink-0 animate-pulse"
                  title={`${unreadCount} nova(s) mensagem(ns)`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.()
                  }}
                >
                  <span>🔵</span> {unreadCount === 1 ? '1 nova msg' : `${unreadCount} novas msgs`}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação do Card: Abrir Chat 💬, Arquivar e Excluir */}
        <div
          className="flex items-center gap-0.5 shrink-0 -mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onClick?.()}
            className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors"
            title="Abrir conversa (WhatsApp)"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          {onArchive && (
            <button
              type="button"
              onClick={() => onArchive(lead.id)}
              className="p-1 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-muted transition-colors"
              title="Arquivar lead"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(lead.id)}
              className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted transition-colors"
              title="Excluir lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Telefone inline */}
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <Phone className="w-3 h-3 opacity-70 shrink-0" />
        {isEditingTelefone ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              ref={telefoneInputRef}
              value={telefoneValue}
              onChange={(e) => setTelefoneValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTelefone()
                if (e.key === 'Escape') {
                  setTelefoneValue(lead.telefone)
                  setIsEditingTelefone(false)
                }
              }}
              placeholder="Telefone"
              className="h-6 text-xs py-0 px-1.5 flex-1"
            />
            <button
              onClick={handleSaveTelefone}
              className="p-0.5 hover:bg-emerald-500/10 text-emerald-600 rounded"
              title="Salvar"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setTelefoneValue(lead.telefone)
                setIsEditingTelefone(false)
              }}
              className="p-0.5 hover:bg-rose-500/10 text-rose-600 rounded"
              title="Cancelar"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group/tel flex-1 min-w-0">
            <span className="truncate font-mono">{lead.telefone || 'Sem telefone'}</span>
            <button
              onClick={() => setIsEditingTelefone(true)}
              className="opacity-0 group-hover/tel:opacity-100 text-muted-foreground hover:text-foreground p-0.5 transition-opacity"
              title="Editar telefone"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Se estiver encaminhado, mostrar badge de destino */}
      {forwardedToAba && (
        <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded text-[11px] text-muted-foreground font-medium">
          <CornerDownRight className="w-3 h-3 text-primary shrink-0" />
          <span className="truncate">
            Encaminhado p/ <strong className="text-foreground">{forwardedToAba.titulo}</strong>
          </span>
        </div>
      )}

      {/* CAMPOS EXCLUSIVOS DA ABA 05 (Leads p/ Orçamentos) */}
      {currentAba.isOrcamentos && (
        <div
          className="bg-muted/40 p-2.5 rounded-md border border-border/50 space-y-2 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Descrição do Projeto inline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" /> Descrição do Projeto
              </span>
              {!isEditingDescricao && (
                <button
                  onClick={() => setIsEditingDescricao(true)}
                  className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5 font-medium"
                >
                  <Pencil className="w-2.5 h-2.5" /> Editar
                </button>
              )}
            </div>

            {isEditingDescricao ? (
              <div className="space-y-1.5">
                <textarea
                  value={descricaoValue}
                  onChange={(e) => setDescricaoValue(e.target.value)}
                  rows={2}
                  placeholder="Descreva o escopo / especificações..."
                  className="w-full bg-background border border-input rounded p-1.5 text-xs outline-none focus:ring-1 focus:ring-primary resize-y"
                />
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => {
                      setDescricaoValue(meta.descricao_projeto || '')
                      setIsEditingDescricao(false)
                    }}
                    className="px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDescricao}
                    className="px-2 py-0.5 text-[11px] bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-foreground/90 italic line-clamp-2 bg-background/50 p-1.5 rounded border border-border/40 min-h-[28px]">
                {meta.descricao_projeto || 'Nenhuma descrição cadastrada...'}
              </p>
            )}
          </div>

          {/* Prazo e Prioridade */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
            {/* Prazo */}
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                Prazo
              </span>
              <div className="flex items-center gap-1 bg-background px-2 py-1 rounded border border-border/60">
                <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                <input
                  type="date"
                  value={meta.prazo || ''}
                  onChange={handleUpdatePrazo}
                  className="bg-transparent text-[11px] outline-none text-foreground w-full font-mono cursor-pointer"
                />
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider block mb-1">
                Prioridade
              </span>
              <Select
                value={meta.prioridade || 'unassigned'}
                onValueChange={(val) =>
                  handleUpdatePrioridade(val === 'unassigned' ? undefined : (val as any))
                }
              >
                <SelectTrigger className="h-7 text-xs bg-background">
                  <SelectValue placeholder="Prioridade">
                    {getPriorityBadge(meta.prioridade)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem prioridade</SelectItem>
                  <SelectItem value="Alta">🔴 Alta</SelectItem>
                  <SelectItem value="Média">🟡 Média</SelectItem>
                  <SelectItem value="Baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Seção inferior do Card: Responsável + Encaminhar Para */}
      <div
        className="space-y-2 pt-2 border-t border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dropdown de Responsável */}
        <div className="flex items-center gap-1.5">
          <User className="w-3 h-3 text-muted-foreground shrink-0" />
          <Select value={lead.consultor_id || 'unassigned'} onValueChange={handleResponsavelChange}>
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/60 text-foreground w-full">
              <SelectValue placeholder="Designar responsável...">
                {consultorNome || 'Sem responsável'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dropdown "Encaminhar para" */}
        <div className="flex items-center gap-1.5">
          <Share2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <Select onValueChange={handleForwardSelect} value="none">
            <SelectTrigger className="h-7 text-xs bg-muted/30 border-border/60 text-foreground w-full font-normal">
              <SelectValue placeholder="Encaminhar para..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled className="text-xs text-muted-foreground hidden">
                Encaminhar para...
              </SelectItem>
              {ATENDIMENTO_ABAS.filter((aba) => aba.id !== currentAba.id).map((aba) => (
                <SelectItem key={aba.id} value={aba.id} className="text-xs">
                  {aba.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Footer do Card: Data e Tempo no estágio */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
        <span className="flex items-center gap-1" title="Data do último movimento">
          <CalendarIcon className="w-2.5 h-2.5 opacity-60" />
          {(() => {
            const rawDate = (lead as any).atualizado_em || lead.criado_em
            if (!rawDate) return '-'
            try {
              const d = new Date(rawDate)
              return isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR })
            } catch {
              return '-'
            }
          })()}
        </span>
        <span
          className="flex items-center gap-1 font-medium text-foreground/80"
          title="Tempo no estágio atual"
        >
          <Clock className="w-2.5 h-2.5 opacity-60" />
          {elapsed || '-'}
        </span>
      </div>
    </div>
  )
}
