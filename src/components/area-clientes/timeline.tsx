import { FileText, Edit, PenTool, CheckCircle } from 'lucide-react'

const MOCK_EVENTS = [
  {
    id: 1,
    date: '13/05/2026',
    time: '11:30',
    user: 'Carlos Silva',
    action: 'encaminhou contrato para assinatura',
    icon: PenTool,
  },
  {
    id: 2,
    date: '12/05/2026',
    time: '16:45',
    user: 'Ana Souza',
    action: 'fez upload do Caderno Técnico',
    icon: FileText,
  },
  {
    id: 3,
    date: '12/05/2026',
    time: '10:15',
    user: 'Carlos Silva',
    action: 'gerou dossiê do cliente',
    icon: CheckCircle,
  },
  {
    id: 4,
    date: '10/05/2026',
    time: '14:20',
    user: 'Sistema',
    action: 'projeto aprovado',
    icon: Edit,
  },
]

export function Timeline() {
  return (
    <div className="space-y-6">
      <h3 className="font-bold text-midnight-navy text-lg border-b border-steel-blue/20 pb-3">
        Timeline de Ações
      </h3>
      <div className="space-y-6 pt-2">
        {MOCK_EVENTS.map((event, idx) => (
          <div key={event.id} className="relative flex gap-4">
            {idx !== MOCK_EVENTS.length - 1 && (
              <div className="absolute top-8 bottom-[-24px] left-[15px] w-[2px] bg-pale-cornflower/40" />
            )}
            <div className="relative z-10 w-8 h-8 rounded-full bg-off-white flex items-center justify-center text-steel-blue shrink-0 border-2 border-pale-cornflower shadow-sm">
              <event.icon className="w-4 h-4" />
            </div>
            <div className="pt-1 pb-2">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-steel-blue">{event.date}</span>
                <span className="text-xs text-muted-foreground">{event.time}</span>
              </div>
              <p className="text-sm text-midnight-navy">
                <span className="font-semibold">{event.user}</span> {event.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
