import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'

export function Step7Revisao() {
  const { data, updateData, setCanAdvance } = useComercialForm()

  useEffect(() => {
    setCanAdvance(!!data.confirmado)
  }, [data.confirmado, setCanAdvance])

  const subtotal = data.produtos.reduce((acc, p) => acc + p.total, 0)
  const total = subtotal - (Number(data.desconto) || 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-midnight-navy border-b-2 border-steel-blue pb-2">
        7. Revisão e Confirmação
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-pale-cornflower/20 p-5 rounded-xl border-2 border-steel-blue/30">
          <h3 className="font-bold text-midnight-navy text-lg mb-2">Dados do Cliente</h3>
          <p className="text-midnight-navy">
            <strong>CPF:</strong> {data.cliente.cpf}
          </p>
          <p className="text-midnight-navy">
            <strong>Profissão:</strong> {data.cliente.profissao}
          </p>
          <p className="text-midnight-navy">
            <strong>Renda:</strong> R$ {data.cliente.renda}
          </p>
        </div>

        <div className="bg-pale-cornflower/20 p-5 rounded-xl border-2 border-steel-blue/30">
          <h3 className="font-bold text-midnight-navy text-lg mb-2">Obra</h3>
          <p className="text-midnight-navy">
            {data.obra.endereco}, {data.obra.numero}
          </p>
          <p className="text-midnight-navy">
            {data.obra.cidade} - {data.obra.estado}
          </p>
          <p className="text-midnight-navy">{data.obra.metragem} m²</p>
        </div>

        <div className="bg-pale-cornflower/20 p-5 rounded-xl border-2 border-steel-blue/30 md:col-span-2">
          <h3 className="font-bold text-midnight-navy text-lg mb-2">
            Produtos ({data.produtos.length})
          </h3>
          <p className="text-midnight-navy">
            <strong>Total:</strong> R$ {total.toFixed(2)}
          </p>
          <p className="text-midnight-navy">
            <strong>Pagamento:</strong> {data.pagamento.forma.replace('_', ' ')} (
            {data.pagamento.parcelas}x)
          </p>
        </div>
      </div>

      <div className="mt-8 bg-off-white border-2 border-dark-denim p-6 rounded-xl flex items-start gap-4">
        <input
          type="checkbox"
          id="confirm"
          checked={data.confirmado || false}
          onChange={(e) => updateData('confirmado', e.target.checked)}
          className="w-6 h-6 mt-1 accent-dark-denim"
        />
        <label htmlFor="confirm" className="text-midnight-navy text-lg font-bold cursor-pointer">
          Confirmo que revisei todos os dados com o cliente e que as informações do projeto,
          produtos e condições de pagamento estão corretas.
        </label>
      </div>
    </div>
  )
}
