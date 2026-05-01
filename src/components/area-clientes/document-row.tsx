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
    <div className="flex flex-col md:flex-row md:items-center justify-between py-3 px-4 border border-pale-cornflower bg-dark-denim text-off-white hover:bg-pale-cornflower hover:text-midnight-navy rounded-md transition-colors group gap-3">
      <span className="font-medium flex-1 text-sm md:text-base flex gap-2">
        {restTitle ? (
          <>
            <span className="text-steel-blue font-bold group-hover:text-midnight-navy">
              {numberPart}
            </span>
            <span className="text-pale-cornflower group-hover:text-midnight-navy">|</span>
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
                className="w-8 h-8 bg-transparent border-none text-steel-blue hover:bg-pale-cornflower hover:text-midnight-navy cursor-pointer shadow-none"
              >
                <Upload className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-dark-denim text-off-white border border-pale-cornflower">
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
                className="w-8 h-8 bg-transparent border-none text-steel-blue hover:bg-pale-cornflower hover:text-midnight-navy cursor-pointer shadow-none"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-dark-denim text-off-white border border-pale-cornflower">
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
                className="w-8 h-8 bg-transparent border-none text-steel-blue hover:bg-pale-cornflower hover:text-midnight-navy cursor-pointer shadow-none"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-dark-denim text-off-white border border-pale-cornflower">
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
                className="w-8 h-8 bg-transparent border-none text-steel-blue hover:bg-pale-cornflower hover:text-midnight-navy cursor-pointer shadow-none"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-dark-denim text-off-white border border-pale-cornflower">
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
                className="w-8 h-8 bg-transparent border-none text-steel-blue hover:bg-pale-cornflower hover:text-midnight-navy cursor-pointer shadow-none"
              >
                <PenTool className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-dark-denim text-off-white border border-pale-cornflower">
              Enviar p/ assinatura
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
