import { Upload, Edit2, Eye, Download, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface DocumentRowProps {
  doc: {
    id: string
    title: string
    actions: string[]
  }
}

export function DocumentRow({ doc }: DocumentRowProps) {
  const [numberPart, ...restPart] = doc.title.split(' | ')
  const restTitle = restPart.join(' | ')

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 border border-border bg-card text-card-foreground hover:bg-muted/50 rounded-md transition-colors group gap-3">
      <span className="font-medium flex-1 text-sm md:text-base flex gap-2">
        {restTitle ? (
          <>
            <span className="text-primary font-bold">{numberPart}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{restTitle}</span>
          </>
        ) : (
          <span>{doc.title}</span>
        )}
      </span>
      <div className="flex flex-wrap gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {doc.actions.includes('trocar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card text-card-foreground border border-border">
              Substituir
            </TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('editar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary cursor-pointer shadow-sm"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card text-card-foreground border border-border">
              Editar
            </TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('ler') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card text-card-foreground border border-border">
              Ler
            </TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('baixar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card text-card-foreground border border-border">
              Baixar
            </TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('enviar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary cursor-pointer shadow-sm"
              >
                <PenTool className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card text-card-foreground border border-border">
              Enviar p/ assinatura
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
