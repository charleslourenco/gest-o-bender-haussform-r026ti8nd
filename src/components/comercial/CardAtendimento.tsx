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
        const baseDate = (lead as any)?.atualizado_em || lead?.criado_em
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
  }, [(lead as any)?.atualizado_em, lead?.criado_em])

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
      : typeof lead?.consultor === 'string'
        ? lead.consultor
        : undefined

  const leadStatus = typeof lead?.status === 'string' ? lead.status : ''
  const safeCurrentAbaId = currentAba?.id || ''
  const isEncaminhado =
    leadStatus.toLowerCase().includes('encaminhado') || meta?.origem_aba !== undefined
  const isNovoContato = safeCurrentAbaId === 'novo-contato' && !isEncaminhado
  const forwardedToAba = meta?.encaminhado_para_aba
    ? ATENDIMENTO_ABAS.find((a) => a.id === meta.encaminhado_para_aba)
    : null

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
          'animate-pulse-laranja',
        ],
        isDragging &&
          'opacity-50 ring-2 ring-[#3B82F6] border-[#3B82F6] dark:ring-[#58A6FF] dark:border-[#58A6FF]',
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
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 animate-pulse',
                    isNovoContato
                      ? 'bg-white text-[#F97316]'
                      : 'bg-[#3B82F6] dark:bg-[#58A6FF] text-white',
                  )}
                  title={`${unreadCount} nova(s) mensagem(ns)`}
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

        {/* Botões de Ação do Card: Abrir Chat 💬, Arquivar e Excluir */}
        <div
          className="flex items-center gap-0.5 shrink-0 -mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
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
      {/* Se estiver encaminhado, mostrar badge de destino */}
      {forwardedToAba && (
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-normal',
            isNovoContato
              ? 'bg-black/20 text-[#FFFFFF]'
              : 'bg-[#F3F4F6] text-[#4B5563] dark:bg-[#30363D] dark:text-[#C9D1D9]',
          )}
        >
          <CornerDownRight
            className={cn(
              'w-3.5 h-3.5 shrink-0',
              isNovoContato ? 'text-[#FFFFFF]' : 'text-[#3B82F6] dark:text-[#58A6FF]',
            )}
          />
          <span className="truncate">
            Encaminhado p/{' '}
            <strong
              className={
                isNovoContato
                  ? 'text-[#FFFFFF] font-bold'
                  : 'text-[#111827] dark:text-[#E6EDF3] font-semibold'
              }
            >
              {forwardedToAba.titulo}
            </strong>
          </span>
        </div>
      )}
      {/* CAMPOS EXCLUSIVOS DA ABA 05 (Leads p/ Orçamentos) */}
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
      {/* Seção inferior do Card: Responsável + Encaminhar Para */}
      <div
        className={cn(
          'space-y-2 pt-2 border-t',
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

        {/* Dropdown "Encaminhar para" */}
        <div className="flex items-center gap-1.5">
          <Share2
            className={cn(
              'w-3.5 h-3.5 shrink-0',
              isNovoContato ? 'text-[#FFFFFF]' : 'text-[#6B7280] dark:text-[#8B949E]',
            )}
          />
          <Select onValueChange={handleForwardSelect} value="none">
            <SelectTrigger
              className={cn(
                'h-7 text-[13px] w-full font-normal',
                isNovoContato
                  ? 'bg-black/20 border-solid border-white/30 text-[#FFFFFF] hover:bg-black/30'
                  : 'bg-[#F9FAFB] dark:bg-[#252525] border-solid border-[#E5E7EB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3] hover:border-[#D1D5DB] dark:hover:border-[#4A4A4A]',
              )}
            >
              <SelectValue placeholder="Encaminhar para..." />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#1E1E1E] border-[#E5E7EB] dark:border-[#3A3A3A] text-[#111827] dark:text-[#E6EDF3]">
              <SelectItem value="none" disabled className="text-xs text-muted-foreground hidden">
                Encaminhar para...
              </SelectItem>
              {ATENDIMENTO_ABAS.filter((aba) => aba.id !== safeCurrentAbaId).map((aba) => (
                <SelectItem key={aba.id} value={aba.id} className="text-xs">
                  {aba.titulo}
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
