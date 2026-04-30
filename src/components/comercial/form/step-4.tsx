import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { Trash2, Plus } from 'lucide-react'
import {
  inputClass,
  labelClass,
  btnPrimary,
  btnSecondary,
  tableHeaderClass,
  tableRowClass,
} from './styles'

export function Step4Produtos() {
  const { data, updateData, setCanAdvance } = useComercialForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [amb, setAmb] = useState('')
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState('')
  const [valor, setValor] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const isValid = data.produtos.length > 0
    setCanAdvance(isValid)
    if (!isValid) setErrorMsg('Adicione pelo menos um produto ou serviço.')
    else setErrorMsg('')
  }, [data.produtos, setCanAdvance])

  const addProd = () => {
    if (!amb || !nome || !qtd || !valor) return
    const q = Number(qtd)
    const v = Number(valor)
    updateData('produtos', [
      ...data.produtos,
      { id: Date.now().toString(), ambienteId: amb, nome, qtd: q, valor: v, total: q * v },
    ])
    setNome('')
    setQtd('')
    setValor('')
    setModalOpen(false)
  }

  const removeProd = (id: string) => {
    updateData(
      'produtos',
      data.produtos.filter((p) => p.id !== id),
    )
  }

  const subtotal = data.produtos.reduce((acc, p) => acc + p.total, 0)
  const totalFinal = subtotal - (Number(data.desconto) || 0)

  return (
    <div className="space-y-[16px] animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] mb-[16px]">
        <h2 className="text-[24px] font-bold text-midnight-navy">4. Produtos e Serviços</h2>
        <button onClick={() => setModalOpen(true)} className={btnPrimary}>
          + Adicionar Produto
        </button>
      </div>

      {errorMsg && (
        <div className="bg-steel-blue text-off-white p-[16px] rounded-[8px] font-bold">
          {errorMsg}
        </div>
      )}

      {data.produtos.length > 0 ? (
        <div className="overflow-x-auto rounded-[8px] border-[1px] border-steel-blue bg-off-white">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className={tableHeaderClass}>Ambiente</th>
                <th className={tableHeaderClass}>Produto</th>
                <th className={`${tableHeaderClass} text-center`}>Qtd</th>
                <th className={`${tableHeaderClass} text-right`}>V. Unit.</th>
                <th className={`${tableHeaderClass} text-right`}>Total</th>
                <th className={tableHeaderClass}></th>
              </tr>
            </thead>
            <tbody>
              {data.produtos.map((p) => (
                <tr key={p.id} className={tableRowClass}>
                  <td className="p-[16px]">{p.ambienteId}</td>
                  <td className="p-[16px]">{p.nome}</td>
                  <td className="p-[16px] text-center">{p.qtd}</td>
                  <td className="p-[16px] text-right">R$ {p.valor.toFixed(2)}</td>
                  <td className="p-[16px] text-right font-bold">R$ {p.total.toFixed(2)}</td>
                  <td className="p-[16px] text-right">
                    <button
                      onClick={() => removeProd(p.id)}
                      className="text-steel-blue hover:text-dark-denim transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-[24px] text-steel-blue border-2 border-dashed border-steel-blue rounded-[8px]">
          Nenhum produto adicionado.
        </div>
      )}

      <div className="bg-pale-cornflower p-[24px] rounded-[8px] border-2 border-steel-blue flex flex-col md:flex-row justify-between items-center gap-[16px] mt-[24px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[16px] w-full sm:w-auto">
          <label className="text-midnight-navy font-bold text-[16px]">Desconto (R$):</label>
          <input
            type="number"
            value={data.desconto || ''}
            onChange={(e) => updateData('desconto', e.target.value)}
            className={`${inputClass} w-full sm:w-32`}
          />
        </div>
        <div className="text-right w-full sm:w-auto">
          <div className="text-steel-blue mb-[4px] text-[16px] font-bold">
            Subtotal: R$ {subtotal.toFixed(2)}
          </div>
          <div className="text-midnight-navy font-bold text-[24px]">
            Total Final: R$ {totalFinal.toFixed(2)}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
          <div
            className="absolute inset-0 bg-midnight-navy opacity-50"
            onClick={() => setModalOpen(false)}
          ></div>
          <div className="relative bg-off-white border-t-[4px] border-dark-denim p-[24px] rounded-[8px] shadow-xl w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-midnight-navy text-[24px] font-bold mb-[16px]">
              Adicionar Produto
            </h3>
            <div className="space-y-[16px]">
              <div>
                <label className={labelClass}>Ambiente *</label>
                <select value={amb} onChange={(e) => setAmb(e.target.value)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {data.ambientes.map((a) => (
                    <option key={a.id} value={a.nome}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Produto/Serviço *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: Armário Planejado"
                />
              </div>
              <div className="grid grid-cols-2 gap-[16px]">
                <div>
                  <label className={labelClass}>Quantidade *</label>
                  <input
                    type="number"
                    value={qtd}
                    onChange={(e) => setQtd(e.target.value)}
                    className={inputClass}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className={labelClass}>Valor Unit. (R$) *</label>
                  <input
                    type="number"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="pt-[16px] flex justify-end gap-[16px]">
                <button onClick={() => setModalOpen(false)} className={btnSecondary}>
                  Cancelar
                </button>
                <button onClick={addProd} className={btnPrimary}>
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
