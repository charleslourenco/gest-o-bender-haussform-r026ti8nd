import React, { useCallback, useRef, useState } from 'react'
import { UploadCloud, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  loading?: boolean
  maxSizeMB?: number
  accept?: string
}

export function FileDropzone({
  onFileSelect,
  loading = false,
  maxSizeMB = 5,
  accept = '.pdf,.jpg,.jpeg,.png,.csv,.xlsx',
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = (file: File) => {
    setError(null)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`O arquivo excede o limite de ${maxSizeMB}MB.`)
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!accept.includes(ext) && !accept.includes(file.type)) {
      setError(`Formato de arquivo não suportado. Use ${accept}`)
      return
    }

    onFileSelect(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        processFile(files[0])
      }
    },
    [maxSizeMB, accept],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !loading && fileInputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-200',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50',
        loading && 'opacity-70 cursor-not-allowed pointer-events-none',
      )}
    >
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
      />

      {loading ? (
        <div className="flex flex-col items-center text-primary">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="font-medium">Processando documento via IA...</p>
          <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos</p>
        </div>
      ) : (
        <>
          <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Clique ou arraste um arquivo</h3>
          <p className="text-sm text-gray-500 mb-4">
            Suporta {accept.replace(/\./g, '').replace(/,/g, ', ')} até {maxSizeMB}MB
          </p>
        </>
      )}

      {error && <div className="mt-4 text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</div>}
    </div>
  )
}
