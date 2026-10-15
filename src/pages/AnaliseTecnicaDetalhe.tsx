import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AnaliseKanbanBoard } from '@/components/analise/AnaliseKanbanBoard'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Plus, CalendarIcon, LayoutDashboard, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CriarCardAvulsoModal } from '@/components/analise/CriarCardAvulsoModal'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { ANALISE_COLUMNS } from '@/components/analise/analise-columns'

export default function AnaliseTecnicaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [clientName, setClientName] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [showCriarModal, setShowCriarModal] = useState(false)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroConsultor, setFiltroConsultor] = useState('')
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!id) return
      try {
        const { data } = await supabase
          .from('formulario_comercial')
          .select('cliente_id, clientes(nome)')
          .eq('id', id)
          .single()

        if (data) {
          setClienteId(data?.cliente_id || '')
          if (data?.clientes && (data.clientes as any).nome) {
            setClientName((data.clientes as any).nome)
          }
        }
      } catch (e) {
        console.error('Erro ao buscar detalhes:', e)
      }
    }
    fetchProjectDetails()
  }, [id])

  useEffect(() => {
    const event = new CustomEvent('analise_detalhe_filters', {
      detail: {
        cliente: filtroCliente || '',
        consultor: filtroConsultor || '',
        dateRange: dateRange || { from: undefined, to: undefined },
        customFilter:
          'is_outsourced.eq.false,or(is_outsourced.eq.true.and.terceirizado_validado.eq.true)',
      },
    })
    window.dispatchEvent(event)
    window.dispatchEvent(new CustomEvent('kanban_search_change', { detail: filtroCliente || '' }))
  }, [filtroCliente, filtroConsultor, dateRange])

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="px-6 py-4 bg-card border-b border-border flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/pcp/analise-tecnica')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-border">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              Análise Técnica
            </h1>
            <h2 className="text-sm text-muted-foreground">
              Projeto {clientName ? `- ${clientName}` : ''}
            </h2>
          </div>
        </div>
        <Button
          onClick={() => setShowCriarModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground border border-border shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar card avulso
        </Button>
      </div>

      <div className="px-6 py-3 bg-muted/30 border-b border-border flex flex-wrap gap-4 items-center shrink-0">
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground w-full h-9 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por consultor..."
              value={filtroConsultor}
              onChange={(e) => setFiltroConsultor(e.target.value)}
              className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground w-full h-9 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[250px] max-w-[300px]">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal bg-background border-input text-foreground hover:bg-muted/50 hover:text-foreground h-9 focus-visible:ring-ring',
                  !dateRange?.from && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange?.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yy')
                  )
                ) : (
                  <span>Busca por período/data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from || new Date()}
                selected={{ from: dateRange?.from, to: dateRange?.to }}
                onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        <AnaliseKanbanBoard
          title="Itens do Projeto"
          columns={ANALISE_COLUMNS}
          formularioComercialId={id}
          filterQuery="is_outsourced.eq.false,or(is_outsourced.eq.true.and.terceirizado_validado.eq.true)"
        />
      </div>

      {showCriarModal && (
        <CriarCardAvulsoModal
          onClose={() => setShowCriarModal(false)}
          onSuccess={() => {
            setShowCriarModal(false)
            window.dispatchEvent(new Event('reload_kanban_board'))
          }}
          baseCard={{ formulario_comercial_id: id, cliente_id: clienteId }}
        />
      )}
    </div>
  )
}
