import { useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

export default function OrcamentoPdf() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const formatParam = searchParams.get('format') || 'detailed'
  const navigate = useNavigate()
  const { toast } = useToast()
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!id) {
      navigate('/orcamentos')
      return
    }

    if (hasFetched.current) return
    hasFetched.current = true

    const generatePdf = async () => {
      const start = Date.now()
      try {
        const { data, error } = await supabase.functions.invoke('export-pdf-document', {
          body: {
            action: 'generate_orcamento',
            orcamento_id: id,
            format: formatParam,
          },
        })

        if (error) throw error
        if (!data || !data.pdfBase64) throw new Error('Dados do PDF não recebidos do servidor')

        // Convert base64 to blob for local auto-download
        const byteCharacters = atob(data.pdfBase64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        const dateStr = format(new Date(), 'yyyyMMdd')
        link.setAttribute('download', `orcamento_${id.substring(0, 8)}_${dateStr}.pdf`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        const duration = Date.now() - start
        if (duration > 3000) {
          console.warn(`Geração de PDF excedeu 3 segundos: ${duration}ms`)
        }

        toast({
          description: 'PDF gerado com sucesso!',
          className: 'bg-emerald-600 text-white border-none',
        })
      } catch (err: any) {
        console.error('Erro ao gerar PDF:', err)
        toast({
          description: 'Erro ao gerar PDF. Tente novamente.',
          variant: 'destructive',
        })
      } finally {
        navigate(-1)
      }
    }

    generatePdf()
  }, [id, formatParam, navigate, toast])

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] bg-slate-50 rounded-xl m-6 border border-gray-200 shadow-sm animate-fade-in">
      <Loader2 className="w-12 h-12 text-midnight-navy animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-slate-800">Gerando PDF...</h2>
      <p className="text-slate-500 mt-2">Aguarde um momento enquanto o documento é processado.</p>
    </div>
  )
}
