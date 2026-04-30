import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { inputClass, labelClass } from './styles'

export function Step2Obra() {
  const { data, updateData, setCanAdvance } = useComercialForm()
  const [cepError, setCepError] = useState('')

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

  const handleCepChange = (val: string) => {
    updateData('obra', { cep: val })
    if (val.length > 0 && val.length < 8) setCepError('CEP inválido')
    else setCepError('')
  }

  return (
    <div className="space-y-[16px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">2. Dados da Obra</h2>

      {cepError && (
        <div className="bg-steel-blue text-off-white p-[16px] rounded-[8px] animate-shake font-bold">
          {cepError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div>
          <label htmlFor="cep" className={labelClass}>
            CEP *
          </label>
          <input
            id="cep"
            type="text"
            placeholder="00000-000"
            value={data.obra.cep}
            onChange={(e) => handleCepChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="hidden md:block"></div>

        <div className="md:col-span-2">
          <label htmlFor="endereco" className={labelClass}>
            Endereço *
          </label>
          <input
            id="endereco"
            type="text"
            placeholder="Rua, Avenida..."
            value={data.obra.endereco}
            onChange={(e) => updateData('obra', { endereco: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="numero" className={labelClass}>
            Número *
          </label>
          <input
            id="numero"
            type="text"
            value={data.obra.numero}
            onChange={(e) => updateData('obra', { numero: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="complemento" className={labelClass}>
            Complemento
          </label>
          <input
            id="complemento"
            type="text"
            value={data.obra.complemento}
            onChange={(e) => updateData('obra', { complemento: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="bairro" className={labelClass}>
            Bairro *
          </label>
          <input
            id="bairro"
            type="text"
            value={data.obra.bairro}
            onChange={(e) => updateData('obra', { bairro: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cidade" className={labelClass}>
            Cidade *
          </label>
          <input
            id="cidade"
            type="text"
            value={data.obra.cidade}
            onChange={(e) => updateData('obra', { cidade: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="estado" className={labelClass}>
            Estado *
          </label>
          <select
            id="estado"
            value={data.obra.estado}
            onChange={(e) => updateData('obra', { estado: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            <option value="SP">São Paulo</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="MG">Minas Gerais</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="PR">Paraná</option>
            <option value="SC">Santa Catarina</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label htmlFor="tipo" className={labelClass}>
            Tipo de Imóvel *
          </label>
          <select
            id="tipo"
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
          <label htmlFor="metragem" className={labelClass}>
            Metragem Total (m²) *
          </label>
          <input
            id="metragem"
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
