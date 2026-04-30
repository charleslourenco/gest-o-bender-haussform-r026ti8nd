import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { FileText, Download, CheckCircle } from 'lucide-react'
import { moveLeadToClient } from '@/services/comercial'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

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
        className: 'bg-dark-denim text-off-white border-none',
      })
    } catch (e: any) {
      toast({
        description: e.message,
        variant: 'destructive',
        className: 'bg-steel-blue text-off-white border-none',
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12 animate-fade-in-up">
        <CheckCircle className="w-24 h-24 text-dark-denim mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-midnight-navy mb-4">Venda Concluída!</h2>
        <p className="text-steel-blue text-lg mb-8 max-w-lg mx-auto">
          O dossier foi criado e o lead foi movido para a Área de Clientes. A integração com o
          financeiro foi iniciada.
        </p>
        <button
          onClick={() => navigate('/comercial')}
          className="bg-dark-denim text-off-white px-8 py-4 rounded-lg font-bold hover:opacity-90 transition-all"
        >
          Voltar ao Kanban
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        8. Geração de Contrato
      </h2>

      <div className="bg-pale-cornflower/20 p-8 rounded-xl border-2 border-steel-blue text-center">
        <FileText className="w-16 h-16 text-dark-denim mx-auto mb-4" />
        <h3 className="text-xl font-bold text-midnight-navy mb-2">Contrato Gerado com Sucesso</h3>
        <p className="text-steel-blue mb-6">
          Os placeholders foram preenchidos com os dados de {lead?.nome}.
        </p>

        <div className="flex justify-center gap-4">
          <button className="bg-steel-blue text-off-white px-6 py-3 rounded-lg font-bold hover:opacity-90 flex items-center gap-2">
            <Download className="w-5 h-5" /> Baixar PDF
          </button>
          <button
            onClick={handleFinalize}
            disabled={loading}
            className="bg-dark-denim text-off-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-all"
          >
            {loading ? 'Processando...' : 'Enviar para Assinatura e Finalizar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-off-white p-6 rounded-xl border-2 border-steel-blue/30 text-center shadow-sm">
          <div className="text-steel-blue text-sm font-bold uppercase mb-2">Data Medida Fina</div>
          <div className="text-midnight-navy font-bold text-xl">{medidaFina}</div>
        </div>
        <div className="bg-off-white p-6 rounded-xl border-2 border-steel-blue/30 text-center shadow-sm">
          <div className="text-steel-blue text-sm font-bold uppercase mb-2">Início de Produção</div>
          <div className="text-midnight-navy font-bold text-xl">Após Medida Fina</div>
        </div>
        <div className="bg-off-white p-6 rounded-xl border-2 border-steel-blue/30 text-center shadow-sm">
          <div className="text-steel-blue text-sm font-bold uppercase mb-2">Entrega Estimada</div>
          <div className="text-midnight-navy font-bold text-xl">50-70 dias úteis</div>
        </div>
      </div>
    </div>
  )
}
