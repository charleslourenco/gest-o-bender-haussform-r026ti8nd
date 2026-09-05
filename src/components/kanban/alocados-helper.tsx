import React from 'react'
import { Wrench, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Formata o nome para formato breve: Primeiro nome + inicial do sobrenome (ex: "Adriano M.")
 * Se tiver apenas um nome, retorna apenas ele.
 */
export function formatBriefName(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return ''
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  const firstName = parts[0]
  const lastInitial = parts[1].charAt(0).toUpperCase()
  return `${firstName} ${lastInitial}.`
}

export interface RenderAlocadosBadgeOptions {
  icon?: LucideIcon | 'wrench' | 'users'
  className?: string
  maxNames?: number
}

/**
 * Gera o texto e o title do badge de alocados:
 * - Até 2 nomes: "Adriano M., Jakson D."
 * - Mais de 2 nomes: "Adriano M., Jakson D. +3"
 * - Sem nomes disponíveis mas com contagem: "N alocado(s)"
 */
export function getAlocadosBadgeContent(
  alocados:
    | Array<
        | string
        | { pessoa_nome?: string | null; montadores?: { nome_completo?: string | null } | null }
      >
    | number,
  maxNames = 2,
): { briefText: string; fullTitle: string; count: number } {
  const rawList: Array<
    string | { pessoa_nome?: string | null; montadores?: { nome_completo?: string | null } | null }
  > = Array.isArray(alocados) ? alocados : []

  const fullNames: string[] = []
  for (const item of rawList) {
    if (typeof item === 'string') {
      const trimmed = item.trim()
      if (trimmed) fullNames.push(trimmed)
    } else if (item && typeof item === 'object') {
      const name = item.pessoa_nome || item.montadores?.nome_completo
      if (name && typeof name === 'string') {
        const trimmed = name.trim()
        if (trimmed) fullNames.push(trimmed)
      }
    }
  }

  const count = typeof alocados === 'number' ? alocados : rawList.length || fullNames.length
  if (count <= 0) {
    return { briefText: '', fullTitle: '', count: 0 }
  }

  const fullTitle =
    fullNames.length > 0 ? `Equipe alocada: ${fullNames.join(', ')}` : `${count} alocado(s)`

  if (fullNames.length === 0) {
    return {
      briefText: `${count} alocado(s)`,
      fullTitle,
      count,
    }
  }

  const briefList = fullNames.map(formatBriefName).filter(Boolean)
  let briefText = ''

  if (briefList.length <= maxNames) {
    briefText = briefList.join(', ')
  } else {
    const shown = briefList.slice(0, maxNames).join(', ')
    const remaining = briefList.length - maxNames
    briefText = `${shown} +${remaining}`
  }

  return { briefText, fullTitle, count }
}

/**
 * Componente / renderer para o badge de alocados no card
 */
export function AlocadosBadge({
  alocados,
  icon = 'wrench',
  className,
  maxNames = 2,
}: {
  alocados:
    | Array<
        | string
        | { pessoa_nome?: string | null; montadores?: { nome_completo?: string | null } | null }
      >
    | number
  icon?: LucideIcon | 'wrench' | 'users'
  className?: string
  maxNames?: number
}) {
  const { briefText, fullTitle, count } = getAlocadosBadgeContent(alocados, maxNames)
  if (count <= 0 || !briefText) return null

  const IconComponent: LucideIcon =
    typeof icon === 'function' || typeof icon === 'object'
      ? (icon as LucideIcon)
      : icon === 'users'
        ? Users
        : Wrench

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-[9px] leading-none text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 max-w-[170px] shrink-0',
        className,
      )}
      title={fullTitle}
    >
      <IconComponent className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{briefText}</span>
    </div>
  )
}
