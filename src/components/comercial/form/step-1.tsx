import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { supabase } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'

const inputClass =
  'w-full bg-pale-cornflower border-[2px] border-steel-blue text-midnight-navy rounded-[8px] px-[16px] py-[12px] min-h-[44px] text-[16px] outline-none focus:border-dark-denim focus:border-[3px] transition-all duration-200 placeholder:text-steel-blue placeholder:opacity-50 mb-[16px]'
const readOnlyInputClass =
  'w-full bg-pale-cornflower/50 border-[2px] border-steel-blue text-midnight-navy rounded-[8px] px-[16px] py-[12px] min-h-[44px] text-[16px] outline-none cursor-not-allowed transition-all duration-200 mb-[16px]'
const labelClass = 'text-midnight-navy font-[600] text-[14px] mb-[8px] block'

export function Step1Cliente({ onClose }: { onClose: () => void }) {
  const { lead, data, updateData, canAdvance, setCanAdvance } = useComercialForm()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [toast, setToast] = useState({ show: false, msg: '' })

  const cpf = data.cliente.cpf || ''
  const dataNasc = data.cliente.dataNasc || ''
  const profissao = data.cliente.profissao || ''
  const renda = data.cliente.renda || ''
  const refBancaria = data.cliente.refBancaria || ''

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setHasPermission(false)
        return
      }
      const res = await supabase.functions.invoke('check-permission', {
        body: { action: 'write', modulo: 'Comercial' },
      })
      if (res.data?.allowed && ['Admin', 'Editor'].includes(res.data?.level)) {
        setHasPermission(true)
      } else {
        setHasPermission(false)
      }
    }
    check()
  }, [])

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

    if (!profissao.trim()) isValid = false
    if (!renda.trim()) isValid = false

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
        } else {
          setGeneralError('')
        }
      } else {
        setGeneralError('')
      }
    }
    const timeout = setTimeout(checkCpf, 500)
    return () => clearTimeout(timeout)
  }, [cpf, lead?.id])

  const handleNext = async () => {
    if (!canAdvance) return
    setIsSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let clientId = ''
      const { data: cli } = await supabase
        .from('clientes')
        .select('id')
        .eq('lead_id', lead?.id)
        .single()
      if (cli) clientId = cli.id

      const formData = {
        lead_id: lead?.id,
        cliente_id: clientId || null,
        cpf: data.cliente.cpf,
        data_nascimento: data.cliente.dataNasc,
        profissao: data.cliente.profissao,
        renda: parseFloat(data.cliente.renda.replace(/\./g, '').replace(',', '.')),
        referencia_bancaria: data.cliente.refBancaria,
        etapa_atual: 1,
        usuario_id: user?.id,
      }

      const { error } = await supabase
        .from('formulario_comercial')
        .upsert(formData, { onConflict: 'lead_id' })
      if (error) throw error

      setToast({ show: true, msg: 'Etapa 1 concluída! Próxima etapa será adicionada em breve.' })
      setTimeout(() => {
        setToast({ show: false, msg: '' })
        onClose()
      }, 3000)
    } catch (err: any) {
      setGeneralError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

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
    let v = val.replace(/[^\d,]/g, '')
    const parts = v.split(',')
    if (parts.length > 2) v = parts[0] + ',' + parts.slice(1).join('')
    return v
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center py-[48px] animate-fade-in text-center">
        <AlertCircle className="w-[48px] h-[48px] text-steel-blue mb-[16px]" />
        <p className="text-midnight-navy font-[700] text-[18px]">
          Você não tem permissão para acessar este módulo.
        </p>
        <button
          onClick={onClose}
          className="mt-[32px] bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] font-[700] hover:opacity-90"
        >
          Voltar ao Kanban
        </button>
      </div>
    )
  }

  if (hasPermission === null) {
    return (
      <div className="space-y-[16px] animate-pulse py-[24px]">
        <div className="h-[44px] bg-pale-cornflower/50 rounded-[8px] w-full"></div>
        <div className="h-[44px] bg-pale-cornflower/50 rounded-[8px] w-full"></div>
        <div className="h-[44px] bg-pale-cornflower/50 rounded-[8px] w-full"></div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-[48px] animate-fade-in text-center">
        <AlertCircle className="w-[48px] h-[48px] text-steel-blue mb-[16px]" />
        <p className="text-midnight-navy font-[700] text-[18px]">
          Nenhum lead selecionado. Volte ao Kanban e arraste para 'Vendido'.
        </p>
        <button
          onClick={onClose}
          className="mt-[32px] bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] font-[700] hover:opacity-90"
        >
          Voltar ao Kanban
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in transition-all duration-200">
      {generalError && (
        <div className="bg-pale-cornflower border-[2px] border-steel-blue text-steel-blue p-[16px] rounded-[8px] animate-shake font-[700] flex items-center gap-[8px] mb-[24px]">
          <AlertCircle className="w-[20px] h-[20px]" />
          <span>{generalError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[24px]">
        <div>
          <label className={labelClass}>Nome Completo (Lead)</label>
          <input type="text" value={lead.nome} readOnly className={readOnlyInputClass} />
        </div>
        <div>
          <label className={labelClass}>E-mail (Lead)</label>
          <input type="text" value={lead.email} readOnly className={readOnlyInputClass} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Telefone (Lead)</label>
          <input type="text" value={lead.telefone} readOnly className={readOnlyInputClass} />
        </div>
        <div>
          <label className={labelClass}>CPF / CNPJ *</label>
          <input
            type="text"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => updateData('cliente', { cpf: formatCpfCnpj(e.target.value) })}
            className={`${inputClass} ${errors.cpf ? 'border-steel-blue animate-shake' : ''}`}
          />
          {errors.cpf && (
            <p className="text-steel-blue text-[12px] mt-[-12px] mb-[16px] font-[700]">
              {errors.cpf}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Data de Nascimento *</label>
          <input
            type="date"
            value={dataNasc}
            onChange={(e) => updateData('cliente', { dataNasc: e.target.value })}
            className={`${inputClass} ${errors.dataNasc ? 'border-steel-blue animate-shake' : ''}`}
          />
          {errors.dataNasc && (
            <p className="text-steel-blue text-[12px] mt-[-12px] mb-[16px] font-[700]">
              {errors.dataNasc}
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Profissão *</label>
          <input
            type="text"
            placeholder="Ex: Engenheiro"
            value={profissao}
            onChange={(e) => updateData('cliente', { profissao: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Renda Mensal (R$) *</label>
          <input
            type="text"
            placeholder="0,00"
            value={renda}
            onChange={(e) => updateData('cliente', { renda: formatRenda(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Referência Bancária</label>
          <input
            type="text"
            placeholder="Banco, Agência, etc."
            value={refBancaria}
            onChange={(e) => updateData('cliente', { refBancaria: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-[16px] mt-[16px] md:justify-end">
        <button
          onClick={onClose}
          className="bg-steel-blue text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 min-h-[44px] font-[700] transition-all duration-200 order-1 md:order-1 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-steel-blue focus:ring-offset-2"
        >
          Cancelar
        </button>
        <button
          onClick={handleNext}
          disabled={!canAdvance || isSaving}
          className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] font-[700] transition-all duration-200 order-2 md:order-2 w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-dark-denim focus:ring-offset-2"
        >
          {isSaving ? 'Salvando...' : 'Próximo'}
        </button>
      </div>

      {toast.show && (
        <div className="fixed bottom-[24px] right-[24px] bg-dark-denim text-off-white p-[16px] rounded-[8px] animate-fade-in-up z-[60] shadow-lg font-[700]">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
