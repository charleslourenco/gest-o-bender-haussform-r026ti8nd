import { CalendarDays, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function Pcp() {
  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      {/* Header com título e subtítulo */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Planejamento e Programação de Operações
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Programação, capacidade produtiva e cronograma das operações industriais e de
              montagem.
            </p>
          </div>
        </div>
      </div>

      {/* Empty state elegante */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border border-border/60 shadow-sm bg-card/60 backdrop-blur-xs text-center p-8">
          <CardContent className="pt-2 pb-0 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Módulo em Estruturação</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Os cards pós-venda já estão sendo mapeados para este contexto. O cronograma e o
              sequenciamento detalhado de operações estarão disponíveis nesta visão em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
