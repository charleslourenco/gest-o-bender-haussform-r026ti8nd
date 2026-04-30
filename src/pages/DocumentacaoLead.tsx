import { useParams, useNavigate } from 'react-router-dom'
import { FileText, ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

export default function DocumentacaoLead() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dataLiberacao, setDataLiberacao] = useState('')
  const [dataMedidaFina, setDataMedidaFina] = useState('')

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dataStr = e.target.value
    setDataLiberacao(dataStr)
    if (dataStr) {
      const date = new Date(dataStr + 'T12:00:00Z') // prevent timezone shift
      let count = 0
      while (count < 5) {
        date.setDate(date.getDate() + 1)
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          count++
        }
      }
      setDataMedidaFina(date.toISOString().split('T')[0])
    } else {
      setDataMedidaFina('')
    }
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/comercial')}
          className="text-steel-blue hover:text-dark-denim hover:bg-pale-cornflower/50"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar ao Kanban
        </Button>
      </div>

      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-pale-cornflower" />
          <h1 className="text-[32px] font-bold text-off-white">Documentação Pós-Venda</h1>
        </div>
        <p className="text-pale-cornflower">
          Preencha as 8 seções obrigatórias para formalizar a venda do Lead ID:{' '}
          {id?.substring(0, 8)}...
        </p>
      </div>

      <div className="bg-off-white border-2 border-steel-blue/20 p-6 rounded-xl shadow-sm space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue/20 pb-2">
            1. Dados do Cliente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-midnight-navy font-bold">Nome Completo</Label>
              <Input
                className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy focus-visible:border-dark-denim"
                placeholder="Nome do cliente"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-midnight-navy font-bold">CPF / CNPJ</Label>
              <Input
                className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy focus-visible:border-dark-denim"
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue/20 pb-2">
            2. Datas Críticas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-midnight-navy font-bold">Data de Liberação</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-steel-blue" />
                <Input
                  type="date"
                  value={dataLiberacao}
                  onChange={handleDateChange}
                  className="pl-10 bg-pale-cornflower border-2 border-steel-blue text-midnight-navy focus-visible:border-dark-denim"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-midnight-navy font-bold">
                Data Medida Fina (+5 dias úteis)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-steel-blue/50" />
                <Input
                  type="date"
                  readOnly
                  value={dataMedidaFina}
                  className="pl-10 bg-pale-cornflower/50 border-2 border-steel-blue/50 text-midnight-navy font-bold focus-visible:ring-0 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-pale-cornflower/30 border-2 border-dashed border-steel-blue/50 rounded-xl p-8 text-center mt-8">
          <h3 className="text-xl font-bold text-midnight-navy mb-2">
            Restante das 8 Seções em Desenvolvimento
          </h3>
          <p className="text-midnight-navy/70">
            A tabela de produtos e modalidades de pagamento serão integrados em breve com os
            templates dinâmicos.
          </p>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t-2 border-steel-blue/20">
          <Button
            variant="outline"
            className="bg-steel-blue text-off-white hover:bg-steel-blue/90 border-none min-h-[44px] px-8 text-base font-bold"
            onClick={() => navigate('/comercial')}
          >
            Cancelar
          </Button>
          <Button
            className="bg-dark-denim text-off-white hover:bg-dark-denim/90 min-h-[44px] px-8 text-base font-bold"
            onClick={() => navigate('/comercial')}
          >
            Salvar e Gerar Documentos
          </Button>
        </div>
      </div>
    </div>
  )
}
