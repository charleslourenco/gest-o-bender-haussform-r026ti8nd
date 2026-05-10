import { Upload, Edit2, Eye, Download, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabase/client'

interface DocumentRowProps {
  doc: {
    id: string
    title: string
    actions: string[]
    path?: string
  }
  onSign?: (doc: any) => void
}

export function DocumentRow({ doc, onSign }: DocumentRowProps) {
  const [numberPart, ...restPart] = doc.title.split(' | ')
  const restTitle = restPart.join(' | ')

  const getDocumentUrl = async () => {
    const filePath = doc.path || doc.title
    if (!filePath) return null

    // Tenta gerar Signed URL primeiro para evitar bloqueios
    if (filePath.startsWith('http')) {
      try {
        const match = filePath.match(
          /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/,
        )
        if (match) {
          const bucket = match[1]
          const path = decodeURIComponent(match[2])
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
          if (data?.signedUrl) return data.signedUrl
        }
      } catch (e) {
        console.error('Erro ao gerar URL assinada', e)
      }
      return filePath
    }

    // Se filePath for apenas o caminho
    const { data } = await supabase.storage.from('dossiers').createSignedUrl(filePath, 3600)
    if (data?.signedUrl) return data.signedUrl

    // Fallback
    const { data: publicData } = supabase.storage.from('dossiers').getPublicUrl(filePath)
    return publicData?.publicUrl
  }

  const handleDownload = async () => {
    const url = await getDocumentUrl()
    if (!url) return

    if (url.startsWith('http')) {
      const a = document.createElement('a')
      a.href = url
      a.download = doc.title
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      const { data, error } = await supabase.storage
        .from('dossiers')
        .download(doc.path || doc.title)
      if (data) {
        const objectUrl = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = doc.title
        a.click()
      } else if (error) {
        console.error('Erro ao baixar arquivo:', error)
      }
    }
  }

  const handleOpen = async () => {
    const newWindow = window.open('', '_blank')
    const url = await getDocumentUrl()
    if (newWindow) {
      if (url) newWindow.location.href = url
      else newWindow.close()
    }
  }

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
                onClick={handleOpen}
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
                onClick={handleDownload}
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
                onClick={() => onSign?.(doc)}
                className="w-8 h-8 bg-background border-border text-muted-foreground hover:text-primary hover:border-primary cursor-pointer shadow-sm"
              >
                <PenTool className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card text-card-foreground border border-border">
              Gerenciar Assinaturas
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
