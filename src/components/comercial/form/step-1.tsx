import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { supabase } from '@/lib/supabase/client'
import { inputClass, labelClass } from './styles'

export function Step1Cliente() {
  const { lead, data, updateData, setCanAdvance } = useComercialForm()
  const [errorMsg, setErrorMsg] = useState('')

  const cpf = data.cliente.cpf || ''
  const dataNasc = data.cliente.dataNasc || ''
  const profissao = data.cliente.profissao || ''
  const renda = data.cliente.renda || ''
  const refBancaria = data.cliente.refBancaria || ''

  useEffect(() => {
    let isValid = true
    let errMsg = ''

    const cpfClean = cpf.replace(/[^\d]/g, '')
    if (cpfClean.length > 0 && cpfClean.length !== 11 && cpfClean.length !== 14) {
      isValid = false
      errMsg = 'CPF/CNPJ incompleto ou inválido.'
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
        if (dataNasc.length >= 10) errMsg = 'Data de nascimento inválida.'
      }
    }

    if (!profissao.trim()) {
      isValid = false
    }

    if (!renda.trim()) {
      isValid = false
    } else if (!/^[0-9,.]+$/.test(renda)) {
      isValid = false
      errMsg = 'Renda mensal deve conter apenas números e vírgula.'
    }

    setErrorMsg(errMsg)
    setCanAdvance(isValid && errMsg === '')
  }, [cpf, dataNasc, profissao, renda, setCanAdvance])

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
          setErrorMsg('Este CPF/CNPJ já está cadastrado para outro cliente.')
          setCanAdvance(false)
        }
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
    <div className="space-y-[24px] animate-fade-in">
      <h2 className="text-[24px] font-[700] text-midnight-navy mb-[24px]">1. Dados do Cliente</h2>

      {errorMsg && (
        <div className="bg-pale-cornflower border-2 border-steel-blue text-steel-blue p-[16px] rounded-[8px] animate-shake font-[600] flex items-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
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
        <div className="md:col-span-2">
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
            value={cpf}
            onChange={(e) => updateData('cliente', { cpf: formatCpfCnpj(e.target.value) })}
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
            value={dataNasc}
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
            value={profissao}
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
            type="text"
            placeholder="0,00"
            value={renda}
            onChange={(e) => updateData('cliente', { renda: formatRenda(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
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
