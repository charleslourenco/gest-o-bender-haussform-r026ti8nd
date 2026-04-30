import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { FileText, Download, CheckCircle } from 'lucide-react'
import { moveLeadToClient } from '@/services/comercial'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { btnPrimary, btnSecondary, cardClass } from './styles'

export function Step8Contrato() {
  const { lead, data } = useComercialForm()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [medidaFina, setMedidaFina] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Calc Medida Fina (+5 business days)
    const date = new Date()
    let count = 0
    while (count < 5) {
      date.setDate(date.getDate() + 1)
      if (date.getDay() !== 0 && date.getDay() !== 6) count++
    }
    setMedidaFina(date.toLocaleDateString('pt-BR'))
  }, [])

  const handleFinalize = async () => {
    if (!lead) return
    setLoading(true)
    try {
      await moveLeadToClient(lead)
      setSuccess(true)
      toast({
        description: 'Contrato assinado com sucesso! Cliente movido para Área de Clientes.',
        className:
          'bg-dark-denim text-off-white border-none font-bold text-[16px] p-[16px] rounded-[8px]',
      })
    } catch (e: any) {
      toast({
        description: e.message,
        variant: 'destructive',
        className:
          'bg-steel-blue text-off-white border-none font-bold text-[16px] p-[16px] rounded-[8px]',
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-[48px] animate-in fade-in duration-300">
        <CheckCircle className="w-24 h-24 text-dark-denim mx-auto mb-[24px]" />
        <h2 className="text-[32px] font-bold text-midnight-navy mb-[16px]">Venda Concluída!</h2>
        <p className="text-steel-blue text-[18px] mb-[32px] max-w-lg mx-auto font-semibold">
          O dossier foi criado e o lead foi movido para a Área de Clientes. A integração com o
          financeiro foi iniciada e o contrato armazenado.
        </p>
        <button
          onClick={() => navigate('/comercial')}
          className={`${btnPrimary} text-[16px] px-[32px] py-[16px]`}
        >
          Voltar ao Kanban Comercial
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-[32px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">8. Geração de Contrato</h2>

      <div className={`${cardClass} text-center py-[32px]`}>
        <FileText className="w-16 h-16 text-dark-denim mx-auto mb-[16px]" />
        <h3 className="text-[20px] font-bold text-midnight-navy mb-[8px]">
          Contrato Gerado com Sucesso
        </h3>
        <p className="text-midnight-navy text-[16px] mb-[24px]">
          Os placeholders foram preenchidos com os dados de{' '}
          <strong>{lead?.nome || 'Cliente'}</strong>.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-[16px]">
          <button className={`${btnSecondary} flex items-center justify-center gap-[8px]`}>
            <Download className="w-5 h-5" /> Baixar PDF
          </button>
          <button
            onClick={handleFinalize}
            disabled={loading}
            className={`${btnPrimary} flex items-center justify-center`}
          >
            {loading ? 'Processando Automação...' : 'Enviar para Assinatura e Finalizar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div className="bg-off-white p-[24px] rounded-[8px] border-[2px] border-steel-blue text-center shadow-sm">
          <div className="text-steel-blue text-[14px] font-bold uppercase tracking-wider mb-[8px]">
            Data Medida Fina
          </div>
          <div className="text-midnight-navy font-bold text-[20px]">{medidaFina}</div>
        </div>
        <div className="bg-off-white p-[24px] rounded-[8px] border-[2px] border-steel-blue text-center shadow-sm">
          <div className="text-steel-blue text-[14px] font-bold uppercase tracking-wider mb-[8px]">
            Início de Produção
          </div>
          <div className="text-midnight-navy font-bold text-[20px]">Após Medida Fina</div>
        </div>
        <div className="bg-off-white p-[24px] rounded-[8px] border-[2px] border-steel-blue text-center shadow-sm">
          <div className="text-steel-blue text-[14px] font-bold uppercase tracking-wider mb-[8px]">
            Entrega Estimada
          </div>
          <div className="text-midnight-navy font-bold text-[20px]">50-70 dias úteis</div>
        </div>
      </div>
    </div>
  )
}
