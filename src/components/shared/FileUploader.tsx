import React, { useCallback, useState } from 'react'
import { UploadCloud, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FileUploaderProps {
  onUpload: (file: File) => void
  loading?: boolean
  accept?: string
  maxSizeMB?: number
  className?: string
}

export function FileUploader({
  onUpload,
  loading,
  accept = '.pdf,.jpg,.jpeg,.png,.csv,.xlsx',
  maxSizeMB = 5,
  className,
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (file: File) => {
    setError('')
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`O arquivo deve ter no máximo ${maxSizeMB}MB`)
      return
    }
    onUpload(file)
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0])
      }
    },
    [maxSizeMB, onUpload],
  )

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors relative flex flex-col items-center justify-center min-h-[250px]',
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/20 hover:border-primary/50',
        loading && 'opacity-50 pointer-events-none',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Processando documento via Inteligência Artificial...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300 w-full h-full">
          <div className="p-4 bg-primary/10 rounded-full">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">
              Arraste e solte o seu documento aqui
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para procurar (PDF, JPG, PNG, Excel)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            Selecionar Arquivo
          </Button>
          <input
            id="file-upload-input"
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
          {error && <p className="text-destructive text-sm font-medium">{error}</p>}
        </div>
      )}
    </div>
  )
}
