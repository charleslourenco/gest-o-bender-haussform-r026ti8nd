import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { inputClass, labelClass, cardClass, tableHeaderClass, tableRowClass } from './styles'

export function Step5Pagamento() {
  const { data, updateData, setCanAdvance } = useComercialForm()

  const subtotal = data.produtos.reduce((acc, p) => acc + p.total, 0)
  const total = subtotal - (Number(data.desconto) || 0)

  useEffect(() => {
    setCanAdvance(!!data.pagamento.forma && total > 0)
  }, [data.pagamento, total, setCanAdvance])

  const parcelasCalc = total / (data.pagamento.parcelas || 1)

  return (
    <div className="space-y-[16px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">
        5. Condições de Pagamento
      </h2>

      <div className="bg-dark-denim text-off-white p-[24px] rounded-[8px] text-center mb-[24px]">
        <div className="text-pale-cornflower mb-[8px] font-bold text-[14px] uppercase tracking-wider">
          Valor Total do Projeto
        </div>
        <div className="text-[32px] font-bold">R$ {total.toFixed(2)}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
        <div>
          <label htmlFor="formaPagamento" className={labelClass}>
            Forma de Pagamento *
          </label>
          <select
            id="formaPagamento"
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
            <label htmlFor="parcelas" className={labelClass}>
              Número de Parcelas *
            </label>
            <select
              id="parcelas"
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
          <div className={`md:col-span-2 ${cardClass} mt-[8px]`}>
            <h3 className="text-[18px] font-bold text-midnight-navy mb-[16px]">
              Resumo do Pagamento
            </h3>
            {data.pagamento.forma === 'A_VISTA' ? (
              <p className="text-midnight-navy text-[16px]">
                1 pagamento único de <strong className="font-bold">R$ {total.toFixed(2)}</strong>
              </p>
            ) : (
              <p className="text-midnight-navy text-[16px]">
                {data.pagamento.parcelas} parcelas de{' '}
                <strong className="font-bold">R$ {parcelasCalc.toFixed(2)}</strong>
              </p>
            )}

            <div className="mt-[16px] max-w-xs">
              <label htmlFor="vencimento" className={labelClass}>
                Data do 1º Vencimento *
              </label>
              <input id="vencimento" type="date" className={inputClass} />
            </div>

            {data.pagamento.forma !== 'A_VISTA' && (
              <div className="mt-[24px] overflow-x-auto rounded-[8px] border border-steel-blue">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className={tableHeaderClass}>Parcela</th>
                      <th className={tableHeaderClass}>Vencimento</th>
                      <th className={`${tableHeaderClass} text-right`}>Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: data.pagamento.parcelas }).map((_, i) => (
                      <tr key={i} className={tableRowClass}>
                        <td className="p-[12px]">{i + 1}</td>
                        <td className="p-[12px] text-steel-blue italic">A definir</td>
                        <td className="p-[12px] text-right font-bold">
                          R$ {parcelasCalc.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
