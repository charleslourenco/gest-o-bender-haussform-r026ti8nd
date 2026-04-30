import { createContext, useContext, useState, ReactNode } from 'react'
import { Lead } from '@/types'

export type FormState = {
  cliente: { cpf: string; dataNasc: string; profissao: string; renda: string; refBancaria: string }
  obra: {
    endereco: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
    cep: string
    tipo: string
    metragem: string
  }
  ambientes: Array<{ id: string; nome: string; metragem: string; descricao: string }>
  produtos: Array<{
    id: string
    ambienteId: string
    nome: string
    qtd: number
    valor: number
    total: number
  }>
  desconto: number
  pagamento: { forma: string; parcelas: number; entrada: string }
  documentos: string[]
}

interface FormContextType {
  lead: Lead | null
  setLead: (lead: Lead) => void
  step: number
  setStep: (step: number) => void
  data: FormState
  updateData: (section: keyof FormState, payload: any) => void
  canAdvance: boolean
  setCanAdvance: (val: boolean) => void
}

const defaultData: FormState = {
  cliente: { cpf: '', dataNasc: '', profissao: '', renda: '', refBancaria: '' },
  obra: {
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: '',
    metragem: '',
  },
  ambientes: [],
  produtos: [],
  desconto: 0,
  pagamento: { forma: '', parcelas: 1, entrada: '' },
  documentos: ['contrato', 'garantia'],
}

const FormContext = createContext<FormContextType | undefined>(undefined)

export const useComercialForm = () => {
  const context = useContext(FormContext)
  if (!context) throw new Error('useComercialForm must be used within FormProvider')
  return context
}

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [lead, setLead] = useState<Lead | null>(null)
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormState>(defaultData)
  const [canAdvance, setCanAdvance] = useState(false)

  const updateData = (section: keyof FormState, payload: any) => {
    if (section === 'ambientes' || section === 'produtos' || section === 'documentos') {
      setData((prev) => ({ ...prev, [section]: payload }))
    } else {
      setData((prev) => ({ ...prev, [section]: { ...(prev[section] as any), ...payload } }))
    }
  }

  return (
    <FormContext.Provider
      value={{
        lead,
        setLead,
        step,
        setStep,
        data,
        updateData,
        canAdvance,
        setCanAdvance,
      }}
    >
      {children}
    </FormContext.Provider>
  )
}
