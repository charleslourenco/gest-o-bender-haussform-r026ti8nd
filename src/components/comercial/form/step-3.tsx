import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { Trash2, Plus } from 'lucide-react'
import { inputClass, btnPrimary } from './styles'

const AMBIENTES_PRE = ['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Escritório']

export function Step3Ambientes() {
  const { data, updateData, setCanAdvance } = useComercialForm()
  const [custom, setCustom] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const hasAmbientes = data.ambientes.length > 0
    const hasDetails = data.ambientes.every((a) => a.metragem !== '')
    setCanAdvance(hasAmbientes && hasDetails)
    if (!hasAmbientes) {
      setErrorMsg('Selecione pelo menos um ambiente do projeto.')
    } else if (!hasDetails) {
      setErrorMsg('Preencha a metragem de todos os ambientes selecionados.')
    } else {
      setErrorMsg('')
    }
  }, [data.ambientes, setCanAdvance])

  const toggleAmbiente = (nome: string) => {
    const exists = data.ambientes.find((a) => a.nome === nome)
    if (exists) {
      updateData(
        'ambientes',
        data.ambientes.filter((a) => a.nome !== nome),
      )
    } else {
      updateData('ambientes', [
        ...data.ambientes,
        { id: Date.now().toString(), nome, metragem: '', descricao: '' },
      ])
    }
  }

  const addCustom = () => {
    if (!custom) return
    updateData('ambientes', [
      ...data.ambientes,
      { id: Date.now().toString(), nome: custom, metragem: '', descricao: '' },
    ])
    setCustom('')
  }

  const updateAmbiente = (id: string, field: string, value: string) => {
    updateData(
      'ambientes',
      data.ambientes.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    )
  }

  return (
    <div className="space-y-[16px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">
        3. Ambientes do Projeto
      </h2>

      {errorMsg && (
        <div className="bg-steel-blue text-off-white p-[16px] rounded-[8px] font-bold">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-[16px]">
        {AMBIENTES_PRE.map((amb) => {
          const checked = data.ambientes.some((a) => a.nome === amb)
          return (
            <label
              key={amb}
              className="flex items-center gap-[8px] cursor-pointer bg-pale-cornflower/30 px-[16px] py-[12px] rounded-[8px] border-2 border-steel-blue hover:border-dark-denim transition-colors"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleAmbiente(amb)}
                className="w-5 h-5 accent-dark-denim border-2 border-steel-blue rounded focus:ring-dark-denim cursor-pointer"
              />
              <span className="text-midnight-navy font-bold text-[14px]">{amb}</span>
            </label>
          )
        })}
      </div>

      <div className="flex gap-[16px] max-w-sm mt-[16px]">
        <input
          type="text"
          placeholder="Outro ambiente..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className={inputClass}
        />
        <button onClick={addCustom} className={btnPrimary}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {data.ambientes.length > 0 && (
        <div className="mt-[24px] space-y-[16px]">
          <h3 className="text-[18px] font-bold text-midnight-navy">
            Detalhes dos Ambientes Selecionados
          </h3>
          {data.ambientes.map((amb) => (
            <div
              key={amb.id}
              className="bg-off-white p-[16px] rounded-[8px] border-2 border-steel-blue flex flex-col md:flex-row gap-[16px] items-start md:items-center"
            >
              <div className="w-32 font-bold text-midnight-navy text-[16px]">{amb.nome}</div>
              <input
                type="number"
                placeholder="Metragem (m²) *"
                value={amb.metragem}
                onChange={(e) => updateAmbiente(amb.id, 'metragem', e.target.value)}
                className={`${inputClass} w-full md:w-32`}
              />
              <input
                type="text"
                placeholder="Descrição (Opcional)"
                value={amb.descricao}
                onChange={(e) => updateAmbiente(amb.id, 'descricao', e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={() => toggleAmbiente(amb.nome)}
                className="p-[12px] text-steel-blue hover:text-dark-denim transition-colors"
                aria-label="Remover Ambiente"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
