import { useEffect } from 'react'
import { useComercialForm } from '@/hooks/use-comercial-form'
import { cardClass } from './styles'

export function Step7Revisao() {
  const { data, updateData, setCanAdvance, setStep } = useComercialForm()

  useEffect(() => {
    setCanAdvance(!!data.confirmado)
  }, [data.confirmado, setCanAdvance])

  const subtotal = data.produtos.reduce((acc, p) => acc + p.total, 0)
  const total = subtotal - (Number(data.desconto) || 0)

  return (
    <div className="space-y-[24px] animate-in fade-in duration-300">
      <h2 className="text-[24px] font-bold text-midnight-navy mb-[16px]">
        7. Revisão e Confirmação
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div className={cardClass}>
          <div className="flex justify-between items-start mb-[12px]">
            <h3 className="font-bold text-midnight-navy text-[16px]">Dados do Cliente</h3>
            <button
              onClick={() => setStep(1)}
              className="bg-dark-denim text-off-white px-[16px] py-[8px] rounded-[6px] text-[12px] font-bold hover:opacity-90"
            >
              Editar
            </button>
          </div>
          <p className="text-midnight-navy text-[14px]">
            <strong>CPF:</strong> {data.cliente.cpf || 'Não informado'}
          </p>
          <p className="text-midnight-navy text-[14px]">
            <strong>Profissão:</strong> {data.cliente.profissao}
          </p>
          <p className="text-midnight-navy text-[14px]">
            <strong>Renda:</strong> R$ {data.cliente.renda}
          </p>
        </div>

        <div className={cardClass}>
          <div className="flex justify-between items-start mb-[12px]">
            <h3 className="font-bold text-midnight-navy text-[16px]">Obra</h3>
            <button
              onClick={() => setStep(2)}
              className="bg-dark-denim text-off-white px-[16px] py-[8px] rounded-[6px] text-[12px] font-bold hover:opacity-90"
            >
              Editar
            </button>
          </div>
          <p className="text-midnight-navy text-[14px]">
            {data.obra.endereco || 'Não informado'}, {data.obra.numero}
          </p>
          <p className="text-midnight-navy text-[14px]">
            {data.obra.cidade} - {data.obra.estado}
          </p>
          <p className="text-midnight-navy text-[14px]">{data.obra.metragem} m²</p>
        </div>

        <div className={`${cardClass} md:col-span-2`}>
          <div className="flex justify-between items-start mb-[12px]">
            <h3 className="font-bold text-midnight-navy text-[16px]">
              Resumo do Projeto ({data.produtos.length} produtos)
            </h3>
            <button
              onClick={() => setStep(4)}
              className="bg-dark-denim text-off-white px-[16px] py-[8px] rounded-[6px] text-[12px] font-bold hover:opacity-90"
            >
              Editar
            </button>
          </div>
          <p className="text-midnight-navy text-[14px]">
            <strong>Total Final:</strong> R$ {total.toFixed(2)}
          </p>
          <p className="text-midnight-navy text-[14px]">
            <strong>Pagamento:</strong> {data.pagamento.forma.replace('_', ' ')} (
            {data.pagamento.parcelas}x)
          </p>
          <p className="text-midnight-navy text-[14px]">
            <strong>Documentos:</strong> {data.documentos.length} selecionados
          </p>
        </div>
      </div>

      <label className="bg-off-white border-[2px] border-dark-denim p-[24px] rounded-[8px] flex items-start gap-[16px] cursor-pointer hover:bg-pale-cornflower/10 transition-colors">
        <input
          type="checkbox"
          checked={data.confirmado || false}
          onChange={(e) => updateData('confirmado', e.target.checked)}
          className="w-6 h-6 mt-1 accent-dark-denim border-[2px] border-steel-blue cursor-pointer"
        />
        <span className="text-midnight-navy text-[16px] font-bold leading-relaxed">
          Confirmo que revisei todos os dados com o cliente e que as informações do projeto,
          produtos, condições de pagamento e documentos estão corretas para a geração do contrato.
        </span>
      </label>
    </div>
  )
}
