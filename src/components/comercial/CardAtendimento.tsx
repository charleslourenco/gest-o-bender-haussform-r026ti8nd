import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Lead } from '@/types'
import {
  Trash2,
  Archive,
  Phone,
  User,
  Check,
  X,
  Pencil,
  Clock,
  Calendar as CalendarIcon,
  FileText,
  MessageCircle,
  Move,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ATENDIMENTO_ABAS,
  AtendimentoAbaConfig,
  LeadMetadados,
  parseLeadMetadados,
  stringifyLeadMetadados,
  cleanColumnTitle,
  isOrigemCorretor,
} from './constants'
import { parseSafeDate, formatSafeDate, formatElapsedTime } from '@/lib/date-utils'

export interface CardAtendimentoProps {
  lead: Lead
  currentAba: AtendimentoAbaConfig
  users: Array<{ id: string; nome: string }>
  isDragging?: boolean
  unreadCount?: number
  isPending?: boolean
  lastClientMsgTime?: string | null
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onClick?: () => void
  onOpenConversation?: () => void
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void> | void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
  onForward?: (id: string, destinoAbaId: string) => void
  onMoveTo?: (abaId: string, coluna: string) => void
}

function CardAtendimentoComponent({
  lead,
  currentAba,
  users,
  isDragging = false,
  unreadCount = 0,
  isPending = false,
  lastClientMsgTime = null,
  onDragStart,
  onDragEnd,
  onClick,
  onOpenConversation,
  onUpdateLead,
  onArchive,
  onDelete,
  onForward: _onForward,
  onMoveTo,
}: CardAtendimentoProps) {
  // Metadados memoizados para evitar parsing desnecessário
  const { notas, meta } = useMemo(
    () => parseLeadMetadados((lead as any)?.notas_pessoais),
    [(lead as any)?.notas_pessoais],
  )

  // Estados locais para edição inline
  const [isEditingNome, setIsEditingNome] = useState(false)
  const [nomeValue, setNomeValue] = useState(lead?.nome || '')

  const [isEditingTelefone, setIsEditingTelefone] = useState(false)
  const [telefoneValue, setTelefoneValue] = useState(lead?.telefone || '')

  const [isEditingDescricao, setIsEditingDescricao] = useState(false)
  const [descricaoValue, setDescricaoValue] = useState(meta?.descricao_projeto || '')

  const [elapsed, setElapsed] = useState('')
  const [pendingElapsed, setPendingElapsed] = useState('')

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
        const baseDate = (lead as any)?.atualizado_em || lead?.criado_em
        setElapsed(formatElapsedTime(baseDate, '-'))
      } catch {
        setElapsed('-')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [(lead as any)?.atualizado_em, lead?.criado_em])

  // Timer de tempo decorrido desde a última mensagem do cliente (pendência)
  useEffect(() => {
    if (!isPending) {
      setPendingElapsed('')
      return
    }

    const updatePendingTimer = () => {
      try {
        const baseDate = lastClientMsgTime || (lead as any)?.atualizado_em || lead?.criado_em
        setPendingElapsed(formatElapsedTime(baseDate, 'agora'))
      } catch {
        setPendingElapsed('agora')
      }
    }

    updatePendingTimer()
    const interval = setInterval(updatePendingTimer, 30000)
    return () => clearInterval(interval)
  }, [isPending, lastClientMsgTime, (lead as any)?.atualizado_em, lead?.criado_em])

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
    const safeMeta = meta && typeof meta === 'object' ? meta : {}
    const newMeta: LeadMetadados = {
      ...safeMeta,
      descricao_projeto: descricaoValue.trim(),
    }
    const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)
    await onUpdateLead(lead.id, { notas_pessoais: newNotasPessoais } as any)
    setIsEditingDescricao(false)
  }

  const handleUpdatePrioridade = async (prioridade: 'Alta' | 'Média' | 'Baixa') => {
    const safeMeta = meta && typeof meta === 'object' ? meta : {}
    const newMeta: LeadMetadados = {
      ...safeMeta,
      prioridade,
    }
    const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)
    await onUpdateLead(lead.id, { notas_pessoais: newNotasPessoais } as any)
  }

  const handleUpdatePrazo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const prazo = e.target.value
    const safeMeta = meta && typeof meta === 'object' ? meta : {}
    const newMeta: LeadMetadados = {
      ...safeMeta,
      prazo,
    }
    const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)
    await onUpdateLead(lead.id, { notas_pessoais: newNotasPessoais } as any)
  }

  const handleResponsavelChange = async (userId: string) => {
    const val = userId === 'unassigned' ? null : userId
    await onUpdateLead(lead.id, { consultor_id: val })
  }

  const consultorRaw = lead?.consultor || (lead as any)?.users
  const consultorNome = useMemo(() => {
    if (Array.isArray(consultorRaw)) {
      return consultorRaw[0]?.nome || undefined
    }
    if (typeof consultorRaw === 'object' && consultorRaw !== null) {
      return (consultorRaw as any)?.nome || undefined
    }
    if (typeof lead?.consultor === 'string') {
      return lead.consultor
    }
    // Fallback: buscar na lista safeUsers pelo consultor_id
    if (lead?.consultor_id && Array.isArray(users)) {
      const u = users.find((user) => user && user.id === lead.consultor_id)
      if (u?.nome) return u.nome
    }
    return undefined
  }, [consultorRaw, lead?.consultor, lead?.consultor_id, users])

  const leadStatus = typeof lead?.status === 'string' ? lead.status : ''
  const safeCurrentAbaId = currentAba?.id || ''
  const isEncaminhado =
    leadStatus.toLowerCase().includes('encaminhado') ||
    leadStatus.toLowerCase().includes('despachad') ||
    (meta && meta.origem_aba !== undefined)
  const isNovoContato = safeCurrentAbaId === 'novo-contato' && !isEncaminhado

  // Destino quando o card está na coluna Despachados
  const destinoDespachado = useMemo(() => {
    if (!meta?.encaminhado_para_aba) return null
    const targetAba = ATENDIMENTO_ABAS.find((a) => a.id === meta.encaminhado_para_aba)
    return targetAba?.titulo || meta.encaminhado_para_aba
  }, [meta?.encaminhado_para_aba])

  const safeUsers = Array.isArray(users) ? users.filter(Boolean) : []

  // Cores de prioridade
  const getPriorityBadge = (p?: 'Alta' | 'Média' | 'Baixa') => {
    if (isNovoContato) {
      return (
        <span className="bg-white/20 text-[#FFFFFF] text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
          {p ? `${p === 'Alta' ? '🔴' : p === 'Média' ? '🟡' : '🟢'} ${p}` : 'Sem prioridade'}
        </span>
      )
    }

    switch (p) {
      case 'Alta':
        return (
          <span className="bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:bg-[#30363D] dark:text-[#FF7B72] dark:border-[#F85149]/40 text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <span>🔴</span> Alta
          </span>
        )
      case 'Média':
        return (
          <span className="bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] dark:bg-[#30363D] dark:text-[#D29922] dark:border-[#D29922]/40 text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <span>🟡</span> Média
          </span>
        )
      case 'Baixa':
        return (
          <span className="bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] dark:bg-[#30363D] dark:text-[#3FB950] dark:border-[#3FB950]/40 text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <span>🟢</span> Baixa
          </span>
        )
      default:
        return (
          <span className="bg-[#F3F4F6] text-[#4B5563] dark:bg-[#30363D] dark:text-[#C9D1D9] text-[11px] font-normal px-2 py-0.5 rounded-md inline-flex items-center">
            Sem prioridade
          </span>
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
        if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="combobox"]'))
          return
        onClick?.()
      }}
      style={{
        borderRadius: '10px',
        padding: '16px',
        marginBottom: '12px',
      }}
      className={cn(
        'transition-all duration-200 ease-out cursor-pointer group relative flex flex-col gap-2.5',
        // CARDS NORMAIS (modo claro): Fundo #FFFFFF (branco puro), borda sólida 1px #E5E7EB, sombra [0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]
        // CARDS NORMAIS (modo escuro): Fundo #1E1E1E, borda sólida 1px #3A3A3A, sombra [0_4px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]
        !isNovoContato && [
          'bg-[#FFFFFF] dark:bg-[#1E1E1E]',
          'border border-solid border-[#E5E7EB] dark:border-[#3A3A3A]',
          'shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]',
          'hover:border-[#D1D5DB] dark:hover:border-[#4A4A4A]',
          'hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]',
        ],
        // CARDS DE NOVO CONTATO (laranja pulsante): Fundo #F97316, borda sólida #EA580C, texto branco, animação de pulsar suave
        isNovoContato && [
          'bg-[#F97316] text-[#FFFFFF]',
          'border border-solid border-[#EA580C] dark:border-[#FB923C]',
        ],
        // Destaque para cards com pendência (quando não for o bloco laranja inteiro de novo contato)
        !isNovoContato &&
          isPending && ['border-amber-500/80 dark:border-amber-500/70', 'ring-1 ring-amber-500/30'],
        isDragging &&
          'opacity-50 ring-2 ring-[#3B82F6] border-[#3B82F6] dark:ring-[#58A6FF] dark:border-[#58A6FF]',
      )}
    >
      {/* Barra de indicador de pendência no topo do card (em qualquer coluna/aba) */}
      {isPending && (
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (onOpenConversation) {
              onOpenConversation()
            } else {
              onClick?.()
            }
          }}
          className={cn(
            'flex items-center justify-between px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all shadow-xs -mt-1 -mx-1',
            isNovoContato
              ? 'bg-black/25 text-white hover:bg-black/35 border border-white/20'
              : 'bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500',
          )}
          title="Cliente aguardando resposta! Clique para abrir conversa no WhatsApp"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="truncate">Aguardando resposta</span>
          </div>
          <span className="text-[11px] font-mono shrink-0 pl-1">
            há {pendingElapsed || 'instantes'}
          </span>
        </div>
      )}
      {/* Badge de destino para cards na fila temporária "Despachados" */}
      {destinoDespachado && (leadStatus === 'Despachados' || leadStatus === 'Encaminhado Para') && (
        <div className="flex items-center gap-1 -mt-0.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold"
          >
            → {destinoDespachado}
          </Badge>
        </div>
      )}
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
                className={cn(
                  'h-7 text-[15px] font-semibold py-0 px-1.5',
                  isNovoContato
                    ? 'bg-black/30 border-white/40 text-white'
                    : 'bg-[#F9FAFB] dark:bg-[#252525] border-[#D1D5DB] dark:border-[#4A4A4A] text-[#111827] dark:text-[#E6EDF3]',
                )}
              />
              <button
                type="button"
                onClick={handleSaveNome}
                className={cn(
                  'p-1 rounded',
                  isNovoContato
                    ? 'text-white hover:bg-white/20'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20',
                )}
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
                className={cn(
                  'p-1 rounded',
                  isNovoContato
                    ? 'text-white hover:bg-white/20'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20',
                )}
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
                className={cn(
                  'text-[15px] transition-colors text-left truncate leading-tight focus:outline-none',
                  isNovoContato
                    ? 'text-[#FFFFFF] hover:text-white/90 font-bold'
                    : 'text-[#111827] dark:text-[#E6EDF3] hover:text-[#3B82F6] dark:hover:text-[#58A6FF] font-semibold',
                )}
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
                className={cn(
                  'opacity-0 group-hover/nome:opacity-100 p-0.5 transition-opacity',
                  isNovoContato
                    ? 'text-white/90 hover:text-white'
                    : 'text-[#6B7280] dark:text-[#8B949E] hover:text-[#111827] dark:hover:text-[#E6EDF3]',
                )}
                title="Editar nome"
              >
                <Pencil className="w-3 h-3" />
              </button>
              {unreadCount > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 animate-pulse cursor-pointer shadow-xs',
                    isNovoContato
                      ? 'bg-white text-[#F97316]'
                      : 'bg-[#3B82F6] dark:bg-[#58A6FF] text-white',
                  )}
                  title={
                    unreadCount === 1
                      ? '1 mensagem pendente / não lida (clique para abrir)'
                      : `${unreadCount} mensagens pendentes / não lidas (clique para abrir)`
                  }
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.()
                  }}
                >
                  <span>🔵</span> {unreadCount === 1 ? '1 nova msg' : `${unreadCount} novas msgs`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação do Card: Mover (dropdown 2 níveis), Abrir Chat 💬, Arquivar e Excluir */}
        <div
          className="flex items-center gap-0.5 shrink-0 -mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {onMoveTo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    isNovoContato
                      ? 'text-[#FFFFFF] hover:text-white hover:bg-white/20'
                      : 'text-[#6B7280] dark:text-[#8B949E] hover:text-[#111827] dark:hover:text-[#E6EDF3] hover:bg-[#F3F4F6] dark:hover:bg-[#252525]',
                  )}
                  title="Mover lead para outra aba ou coluna"
                >
                  <Move className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-popover border border-border text-popover-foreground shadow-md rounded-lg p-1 text-xs"
              >
                {/* Nível 1: Todas as abas disponíveis (incluindo a aba atual para movimentação entre colunas) */}
                {ATENDIMENTO_ABAS.map((targetAba) => {
                  // Filtrar colunas do submenu (exclui apenas se for exatamente a mesma coluna onde o lead já se encontra)
                  const colunasDestino = Array.isArray(targetAba.colunas)
                    ? targetAba.colunas.filter((coluna) => typeof coluna === 'string')
                    : []
                  const availableColunas = colunasDestino.filter((coluna) => {
                    const isSameColumn =
                      targetAba.id === safeCurrentAbaId &&
                      typeof coluna === 'string' &&
                      leadStatus.trim().toLowerCase() === coluna.trim().toLowerCase()
                    return !isSameColumn
                  })

                  if (availableColunas.length === 0) return null

                  return (
                    <DropdownMenuSub key={targetAba.id}>
                      <DropdownMenuSubTrigger className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer rounded-sm hover:bg-accent focus:bg-accent">
                        <span>{targetAba.titulo}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52 bg-popover border border-border text-popover-foreground shadow-md rounded-lg p-1 text-xs">
                        {availableColunas.map((coluna) => (
                          <DropdownMenuItem
                            key={coluna}
                            onClick={() => onMoveTo(targetAba.id, coluna)}
                            className="text-xs py-1.5 px-2 cursor-pointer rounded-sm hover:bg-accent focus:bg-accent"
                          >
                            {cleanColumnTitle(coluna)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button
            type="button"
            onClick={() => onClick?.()}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isNovoContato
                ? 'text-[#FFFFFF] hover:text-white hover:bg-white/20'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-[#252525]',
            )}
            title="Abrir conversa (WhatsApp)"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          {onArchive && (
            <button
              type="button"
              onClick={() => onArchive(lead.id)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isNovoContato
                  ? 'text-[#FFFFFF] hover:text-white hover:bg-white/20'
                  : 'text-[#6B7280] dark:text-[#8B949E] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-[#F3F4F6] dark:hover:bg-[#252525]',
              )}
              title="Arquivar lead"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(lead.id)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                isNovoContato
                  ? 'text-[#FFFFFF] hover:text-white hover:bg-white/20'
                  : 'text-[#6B7280] dark:text-[#8B949E] hover:text-destructive hover:bg-[#F3F4F6] dark:hover:bg-[#252525]',
              )}
              title="Excluir lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Telefone inline */}
      <div
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-normal',
          isNovoContato ? 'text-[#FFFFFF]' : 'text-[#6B7280] dark:text-[#8B949E]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Phone
          className={cn(
            'w-3 h-3 shrink-0',
            isNovoContato ? 'text-[#FFFFFF] opacity-90' : 'opacity-70',
          )}
        />
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
              className={cn(
                'h-6 text-[13px] py-0 px-1.5 flex-1',
                isNovoContato
                  ? 'bg-black/30 border-white/40 text-white'
                  : 'bg-[#F9FAFB] dark:bg-[#252525] border-[#D1D5DB] dark:border-[#4A4A4A] text-[#111827] dark:text-[#E6EDF3]',
              )}
            />
            <button
              onClick={handleSaveTelefone}
              className={cn(
                'p-0.5 rounded',
                isNovoContato
                  ? 'text-white hover:bg-white/20'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20',
              )}
              title="Salvar"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setTelefoneValue(lead.telefone)
                setIsEditingTelefone(false)
              }}
              className={cn(
                'p-0.5 rounded',
                isNovoContato
                  ? 'text-white hover:bg-white/20'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20',
              )}
              title="Cancelar"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group/tel flex-1 min-w-0">
            <span className="truncate font-mono text-[13px]">
              {lead.telefone || 'Sem telefone'}
            </span>
            <button
              onClick={() => setIsEditingTelefone(true)}
              className={cn(
                'opacity-0 group-hover/tel:opacity-100 p-0.5 transition-opacity',
                isNovoContato
                  ? 'text-white/90 hover:text-white'
                  : 'text-[#6B7280] dark:text-[#8B949E] hover:text-[#111827] dark:hover:text-[#E6EDF3]',
              )}
              title="Editar telefone"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
      {/* Origem e Nome da pessoa (com destaque para Corretor: "Indicado por: [nome]") */}
      {(lead?.origem || lead?.origem_pessoa) && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-[12px] flex-wrap',
            isNovoContato ? 'text-white/95' : 'text-[#4B5563] dark:text-[#9CA3AF]',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border',
              isNovoContato
                ? 'bg-white/20 border-white/30 text-white'
                : isOrigemCorretor(lead.origem)
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'bg-[#F3F4F6] dark:bg-[#252525] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#374151] dark:text-[#D1D5DB]',
            )}
          >
            {lead.origem || 'Sem origem'}
          </span>
          {lead.origem_pessoa && (
            <span
              className={cn(
                'truncate font-medium text-[11.5px]',
                isNovoContato
                  ? 'text-white font-semibold'
                  : isOrigemCorretor(lead.origem)
                    ? 'text-blue-900 dark:text-blue-200 font-medium'
                    : 'text-[#1F2937] dark:text-[#F3F4F6]',
              )}
              title={`Indicado por: ${lead.origem_pessoa}`}
            >
              {isOrigemCorretor(lead.origem)
                ? `Indicado por: ${lead.origem_pessoa}`
                : `— ${lead.origem_pessoa}`}
            </span>
          )}
        </div>
      )}
      {/* CAMPOS EXCLUSIVOS DA ABA 05 (Leads p/ Orçamentos) */}{' '}
      {currentAba?.isOrcamentos && (
        <div
          className={cn(
            'p-2.5 rounded-lg border space-y-2 text-[13px]',
            isNovoContato
              ? 'bg-black/20 border-white/20 text-white'
              : 'bg-[#F9FAFB] dark:bg-[#161B22] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#6B7280] dark:text-[#8B949E]',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Descrição do Projeto inline */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1',
                  isNovoContato ? 'text-white/90' : 'text-[#6B7280] dark:text-[#8B949E]',
                )}
              >
                <FileText className="w-3 h-3" /> Descrição do Projeto
              </span>
              {!isEditingDescricao && (
                <button
                  onClick={() => setIsEditingDescricao(true)}
                  className={cn(
                    'text-[11px] flex items-center gap-0.5 font-medium transition-colors',
                    isNovoContato
                      ? 'text-white/80 hover:text-white'
                      : 'text-[#6B7280] dark:text-[#8B949E] hover:text-[#111827] dark:hover:text-[#E6EDF3]',
                  )}
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
                  className={cn(
                    'w-full border rounded p-1.5 text-[13px] outline-none resize-y',
                    isNovoContato
                      ? 'bg-black/30 border-white/30 text-white focus:ring-1 focus:ring-white'
                      : 'bg-[#FFFFFF] dark:bg-[#1E1E1E] border-[#D1D5DB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3] focus:ring-1 focus:ring-[#3B82F6] dark:focus:ring-[#58A6FF]',
                  )}
                />
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => {
                      setDescricaoValue(meta.descricao_projeto || '')
                      setIsEditingDescricao(false)
                    }}
                    className="px-2 py-0.5 text-[11px] text-[#6B7280] dark:text-[#8B949E] hover:bg-[#F3F4F6] dark:hover:bg-[#252525] rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveDescricao}
                    className="px-2 py-0.5 text-[11px] bg-[#3B82F6] dark:bg-[#58A6FF] text-white font-medium rounded hover:bg-[#2563EB] dark:hover:bg-[#58A6FF]/90"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  'text-[12px] italic line-clamp-2 p-1.5 rounded border min-h-[28px]',
                  isNovoContato
                    ? 'bg-black/20 border-white/20 text-white/90'
                    : 'bg-[#FFFFFF] dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#4B5563] dark:text-[#C9D1D9]',
                )}
              >
                {meta.descricao_projeto || 'Nenhuma descrição cadastrada...'}
              </p>
            )}
          </div>

          {/* Prazo e Prioridade */}
          <div
            className={cn(
              'grid grid-cols-2 gap-2 pt-1 border-t',
              isNovoContato ? 'border-white/20' : 'border-[#E5E7EB] dark:border-[#3A3A3A]',
            )}
          >
            {/* Prazo */}
            <div>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider block mb-1',
                  isNovoContato ? 'text-white/90' : 'text-[#6B7280] dark:text-[#8B949E]',
                )}
              >
                Prazo
              </span>
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded border',
                  isNovoContato
                    ? 'bg-black/20 border-white/30'
                    : 'bg-[#FFFFFF] dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#3A3A3A]',
                )}
              >
                <CalendarIcon
                  className={cn(
                    'w-3 h-3 shrink-0',
                    isNovoContato ? 'text-white' : 'text-[#6B7280] dark:text-[#8B949E]',
                  )}
                />
                <input
                  type="date"
                  value={meta.prazo || ''}
                  onChange={handleUpdatePrazo}
                  className={cn(
                    'bg-transparent text-[11px] outline-none w-full font-mono cursor-pointer',
                    isNovoContato ? 'text-white' : 'text-[#111827] dark:text-[#E6EDF3]',
                  )}
                />
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider block mb-1',
                  isNovoContato ? 'text-white/90' : 'text-[#6B7280] dark:text-[#8B949E]',
                )}
              >
                Prioridade
              </span>
              <Select
                value={meta.prioridade || 'unassigned'}
                onValueChange={(val) =>
                  handleUpdatePrioridade(val === 'unassigned' ? undefined : (val as any))
                }
              >
                <SelectTrigger
                  className={cn(
                    'h-7 text-xs',
                    isNovoContato
                      ? 'bg-black/20 border-white/30 text-white'
                      : 'bg-[#FFFFFF] dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3]',
                  )}
                >
                  <SelectValue placeholder="Prioridade">
                    {getPriorityBadge(meta.prioridade)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3]">
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
      {/* Seção inferior do Card: Responsável (Consultor) */}
      <div
        className={cn(
          'pt-2 border-t',
          isNovoContato ? 'border-white/20' : 'border-solid border-[#E5E7EB] dark:border-[#3A3A3A]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dropdown de Responsável */}
        <div className="flex items-center gap-1.5">
          <User
            className={cn(
              'w-3.5 h-3.5 shrink-0',
              isNovoContato ? 'text-[#FFFFFF]' : 'text-[#6B7280] dark:text-[#8B949E]',
            )}
          />
          <Select value={lead.consultor_id || 'unassigned'} onValueChange={handleResponsavelChange}>
            <SelectTrigger
              className={cn(
                'h-7 text-[13px] w-full font-normal',
                isNovoContato
                  ? 'bg-black/20 border-solid border-white/30 text-[#FFFFFF] font-medium hover:bg-black/30'
                  : 'bg-[#F9FAFB] dark:bg-[#252525] border-solid border-[#E5E7EB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3] hover:border-[#D1D5DB] dark:hover:border-[#4A4A4A]',
              )}
            >
              <SelectValue placeholder="Designar responsável...">
                {consultorNome || 'Sem responsável'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3]">
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {safeUsers.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Footer do Card: Data e Tempo no estágio */}
      <div
        className={cn(
          'flex items-center justify-between text-[13px] pt-1.5 border-t font-normal',
          isNovoContato
            ? 'border-white/20 text-[#FFFFFF]'
            : 'border-solid border-[#E5E7EB] dark:border-[#3A3A3A] text-[#6B7280] dark:text-[#8B949E]',
        )}
      >
        <span className="flex items-center gap-1 text-[12px]" title="Data do último movimento">
          <CalendarIcon
            className={cn('w-3 h-3', isNovoContato ? 'text-[#FFFFFF]' : 'opacity-70')}
          />
          {(() => {
            const rawDate = (lead as any)?.atualizado_em || lead?.criado_em
            return formatSafeDate(rawDate, 'dd/MM/yyyy HH:mm', { fallback: '-' })
          })()}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-[12px]',
            isNovoContato
              ? 'text-[#FFFFFF] font-bold'
              : 'text-[#111827] dark:text-[#E6EDF3] font-medium',
          )}
          title="Tempo no estágio atual"
        >
          <Clock className={cn('w-3 h-3', isNovoContato ? 'text-[#FFFFFF]' : 'opacity-70')} />
          {elapsed || '-'}
        </span>
      </div>{' '}
    </div>
  )
}

