import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'

export function Step5Pagamento() {
  const { data, updateData, setCanAdvance } = useComercialForm()

  const subtotal = data.produtos.reduce((acc, p) => acc + p.total, 0)
  const total = subtotal - (Number(data.desconto) || 0)

  useEffect(() => {
    setCanAdvance(!!data.pagamento.forma && total > 0)
  }, [data.pagamento, total, setCanAdvance])

  const inputClass =
    'w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim transition-all'
  const labelClass = 'text-midnight-navy font-bold text-[14px] mb-2 block'

  const parcelasCalc = total / (data.pagamento.parcelas || 1)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        5. Condições de Pagamento
      </h2>

      <div className="bg-dark-denim text-off-white p-6 rounded-xl text-center mb-8">
        <div className="text-pale-cornflower mb-1">Valor Total a Pagar</div>
        <div className="text-4xl font-bold">R$ {total.toFixed(2)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Forma de Pagamento *</label>
          <select
            value={data.pagamento.forma}
            onChange={(e) => updateData('pagamento', { forma: e.target.value })}
            className={inputClass}
          >
            <option value="">Selecione...</option>
            <option value="A_VISTA">À Vista</option>
            <option value="PARCELADO_BOLETO">Parcelado (Boleto)</option>
            <option value="PARCELADO_CARTAO">Parcelado (Cartão)</option>
          </select>
        </div>

        {data.pagamento.forma && data.pagamento.forma !== 'A_VISTA' && (
          <div>
            <label className={labelClass}>Número de Parcelas *</label>
            <select
              value={data.pagamento.parcelas}
              onChange={(e) => updateData('pagamento', { parcelas: Number(e.target.value) })}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24].map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
        )}

        {data.pagamento.forma && (
          <div className="md:col-span-2 mt-4 bg-pale-cornflower/30 p-6 rounded-xl border-2 border-steel-blue/50">
            <h3 className="text-lg font-bold text-midnight-navy mb-4">Resumo do Pagamento</h3>
            {data.pagamento.forma === 'A_VISTA' ? (
              <p className="text-midnight-navy">
                1 pagamento de <strong className="font-bold">R$ {total.toFixed(2)}</strong>
              </p>
            ) : (
              <p className="text-midnight-navy">
                {data.pagamento.parcelas} parcelas de{' '}
                <strong className="font-bold">R$ {parcelasCalc.toFixed(2)}</strong>
              </p>
            )}

            <div className="mt-4">
              <label className={labelClass}>Data do 1º Pagamento / Vencimento</label>
              <input type="date" className={`${inputClass} max-w-xs`} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
