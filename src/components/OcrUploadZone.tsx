import { useState, useCallback, useRef } from 'react'
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toBase64, processarOrcamentoOcr, uploadOcrFile } from '@/services/orcamento-ocr'

interface OcrUploadZoneProps {
  onSuccess: (data: any, fileUrl: string) => void
  label?: string
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function OcrUploadZone({ onSuccess, label = 'Importar via OCR' }: OcrUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileProcess = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato de arquivo não suportado.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('O arquivo deve ter no máximo 5MB.')
      return
    }

    setIsProcessing(true)
    try {
      // 1. Upload to storage
      const fileUrl = await uploadOcrFile(file)

      // 2. Convert to base64 for Edge Function
      const base64Data = await toBase64(file)

      // 3. Process via Edge Function
      const extractedData = await processarOrcamentoOcr(base64Data, file.type, file.name)

      toast.success('Documento analisado com sucesso!')
      onSuccess(extractedData, fileUrl)
    } catch (error: any) {
      toast.error(error.message || 'Falha ao processar o arquivo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0])
    }
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
        isDragging
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50',
        isProcessing && 'opacity-50 pointer-events-none',
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx"
        className="hidden"
      />

      {isProcessing ? (
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <div className="text-gray-700 font-medium">Analisando documento...</div>
          <p className="text-sm text-gray-500">Isso pode levar alguns segundos.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-full shadow-sm border border-gray-100">
            <UploadCloud className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Arraste e solte seu PDF, Imagem ou Planilha aqui
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-2">
            <File className="h-4 w-4" />
            <span>PDF, JPG, PNG, CSV, XLSX até 5MB</span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            Selecionar Arquivo
          </Button>
        </div>
      )}
    </div>
  )
}
