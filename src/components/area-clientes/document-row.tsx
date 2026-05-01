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
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-steel-blue/10 last:border-0 hover:bg-off-white/50 px-2 rounded-md transition-colors group gap-3">
      <span className="font-medium text-midnight-navy flex-1 text-sm md:text-base">
        {doc.title}
      </span>
      <div className="flex flex-wrap gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {doc.actions.includes('trocar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 text-steel-blue border-steel-blue/20 hover:bg-pale-cornflower hover:text-dark-denim"
              >
                <Upload className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Substituir</TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('editar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 text-steel-blue border-steel-blue/20 hover:bg-pale-cornflower hover:text-dark-denim"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('ler') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 text-steel-blue border-steel-blue/20 hover:bg-pale-cornflower hover:text-dark-denim"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ler</TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('baixar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 text-steel-blue border-steel-blue/20 hover:bg-pale-cornflower hover:text-dark-denim"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Baixar</TooltipContent>
          </Tooltip>
        )}
        {doc.actions.includes('enviar') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 text-white bg-dark-denim hover:bg-midnight-navy border-none shadow-sm"
              >
                <PenTool className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar p/ assinatura</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