function areCardPropsEqual(
  prevProps: CardAtendimentoProps,
  nextProps: CardAtendimentoProps,
): boolean {
  if (prevProps.isDragging !== nextProps.isDragging) return false
  if (prevProps.unreadCount !== nextProps.unreadCount) return false
  if (prevProps.isPending !== nextProps.isPending) return false
  if (prevProps.lastClientMsgTime !== nextProps.lastClientMsgTime) return false
  if (prevProps.currentAba?.id !== nextProps.currentAba?.id) return false
  if (prevProps.currentAba?.isOrcamentos !== nextProps.currentAba?.isOrcamentos) return false
  if (prevProps.users !== nextProps.users && prevProps.users?.length !== nextProps.users?.length)
    return false

  const prevLead = prevProps.lead as Record<string, any> | undefined
  const nextLead = nextProps.lead as Record<string, any> | undefined

  if (prevLead === nextLead) return true
  if (!prevLead || !nextLead) return false

  return (
    prevLead.id === nextLead.id &&
    prevLead.nome === nextLead.nome &&
    prevLead.telefone === nextLead.telefone &&
    prevLead.origem === nextLead.origem &&
    prevLead.origem_pessoa === nextLead.origem_pessoa &&
    prevLead.consultor_id === nextLead.consultor_id &&
    prevLead.status === nextLead.status &&
    prevLead.categoria === nextLead.categoria &&
    prevLead.notas_pessoais === nextLead.notas_pessoais &&
    prevLead.atualizado_em === nextLead.atualizado_em &&
    prevLead.criado_em === nextLead.criado_em &&
    ((Array.isArray(prevLead.consultor) ? prevLead.consultor[0]?.nome : prevLead.consultor?.nome) ||
      '') ===
      ((Array.isArray(nextLead.consultor)
        ? nextLead.consultor[0]?.nome
        : nextLead.consultor?.nome) || '')
  )
}

export const CardAtendimento = React.memo(CardAtendimentoComponent, areCardPropsEqual)
