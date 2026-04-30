import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'

export function Step2Obra() {
  const { data, updateData, setCanAdvance } = useComercialForm()

  useEffect(() => {
    const isValid =
      !!data.obra.endereco &&
      !!data.obra.numero &&
      !!data.obra.bairro &&
      !!data.obra.cidade &&
      !!data.obra.estado &&
      !!data.obra.cep &&
      !!data.obra.tipo &&
      !!data.obra.metragem
    setCanAdvance(isValid)
  }, [data.obra, setCanAdvance])

  const inputClass =
    'w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim transition-all'
  const labelClass = 'text-midnight-navy font-bold text-[14px] mb-2 block'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        2. Dados da Obra
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>CEP *</label>
          <input
            type="text"
            placeholder="00000-000"
            value={data.obra.cep}
            onChange={(e) => updateData('obra', { cep: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="hidden md:block"></div>

        <div className="md:col-span-2">
          <label className={labelClass}>Endereço *</label>
          <input
            type="text"
            placeholder="Rua, Avenida..."
            value={data.obra.endereco}
            onChange={(e) => updateData('obra', { endereco: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Número *</label>
          <input
            type="text"
            value={data.obra.numero}
            onChange={(e) => updateData('obra', { numero: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Complemento</label>
          <input
            type="text"
            value={data.obra.complemento}
            onChange={(e) => updateData('obra', { complemento: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Bairro *</label>
          <input
            type="text"
            value={data.obra.bairro}
            onChange={(e) => updateData('obra', { bairro: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Cidade *</label>
          <input
            type="text"
            value={data.obra.cidade}
            onChange={(e) => updateData('obra', { cidade: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Estado *</label>
          <select
            value={data.obra.estado}
            onChange={(e) => updateData('obra', { estado: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            <option value="SP">São Paulo</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="MG">Minas Gerais</option>
            <option value="RS">Minas Gerais</option>
            <option value="PR">Rio Grande do Sul</option>
            <option value="SC">Santa Catarina</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Tipo de Imóvel *</label>
          <select
            value={data.obra.tipo}
            onChange={(e) => updateData('obra', { tipo: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            <option value="Apartamento">Apartamento</option>
            <option value="Casa">Casa</option>
            <option value="Comercial">Comercial</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Metragem Total (m²) *</label>
          <input
            type="number"
            placeholder="0"
            value={data.obra.metragem}
            onChange={(e) => updateData('obra', { metragem: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
