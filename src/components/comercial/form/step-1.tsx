import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { inputClass, labelClass } from './styles'

export function Step1Cliente() {
  const { lead, data, updateData, setCanAdvance } = useComercialForm()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const isValid =
      !!data.cliente.cpf &&
      !!data.cliente.dataNasc &&
      !!data.cliente.profissao &&
      !!data.cliente.renda
    setCanAdvance(isValid)
  }, [data.cliente, setCanAdvance])

  const handleCpfChange = (val: string) => {
    updateData('cliente', { cpf: val })
    if (val.length > 0 && val.length < 11) setErrorMsg('CPF/CNPJ incompleto')
    else setErrorMsg('')
  }

  return (
    <div className="space-y-[16px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">1. Dados do Cliente</h2>

      {errorMsg && (
        <div className="bg-steel-blue text-off-white p-[16px] rounded-[8px] animate-shake font-bold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div>
          <label htmlFor="nomeLead" className={labelClass}>
            Nome Completo (Lead)
          </label>
          <input
            id="nomeLead"
            type="text"
            value={lead?.nome || ''}
            readOnly
            className={`${inputClass} opacity-50 cursor-not-allowed`}
          />
        </div>
        <div>
          <label htmlFor="emailLead" className={labelClass}>
            E-mail (Lead)
          </label>
          <input
            id="emailLead"
            type="text"
            value={lead?.email || ''}
            readOnly
            className={`${inputClass} opacity-50 cursor-not-allowed`}
          />
        </div>
        <div>
          <label htmlFor="telLead" className={labelClass}>
            Telefone (Lead)
          </label>
          <input
            id="telLead"
            type="text"
            value={lead?.telefone || ''}
            readOnly
            className={`${inputClass} opacity-50 cursor-not-allowed`}
          />
        </div>
        <div>
          <label htmlFor="cpf" className={labelClass}>
            CPF / CNPJ *
          </label>
          <input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            value={data.cliente.cpf}
            onChange={(e) => handleCpfChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="nasc" className={labelClass}>
            Data de Nascimento *
          </label>
          <input
            id="nasc"
            type="date"
            value={data.cliente.dataNasc}
            onChange={(e) => updateData('cliente', { dataNasc: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="prof" className={labelClass}>
            Profissão *
          </label>
          <input
            id="prof"
            type="text"
            placeholder="Ex: Engenheiro"
            value={data.cliente.profissao}
            onChange={(e) => updateData('cliente', { profissao: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="renda" className={labelClass}>
            Renda Mensal (R$) *
          </label>
          <input
            id="renda"
            type="number"
            placeholder="0.00"
            value={data.cliente.renda}
            onChange={(e) => updateData('cliente', { renda: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="ref" className={labelClass}>
            Referência Bancária
          </label>
          <input
            id="ref"
            type="text"
            placeholder="Banco, Agência"
            value={data.cliente.refBancaria}
            onChange={(e) => updateData('cliente', { refBancaria: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
