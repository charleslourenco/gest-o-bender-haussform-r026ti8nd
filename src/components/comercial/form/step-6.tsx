import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { Check } from 'lucide-react'
import { btnPrimary, btnSecondary, inputClass, labelClass } from './styles'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  useEffect(() => {
    const hasContrato = data.documentos.includes('contrato')
    const hasGarantia = data.documentos.includes('garantia')
    setCanAdvance(hasContrato && hasGarantia)
  }, [data.documentos, setCanAdvance])

  const toggleDoc = (id: string, req: boolean) => {
    if (req) return
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

  const openPlaceholders = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveDoc(docId)
    setModalOpen(true)
  }

  return (
    <div className="space-y-[16px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">
        6. Documentos Obrigatórios
      </h2>
      <div className="bg-pale-cornflower text-midnight-navy p-[16px] rounded-[8px] mb-[24px] font-semibold text-[14px]">
        Selecione os documentos que farão parte do dossier do cliente. Contrato e Garantia são
        obrigatórios.
      </div>

      <div className="grid grid-cols-1 gap-[16px]">
        {DOCS.map((doc) => {
          const checked = data.documentos.includes(doc.id)
          return (
            <div
              key={doc.id}
              onClick={() => toggleDoc(doc.id, doc.req)}
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-[16px] p-[16px] rounded-[8px] border-2 cursor-pointer transition-all ${
                checked
                  ? 'border-dark-denim bg-pale-cornflower/20'
                  : 'border-steel-blue bg-off-white hover:border-dark-denim'
              }`}
            >
              <div className="flex items-center gap-[16px] flex-1">
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center border-2 shrink-0 ${
                    checked ? 'bg-dark-denim border-dark-denim' : 'border-steel-blue bg-off-white'
                  }`}
                >
                  {checked && <Check className="w-4 h-4 text-off-white" />}
                </div>
                <div>
                  <div className="font-bold text-midnight-navy text-[16px]">{doc.nome}</div>
                  {doc.req && (
                    <div className="text-[12px] text-steel-blue font-bold uppercase tracking-wider mt-[4px]">
                      OBRIGATÓRIO
                    </div>
                  )}
                </div>
              </div>
              {checked && (
                <button
                  onClick={(e) => openPlaceholders(doc.id, e)}
                  className="w-full sm:w-auto bg-steel-blue text-off-white px-[16px] py-[8px] rounded-[6px] font-bold text-[14px] hover:opacity-90 transition-opacity"
                >
                  Editar Placeholders
                </button>
              )}
            </div>
          )
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          <div
            className="absolute inset-0 bg-midnight-navy opacity-50"
            onClick={() => setModalOpen(false)}
          ></div>
          <div className="relative bg-off-white border-t-[4px] border-dark-denim p-[24px] rounded-[8px] shadow-xl w-full max-w-lg animate-in zoom-in-95">
            <h3 className="text-midnight-navy text-[24px] font-bold mb-[16px]">
              Placeholders: {DOCS.find((d) => d.id === activeDoc)?.nome}
            </h3>
            <div className="space-y-[16px]">
              <div>
                <label className={labelClass}>Nome do Cliente {'{{CLI_NOME}}'}</label>
                <input
                  type="text"
                  readOnly
                  value={data.cliente.cpf ? 'John Doe' : ''}
                  className={`${inputClass} opacity-50`}
                />
              </div>
              <div>
                <label className={labelClass}>Endereço da Obra {'{{CLI_ENDERECO_OBRA}}'}</label>
                <input
                  type="text"
                  readOnly
                  value={data.obra.endereco}
                  className={`${inputClass} opacity-50`}
                />
              </div>
              <div>
                <label className={labelClass}>Data Medida Fina {'{{DATA_MEDIDA_FINA}}'}</label>
                <input
                  type="text"
                  placeholder="Preenchimento Automático"
                  className={`${inputClass} opacity-50`}
                  readOnly
                />
              </div>

              <div className="pt-[16px] flex justify-end gap-[16px]">
                <button onClick={() => setModalOpen(false)} className={btnSecondary}>
                  Cancelar
                </button>
                <button onClick={() => setModalOpen(false)} className={btnPrimary}>
                  Salvar Placeholders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
