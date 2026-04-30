import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'

export function Step1Cliente() {
  const { lead, data, updateData, setCanAdvance } = useComercialForm()

  useEffect(() => {
    const isValid =
      !!data.cliente.cpf &&
      !!data.cliente.dataNasc &&
      !!data.cliente.profissao &&
      !!data.cliente.renda
    setCanAdvance(isValid)
  }, [data.cliente, setCanAdvance])

  const inputClass =
    'w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim transition-all'
  const labelClass = 'text-midnight-navy font-bold text-[14px] mb-2 block'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        1. Dados do Cliente
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Nome Completo (Lead)</label>
          <input
            type="text"
            value={lead?.nome || ''}
            readOnly
            className={`${inputClass} opacity-70 cursor-not-allowed`}
          />
        </div>
        <div>
          <label className={labelClass}>E-mail (Lead)</label>
          <input
            type="text"
            value={lead?.email || ''}
            readOnly
            className={`${inputClass} opacity-70 cursor-not-allowed`}
          />
        </div>
        <div>
          <label className={labelClass}>Telefone (Lead)</label>
          <input
            type="text"
            value={lead?.telefone || ''}
            readOnly
            className={`${inputClass} opacity-70 cursor-not-allowed`}
          />
        </div>
        <div>
          <label className={labelClass}>CPF / CNPJ *</label>
          <input
            type="text"
            placeholder="000.000.000-00"
            value={data.cliente.cpf}
            onChange={(e) => updateData('cliente', { cpf: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Data de Nascimento *</label>
          <input
            type="date"
            value={data.cliente.dataNasc}
            onChange={(e) => updateData('cliente', { dataNasc: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Profissão *</label>
          <input
            type="text"
            placeholder="Ex: Engenheiro"
            value={data.cliente.profissao}
            onChange={(e) => updateData('cliente', { profissao: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Renda Mensal (R$) *</label>
          <input
            type="number"
            placeholder="0.00"
            value={data.cliente.renda}
            onChange={(e) => updateData('cliente', { renda: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Referência Bancária</label>
          <input
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
