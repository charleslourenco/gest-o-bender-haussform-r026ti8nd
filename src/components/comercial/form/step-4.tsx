import { useEffect, useState } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { Trash2, Plus } from 'lucide-react'

export function Step4Produtos() {
  const { data, updateData, setCanAdvance } = useComercialForm()
  const [amb, setAmb] = useState('')
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState('')
  const [valor, setValor] = useState('')

  useEffect(() => {
    setCanAdvance(data.produtos.length > 0)
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
  }

  const removeProd = (id: string) => {
    updateData(
      'produtos',
      data.produtos.filter((p) => p.id !== id),
    )
  }

  const subtotal = data.produtos.reduce((acc, p) => acc + p.total, 0)
  const totalFinal = subtotal - (Number(data.desconto) || 0)

  const inputClass =
    'bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-3 py-2 outline-none focus:border-dark-denim min-h-[44px]'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        4. Produtos e Serviços
      </h2>

      <div className="bg-pale-cornflower/30 p-4 rounded-xl border-2 border-steel-blue border-dashed grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="text-midnight-navy font-bold text-[12px] mb-1 block">Ambiente</label>
          <select
            value={amb}
            onChange={(e) => setAmb(e.target.value)}
            className={`w-full ${inputClass}`}
          >
            <option value="">Selecione...</option>
            {data.ambientes.map((a) => (
              <option key={a.id} value={a.nome}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-midnight-navy font-bold text-[12px] mb-1 block">
            Produto/Serviço
          </label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={`w-full ${inputClass}`}
            placeholder="Ex: Armário Planejado"
          />
        </div>
        <div>
          <label className="text-midnight-navy font-bold text-[12px] mb-1 block">Qtd</label>
          <input
            type="number"
            value={qtd}
            onChange={(e) => setQtd(e.target.value)}
            className={`w-full ${inputClass}`}
            placeholder="1"
          />
        </div>
        <div>
          <label className="text-midnight-navy font-bold text-[12px] mb-1 block">
            Valor Unit. (R$)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className={`w-full ${inputClass}`}
              placeholder="0.00"
            />
            <button
              onClick={addProd}
              className="bg-dark-denim text-off-white px-4 rounded-lg hover:opacity-90 flex items-center justify-center min-w-[44px]"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {data.produtos.length > 0 && (
        <div className="overflow-x-auto border-2 border-steel-blue rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-steel-blue text-off-white">
                <th className="p-3 font-bold">Ambiente</th>
                <th className="p-3 font-bold">Produto</th>
                <th className="p-3 font-bold text-center">Qtd</th>
                <th className="p-3 font-bold text-right">V. Unit.</th>
                <th className="p-3 font-bold text-right">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.produtos.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-steel-blue/20 bg-off-white text-midnight-navy"
                >
                  <td className="p-3">{p.ambienteId}</td>
                  <td className="p-3">{p.nome}</td>
                  <td className="p-3 text-center">{p.qtd}</td>
                  <td className="p-3 text-right">R$ {p.valor.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold">R$ {p.total.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => removeProd(p.id)}
                      className="text-steel-blue hover:text-dark-denim"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-pale-cornflower/20 p-6 rounded-xl border-2 border-steel-blue/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <label className="text-midnight-navy font-bold">Desconto (R$):</label>
          <input
            type="number"
            value={data.desconto || ''}
            onChange={(e) => updateData('desconto', e.target.value)}
            className="bg-off-white border-2 border-steel-blue text-midnight-navy rounded-lg px-3 py-2 w-32 outline-none focus:border-dark-denim"
          />
        </div>
        <div className="text-right">
          <div className="text-steel-blue mb-1">Subtotal: R$ {subtotal.toFixed(2)}</div>
          <div className="text-midnight-navy font-bold text-2xl">
            Total: R$ {totalFinal.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}
