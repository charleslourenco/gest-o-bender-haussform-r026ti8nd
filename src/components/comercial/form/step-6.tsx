import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { Check } from 'lucide-react'

const DOCS = [
  { id: 'contrato', nome: 'Contrato de Prestação de Serviços', req: true },
  { id: 'vistoria', nome: 'Termo de Conclusão de Vistoria', req: false },
  { id: 'representacao', nome: 'Termo de Representação', req: false },
  { id: 'recusa', nome: 'Termo de Recusa', req: false },
  { id: 'alteracao', nome: 'Termo de Alteração', req: false },
  { id: 'nconformidade', nome: 'Termo de Não Conformidade', req: false },
  { id: 'garantia', nome: 'Termo de Garantia', req: true },
]

export function Step6Documentos() {
  const { data, updateData, setCanAdvance } = useComercialForm()

  useEffect(() => {
    const hasContrato = data.documentos.includes('contrato')
    const hasGarantia = data.documentos.includes('garantia')
    setCanAdvance(hasContrato && hasGarantia)
  }, [data.documentos, setCanAdvance])

  const toggleDoc = (id: string, req: boolean) => {
    if (req) return // Cannot uncheck required
    const docs = [...data.documentos]
    if (docs.includes(id)) {
      updateData(
        'documentos',
        docs.filter((d) => d !== id),
      )
    } else {
      updateData('documentos', [...docs, id])
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        6. Documentos Obrigatórios
      </h2>
      <p className="text-steel-blue">
        Selecione os documentos que farão parte do dossier do cliente. Contrato e Garantia são
        obrigatórios.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {DOCS.map((doc) => {
          const checked = data.documentos.includes(doc.id)
          return (
            <div
              key={doc.id}
              onClick={() => toggleDoc(doc.id, doc.req)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-dark-denim bg-pale-cornflower/20' : 'border-steel-blue/30 bg-off-white hover:border-steel-blue'}`}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center border-2 ${checked ? 'bg-dark-denim border-dark-denim' : 'border-steel-blue'}`}
              >
                {checked && <Check className="w-4 h-4 text-off-white" />}
              </div>
              <div className="flex-1">
                <div className="font-bold text-midnight-navy text-lg">{doc.nome}</div>
                {doc.req && (
                  <div className="text-xs text-steel-blue font-bold uppercase tracking-wider">
                    OBRIGATÓRIO
                  </div>
                )}
              </div>
              {checked && (
                <button className="text-steel-blue hover:text-dark-denim font-bold px-4 py-2 text-sm bg-pale-cornflower/50 rounded-lg">
                  Ver Template
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
