import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FileText } from 'lucide-react'

export function PdfGenerateButton({ orcamentoId }: { orcamentoId: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleSelect = (format: 'detailed' | 'simplified') => {
    setOpen(false)
    navigate(`/orcamentos/${orcamentoId}/pdf?format=${format}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Gerar PDF
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar PDF do Orçamento</DialogTitle>
          <DialogDescription>
            Escolha o formato do documento que deseja gerar para o cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Button
            variant="outline"
            className="justify-start h-auto py-4 px-4"
            onClick={() => handleSelect('detailed')}
          >
            <div className="text-left">
              <div className="font-semibold text-midnight-navy">Formato Detalhado</div>
              <div className="text-xs text-slate-500 whitespace-normal">
                Inclui tabela completa de itens, quantidades, unidade e valores unitários.
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4 px-4"
            onClick={() => handleSelect('simplified')}
          >
            <div className="text-left">
              <div className="font-semibold text-midnight-navy">Formato Simplificado</div>
              <div className="text-xs text-slate-500 whitespace-normal">
                Apresenta apenas o valor total do orçamento e sua descrição.
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
