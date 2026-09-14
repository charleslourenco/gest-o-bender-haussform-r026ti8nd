import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageSquare, ChevronDown, ChevronUp, Bell, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'

export interface PendingConversationItem {
  leadId: string
  leadName: string
  previewMessage: string
  timestamp: string // ISO string ou data da última mensagem/atualização
  unreadCount?: number
  abaTitle?: string
  telefone?: string
  lead: Lead
  hasClientMessage?: boolean
}

export interface PendenciasAtendimentoProps {
  items: PendingConversationItem[]
  onOpenLead: (lead: Lead) => void
  className?: string
}

export function PendenciasAtendimento({
  items,
  onOpenLead,
  className,
}: PendenciasAtendimentoProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!items || items.length === 0) {
    return null
  }

  const totalCount = items.length
  const primaryItem = items[0]

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts)
      if (isNaN(d.getTime())) return 'recentemente'
      return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
    } catch {
      return 'recentemente'
    }
  }

  return (
    <div
      className={cn(
        'w-full max-w-4xl mx-auto mb-3 transition-all duration-200 select-none',
        className,
      )}
    >
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 backdrop-blur-md shadow-xs overflow-hidden transition-all">
        {/* Pill / Header Compacto Bar */}
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs flex-wrap sm:flex-nowrap">
          <div
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
            onClick={() => onOpenLead(primaryItem.lead)}
            title="Clique para abrir a conversa pendente"
          >
            <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30 animate-pulse">
              <Bell className="w-3.5 h-3.5" />
              {totalCount > 1 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white shadow-xs">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-semibold text-amber-900 dark:text-amber-200 group-hover:underline">
                  {primaryItem.leadName || 'Lead sem nome'}
                </span>
                {primaryItem.abaTitle && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 py-0 font-medium border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 shrink-0"
                  >
                    {primaryItem.abaTitle}
                  </Badge>
                )}
              </div>

              <span className="hidden sm:inline text-amber-600/40 dark:text-amber-400/40">•</span>

              <p className="truncate text-amber-800/80 dark:text-amber-300/80 text-[11.5px] italic max-w-xs sm:max-w-md">
                "{primaryItem.previewMessage || 'Nova mensagem de cliente'}"
              </p>

              <span className="text-[10.5px] text-amber-700/70 dark:text-amber-400/70 shrink-0 whitespace-nowrap ml-auto sm:ml-0 font-medium">
                {formatTime(primaryItem.timestamp)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenLead(primaryItem.lead)}
              className="h-7 text-[11px] font-medium border-amber-500/40 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 gap-1 px-2 shadow-none"
            >
              <span>Abrir</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>

            {totalCount > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="h-7 px-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                title={isExpanded ? 'Recolher pendências' : 'Ver todas as pendências empilhadas'}
              >
                <span>
                  {totalCount} {totalCount === 1 ? 'pendência' : 'pendências'}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 ml-1" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Lista empilhada (expansível quando há 2 ou mais conversas pendentes) */}
        {isExpanded && totalCount > 1 && (
          <div className="border-t border-amber-500/20 bg-background/60 dark:bg-black/20 p-2">
            <ScrollArea className="max-h-56 pr-2">
              <div className="space-y-1.5">
                {items.map((item, idx) => {
                  const isFirst = idx === 0
                  return (
                    <div
                      key={item.leadId || idx}
                      onClick={() => onOpenLead(item.lead)}
                      className={cn(
                        'flex items-center justify-between gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs border',
                        isFirst
                          ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-card/50 hover:bg-muted/80 border-border/40',
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-semibold text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                          {item.leadName || 'Lead sem nome'}
                        </span>
                        {item.abaTitle && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {item.abaTitle}
                          </span>
                        )}
                        <span className="text-muted-foreground truncate italic text-[11px] flex-1">
                          "{item.previewMessage || 'Mensagem do WhatsApp'}"
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                          {formatTime(item.timestamp)}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}
