import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { supabase } from '@/lib/supabase/client'
import { inputClass, readOnlyInputClass, labelClass } from './styles'
import { AlertCircle } from 'lucide-react'

export function Step1Cliente() {
  const { lead, data, updateData, setCanAdvance } = useComercialForm()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')

  const cpf = data.cliente.cpf || ''
  const dataNasc = data.cliente.dataNasc || ''
  const profissao = data.cliente.profissao || ''
  const renda = data.cliente.renda || ''
  const refBancaria = data.cliente.refBancaria || ''

  useEffect(() => {
    let isValid = true
    const newErrors: Record<string, string> = {}

    const cpfClean = cpf.replace(/[^\d]/g, '')
    if (cpfClean.length > 0 && cpfClean.length !== 11 && cpfClean.length !== 14) {
      isValid = false
      newErrors.cpf = 'CPF/CNPJ incompleto ou inválido.'
    } else if (cpfClean.length === 0) {
      isValid = false
    }

    if (!dataNasc) {
      isValid = false
    } else {
      const d = new Date(dataNasc)
      if (
        isNaN(d.getTime()) ||
        d.getFullYear() < 1900 ||
        d.getFullYear() > new Date().getFullYear()
      ) {
        isValid = false
        if (dataNasc.length >= 10) newErrors.dataNasc = 'Data de nascimento inválida.'
      }
    }

    if (!profissao.trim()) {
      isValid = false
    }

    if (!renda.trim()) {
      isValid = false
    } else if (!/^[0-9,.]+$/.test(renda)) {
      isValid = false
      newErrors.renda = 'Formato inválido. Use apenas números e vírgula.'
    }

    setErrors(newErrors)
    setCanAdvance(isValid && Object.keys(newErrors).length === 0 && generalError === '')
  }, [cpf, dataNasc, profissao, renda, generalError, setCanAdvance])

  useEffect(() => {
    const checkCpf = async () => {
      const cpfClean = cpf.replace(/[^\d]/g, '')
      if (cpfClean.length === 11 || cpfClean.length === 14) {
        const { data: existing } = await supabase
          .from('formulario_comercial')
          .select('id, lead_id')
          .eq('cpf', cpf)
          .maybeSingle()

        if (existing && existing.lead_id !== lead?.id) {
          setGeneralError('Este CPF/CNPJ já está cadastrado para outro cliente.')
          setCanAdvance(false)
        } else {
          setGeneralError('')
        }
      } else {
        setGeneralError('')
      }
    }
    const timeout = setTimeout(checkCpf, 500)
    return () => clearTimeout(timeout)
  }, [cpf, lead?.id, setCanAdvance])

  const formatCpfCnpj = (val: string) => {
    const v = val.replace(/\D/g, '')
    if (v.length <= 11) {
      return v
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    } else {
      return v
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    }
  }

  const formatRenda = (val: string) => {
    let v = val.replace(/[^\d,.]/g, '')
    const parts = v.split(',')
    if (parts.length > 2) {
      v = parts[0] + ',' + parts.slice(1).join('')
    }
    return v
  }

  return (
    <div className="animate-fade-in transition-all duration-200">
      <h2 className="text-[24px] font-[700] text-midnight-navy mb-[24px]">1. Dados do Cliente</h2>

      {generalError && (
        <div className="bg-pale-cornflower border-2 border-steel-blue text-steel-blue p-[16px] rounded-[8px] animate-shake font-[600] flex items-center gap-2 mb-[24px]">
          <AlertCircle className="w-5 h-5" />
          <span>{generalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[24px]">
        <div className="mb-[16px]">
          <label htmlFor="nomeLead" className={labelClass}>
            Nome Completo (Lead)
          </label>
          <input
            id="nomeLead"
            type="text"
            value={lead?.nome || ''}
            readOnly
            className={readOnlyInputClass}
          />
        </div>
        <div className="mb-[16px]">
          <label htmlFor="emailLead" className={labelClass}>
            E-mail (Lead)
          </label>
          <input
            id="emailLead"
            type="text"
            value={lead?.email || ''}
            readOnly
            className={readOnlyInputClass}
          />
        </div>
        <div className="md:col-span-2 mb-[16px]">
          <label htmlFor="telLead" className={labelClass}>
            Telefone (Lead)
          </label>
          <input
            id="telLead"
            type="text"
            value={lead?.telefone || ''}
            readOnly
            className={readOnlyInputClass}
          />
        </div>
        <div className="mb-[16px]">
          <label htmlFor="cpf" className={labelClass}>
            CPF / CNPJ *
          </label>
          <input
            id="cpf"
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => updateData('cliente', { cpf: formatCpfCnpj(e.target.value) })}
            className={`${inputClass} ${errors.cpf ? 'border-steel-blue animate-shake' : ''}`}
          />
          {errors.cpf && (
            <p className="text-steel-blue text-[12px] mt-[4px] flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3 h-3" /> {errors.cpf}
            </p>
          )}
        </div>
        <div className="mb-[16px]">
          <label htmlFor="nasc" className={labelClass}>
            Data de Nascimento *
          </label>
          <input
            id="nasc"
            type="date"
            value={dataNasc}
            onChange={(e) => updateData('cliente', { dataNasc: e.target.value })}
            className={`${inputClass} ${errors.dataNasc ? 'border-steel-blue animate-shake' : ''}`}
          />
          {errors.dataNasc && (
            <p className="text-steel-blue text-[12px] mt-[4px] flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3 h-3" /> {errors.dataNasc}
            </p>
          )}
        </div>
        <div className="mb-[16px]">
          <label htmlFor="prof" className={labelClass}>
            Profissão *
          </label>
          <input
            id="prof"
            type="text"
            placeholder="Ex: Engenheiro"
            value={profissao}
            onChange={(e) => updateData('cliente', { profissao: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="mb-[16px]">
          <label htmlFor="renda" className={labelClass}>
            Renda Mensal (R$) *
          </label>
          <input
            id="renda"
            type="text"
            placeholder="0,00"
            value={renda}
            onChange={(e) => updateData('cliente', { renda: formatRenda(e.target.value) })}
            className={`${inputClass} ${errors.renda ? 'border-steel-blue animate-shake' : ''}`}
          />
          {errors.renda && (
            <p className="text-steel-blue text-[12px] mt-[4px] flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3 h-3" /> {errors.renda}
            </p>
          )}
        </div>
        <div className="md:col-span-2 mb-[16px]">
          <label htmlFor="ref" className={labelClass}>
            Referência Bancária
          </label>
          <input
            id="ref"
            type="text"
            placeholder="Banco, Agência, etc."
            value={refBancaria}
            onChange={(e) => updateData('cliente', { refBancaria: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
