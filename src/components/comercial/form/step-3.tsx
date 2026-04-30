import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { Trash2, Plus } from 'lucide-react'

const AMBIENTES_PRE = ['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Escritório']

export function Step3Ambientes() {
  const { data, updateData, setCanAdvance } = useComercialForm()
  const [custom, setCustom] = useState('')

  useEffect(() => {
    setCanAdvance(data.ambientes.length > 0)
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

  const inputClass =
    'w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-3 py-2 outline-none focus:border-dark-denim transition-all'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        3. Ambientes do Projeto
      </h2>

      <div className="flex flex-wrap gap-3">
        {AMBIENTES_PRE.map((amb) => (
          <button
            key={amb}
            onClick={() => toggleAmbiente(amb)}
            className={`px-4 py-2 rounded-full border-2 font-bold transition-all ${data.ambientes.some((a) => a.nome === amb) ? 'bg-dark-denim border-dark-denim text-off-white' : 'bg-pale-cornflower border-steel-blue text-midnight-navy hover:border-dark-denim'}`}
          >
            {amb}
          </button>
        ))}
      </div>

      <div className="flex gap-2 max-w-sm">
        <input
          type="text"
          placeholder="Outro ambiente..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className={inputClass}
        />
        <button
          onClick={addCustom}
          className="bg-dark-denim text-off-white px-4 rounded-lg hover:opacity-90 flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {data.ambientes.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-bold text-midnight-navy">Detalhes dos Ambientes</h3>
          {data.ambientes.map((amb) => (
            <div
              key={amb.id}
              className="bg-pale-cornflower/30 p-4 rounded-lg border-2 border-steel-blue/50 flex flex-col md:flex-row gap-4 items-start md:items-center"
            >
              <div className="w-32 font-bold text-midnight-navy">{amb.nome}</div>
              <input
                type="number"
                placeholder="Metragem (m²)"
                value={amb.metragem}
                onChange={(e) => updateAmbiente(amb.id, 'metragem', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Descrição (Opcional)"
                value={amb.descricao}
                onChange={(e) => updateAmbiente(amb.id, 'descricao', e.target.value)}
                className={`flex-1 ${inputClass}`}
              />
              <button
                onClick={() => toggleAmbiente(amb.nome)}
                className="p-2 text-steel-blue hover:text-dark-denim"
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
