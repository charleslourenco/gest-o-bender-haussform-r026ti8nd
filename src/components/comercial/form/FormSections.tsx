import { useMemo } from 'react'
import {
  FormState,
  maskCPF,
  maskPhone,
  maskCEP,
  formatCurrency,
  addBusinessDays,
} from './FormUtils'
import { Copy, Plus, Trash2 } from 'lucide-react'

const inputClass =
  'w-full bg-off-white border-2 border-steel-blue rounded-[4px] px-[12px] py-[8px] text-midnight-navy focus:outline-none focus:border-dark-denim transition-colors'

interface Props {
  data: FormState
  update: (field: keyof FormState, val: any) => void
  updateViaCep: (cep: string, isObra: boolean) => void
}

export function SectionPessoal({ data, update }: Props) {
  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 01 — DADOS PESSOAIS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Nome completo *</label>
          <input
            type="text"
            className={inputClass}
            value={data.nome}
            onChange={(e) => update('nome', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">CPF *</label>
          <input
            type="text"
            className={inputClass}
            value={data.cpf}
            onChange={(e) => update('cpf', maskCPF(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Telefone *</label>
          <input
            type="text"
            className={inputClass}
            value={data.telefone}
            onChange={(e) => update('telefone', maskPhone(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">E-mail *</label>
          <input
            type="email"
            className={inputClass}
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Profissão *</label>
          <input
            type="text"
            className={inputClass}
            value={data.profissao}
            onChange={(e) => update('profissao', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Estado civil *</label>
          <select
            className={inputClass}
            value={data.estado_civil}
            onChange={(e) => update('estado_civil', e.target.value)}
          >
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export function SectionEndereco({ data, update, updateViaCep }: Props) {
  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 02 — ENDEREÇO RESIDENCIAL</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">CEP *</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_cep}
            onBlur={(e) => updateViaCep(e.target.value, false)}
            onChange={(e) => update('end_cep', maskCEP(e.target.value))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Município</label>
          <input
            type="text"
            readOnly
            className={inputClass + ' opacity-70'}
            value={data.end_municipio}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Estado</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_estado}
            onChange={(e) => update('end_estado', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Rua</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_rua}
            onChange={(e) => update('end_rua', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Número *</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_numero}
            onChange={(e) => update('end_numero', e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Bairro</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_bairro}
            onChange={(e) => update('end_bairro', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Complemento</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_complemento}
            onChange={(e) => update('end_complemento', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export function SectionObra({ data, update, updateViaCep }: Props) {
  const handleCopy = () => {
    update('obra_cep', data.end_cep)
    update('obra_municipio', data.end_municipio)
    update('obra_estado', data.end_estado)
    update('obra_rua', data.end_rua)
    update('obra_numero', data.end_numero)
    update('obra_bairro', data.end_bairro)
    update('obra_complemento', data.end_complemento)
  }
  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-[12px] gap-[12px]">
        <h2 className="font-bold text-[18px]">SEÇÃO 03 — ENDEREÇO DA OBRA</h2>
        <button
          type="button"
          onClick={handleCopy}
          className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy px-[16px] py-[8px] rounded-[4px] font-semibold flex items-center gap-[8px] hover:bg-steel-blue hover:text-off-white transition-colors"
        >
          <Copy className="w-4 h-4" /> Mesmo endereço residencial
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">CEP *</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_cep}
            onBlur={(e) => updateViaCep(e.target.value, true)}
            onChange={(e) => update('obra_cep', maskCEP(e.target.value))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Município</label>
          <input
            type="text"
            readOnly
            className={inputClass + ' opacity-70'}
            value={data.obra_municipio}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Estado</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_estado}
            onChange={(e) => update('obra_estado', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Rua</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_rua}
            onChange={(e) => update('obra_rua', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Número *</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_numero}
            onChange={(e) => update('obra_numero', e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Bairro</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_bairro}
            onChange={(e) => update('obra_bairro', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Complemento</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_complemento}
            onChange={(e) => update('obra_complemento', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export function SectionProdutos({ data, update, total }: Props & { total: number }) {
  const addProd = () =>
    update('produtos', [
      ...data.produtos,
      {
        id: Math.random().toString(36).substring(2),
        nome: '',
        qtd: 1,
        descricao: '',
        valor_unitario: 0,
      },
    ])
  const remProd = (id: string) => {
    if (data.produtos.length > 1)
      update(
        'produtos',
        data.produtos.filter((p) => p.id !== id),
      )
  }
  const upProd = (id: string, f: string, v: any) =>
    update(
      'produtos',
      data.produtos.map((p) => (p.id === id ? { ...p, [f]: v } : p)),
    )

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">
        SEÇÃO 04 — PRODUTOS E SERVIÇOS CONTRATADOS
      </h2>
      <button
        type="button"
        onClick={addProd}
        className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] font-bold mb-[16px] flex items-center gap-[8px] hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> Adicionar Produto
      </button>
      <div className="overflow-x-auto mb-[16px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-dark-denim text-off-white font-[600]">
              <th className="p-[12px] border border-steel-blue">Produto/Serviço</th>
              <th className="p-[12px] border border-steel-blue w-[80px]">Qtd</th>
              <th className="p-[12px] border border-steel-blue">Descrição</th>
              <th className="p-[12px] border border-steel-blue w-[150px]">Valor Unit.</th>
              <th className="p-[12px] border border-steel-blue w-[150px]">Valor Total</th>
              <th className="p-[12px] border border-steel-blue w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {data.produtos.map((p) => (
              <tr key={p.id} className="bg-pale-cornflower text-midnight-navy">
                <td className="p-[8px] border border-steel-blue">
                  <input
                    className="w-full bg-off-white p-2 rounded"
                    value={p.nome}
                    onChange={(e) => upProd(p.id, 'nome', e.target.value)}
                  />
                </td>
                <td className="p-[8px] border border-steel-blue">
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-off-white p-2 rounded"
                    value={p.qtd}
                    onChange={(e) =>
                      upProd(p.id, 'qtd', Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                </td>
                <td className="p-[8px] border border-steel-blue">
                  <input
                    className="w-full bg-off-white p-2 rounded"
                    value={p.descricao}
                    onChange={(e) => upProd(p.id, 'descricao', e.target.value)}
                  />
                </td>
                <td className="p-[8px] border border-steel-blue">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-off-white p-2 rounded"
                    value={p.valor_unitario}
                    onChange={(e) =>
                      upProd(p.id, 'valor_unitario', parseFloat(e.target.value) || 0)
                    }
                  />
                </td>
                <td className="p-[8px] border border-steel-blue font-bold">
                  {formatCurrency(p.qtd * p.valor_unitario)}
                </td>
                <td className="p-[8px] border border-steel-blue text-center">
                  <button
                    onClick={() => remProd(p.id)}
                    className="text-steel-blue hover:text-dark-denim"
                  >
                    <Trash2 className="w-5 h-5 mx-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-end gap-[8px]">
        <div className="flex items-center gap-[8px]">
          <span className="font-semibold">DESCONTO:</span>
          <input
            type="number"
            step="0.01"
            className={inputClass + ' w-[150px]'}
            value={data.desconto}
            onChange={(e) => update('desconto', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="bg-dark-denim text-off-white font-bold text-[18px] px-[24px] py-[12px] rounded-[8px]">
          TOTAL: {formatCurrency(total)}
        </div>
      </div>
    </div>
  )
}

export function SectionPagamento({
  data,
  update,
  total,
  parcelasBatem,
}: Props & { total: number; parcelasBatem: boolean }) {
  const addParc = () => {
    const last = data.pagamento_parcelado[data.pagamento_parcelado.length - 1]
    const nextDate = last
      ? new Date(new Date(last.data).getTime() + 30 * 86400000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
    const arr = [
      ...data.pagamento_parcelado,
      { id: Math.random().toString(36).substring(2), data: nextDate, valor: 0, meio: 'dinheiro' },
    ]
    const val = Number((total / arr.length).toFixed(2))
    const rem = total - val * arr.length
    update(
      'pagamento_parcelado',
      arr.map((p, i) => ({ ...p, valor: i === 0 ? val + rem : val })),
    )
  }
  const remParc = (id: string) => {
    if (data.pagamento_parcelado.length > 2)
      update(
        'pagamento_parcelado',
        data.pagamento_parcelado.filter((p) => p.id !== id),
      )
  }
  const upParc = (id: string, f: string, v: any) =>
    update(
      'pagamento_parcelado',
      data.pagamento_parcelado.map((p) => (p.id === id ? { ...p, [f]: v } : p)),
    )

  const handleDistribuir = () => {
    if (data.pagamento_parcelado.length === 0) return
    const val = Number((total / data.pagamento_parcelado.length).toFixed(2))
    const rem = total - val * data.pagamento_parcelado.length
    update(
      'pagamento_parcelado',
      data.pagamento_parcelado.map((p, i) => ({ ...p, valor: i === 0 ? val + rem : val })),
    )
  }

  const meios = [
    'dinheiro',
    'pix',
    'cheque',
    'boleto',
    'transferência',
    'crédito',
    'débito',
    'permuta',
    'criptomoeda',
  ]

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 05 — FORMA E MEIO DE PAGAMENTO</h2>
      <div className="flex gap-[16px] mb-[16px]">
        <label className="flex items-center gap-[8px] bg-off-white px-[16px] py-[12px] border-2 border-steel-blue rounded-[8px] cursor-pointer">
          <input
            type="radio"
            name="forma"
            checked={data.forma_pagamento === 'A_VISTA'}
            onChange={() => update('forma_pagamento', 'A_VISTA')}
          />{' '}
          À VISTA
        </label>
        <label className="flex items-center gap-[8px] bg-off-white px-[16px] py-[12px] border-2 border-steel-blue rounded-[8px] cursor-pointer">
          <input
            type="radio"
            name="forma"
            checked={data.forma_pagamento === 'PARCELADO'}
            onChange={() => update('forma_pagamento', 'PARCELADO')}
          />{' '}
          PARCELADO
        </label>
      </div>

      {data.forma_pagamento === 'A_VISTA' ? (
        <table className="w-full text-left border-collapse bg-off-white">
          <thead>
            <tr className="bg-dark-denim text-off-white">
              <th className="p-[12px] border border-steel-blue">Data</th>
              <th className="p-[12px] border border-steel-blue">Valor</th>
              <th className="p-[12px] border border-steel-blue">Meio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-[8px] border border-steel-blue">
                <input
                  type="date"
                  className={inputClass}
                  value={data.pagamento_a_vista_data}
                  onChange={(e) => update('pagamento_a_vista_data', e.target.value)}
                />
              </td>
              <td className="p-[8px] border border-steel-blue font-bold">
                {formatCurrency(total)}
              </td>
              <td className="p-[8px] border border-steel-blue">
                <select
                  className={inputClass}
                  value={data.pagamento_a_vista_meio}
                  onChange={(e) => update('pagamento_a_vista_meio', e.target.value)}
                >
                  {meios.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div>
          <button
            type="button"
            onClick={addParc}
            className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] font-bold mb-[16px] flex items-center gap-[8px] hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Adicionar Parcela
          </button>
          {!parcelasBatem && (
            <div className="mb-[16px] p-[12px] border-2 border-steel-blue bg-off-white text-steel-blue font-semibold rounded-[8px] flex items-center justify-between">
              <span>
                A soma das parcelas não corresponde ao total ({formatCurrency(total)}). Ajuste os
                valores.
              </span>
              <button
                type="button"
                onClick={handleDistribuir}
                className="bg-steel-blue text-off-white px-[12px] py-[6px] rounded hover:opacity-90"
              >
                Distribuir igualmente
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-off-white min-w-[600px]">
              <thead>
                <tr className="bg-dark-denim text-off-white">
                  <th className="p-[12px] border border-steel-blue w-[50px]">Nº</th>
                  <th className="p-[12px] border border-steel-blue">Data</th>
                  <th className="p-[12px] border border-steel-blue">Valor</th>
                  <th className="p-[12px] border border-steel-blue">Meio</th>
                  <th className="p-[12px] border border-steel-blue w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {data.pagamento_parcelado.map((p, i) => (
                  <tr key={p.id}>
                    <td className="p-[8px] border border-steel-blue text-center font-bold">
                      {i + 1}
                    </td>
                    <td className="p-[8px] border border-steel-blue">
                      <input
                        type="date"
                        className={inputClass}
                        value={p.data}
                        onChange={(e) => upParc(p.id, 'data', e.target.value)}
                      />
                    </td>
                    <td className="p-[8px] border border-steel-blue">
                      <input
                        type="number"
                        step="0.01"
                        className={inputClass}
                        value={p.valor}
                        onChange={(e) => upParc(p.id, 'valor', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="p-[8px] border border-steel-blue">
                      <select
                        className={inputClass}
                        value={p.meio}
                        onChange={(e) => upParc(p.id, 'meio', e.target.value)}
                      >
                        {meios.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-[8px] border border-steel-blue text-center">
                      <button
                        onClick={() => remParc(p.id)}
                        className="text-steel-blue hover:text-dark-denim"
                      >
                        <Trash2 className="w-5 h-5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function SectionDatas({ data, update }: Props) {
  const dataVenda = useMemo(() => new Date().toISOString().split('T')[0], [])
  const dataEntregaStr = useMemo(() => {
    if (!data.data_medida) return ''
    const base = new Date(data.data_medida)
    if (isNaN(base.getTime())) return ''
    const formatD = (d: Date) => d.toLocaleDateString('pt-BR')
    return `Entrega entre dia ${formatD(addBusinessDays(base, 50))} e dia ${formatD(addBusinessDays(base, 70))}`
  }, [data.data_medida])

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 06 — DATAS IMPORTANTES</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Data da venda</label>
          <input
            type="date"
            readOnly
            className={inputClass + ' opacity-50 cursor-not-allowed'}
            value={dataVenda}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">
            Data estimada p/ medida fina *
          </label>
          <input
            type="date"
            className={inputClass}
            value={data.data_medida}
            onChange={(e) => update('data_medida', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Previsão de entrega</label>
          <input
            type="text"
            readOnly
            className={inputClass + ' opacity-50 cursor-not-allowed'}
            value={dataEntregaStr}
            placeholder="Preencha a data de medida fina"
          />
        </div>
      </div>
    </div>
  )
}

export function SectionResumo({ data, update, total }: Props & { total: number }) {
  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[16px]">SEÇÃO 07 — RESUMO</h2>
      <div className="space-y-[16px]">
        <div>
          <h3 className="font-semibold mb-[4px]">Produtos e Serviços contratados:</h3>
          <ul className="list-disc list-inside pl-[8px]">
            {data.produtos.map((p) => (
              <li key={p.id}>
                {p.nome || 'Produto sem nome'} — Qtd: {p.qtd} —{' '}
                {formatCurrency(p.qtd * p.valor_unitario)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-[4px]">Valor total e forma de pagamento:</h3>
          <p>
            Valor total: <span className="font-bold">{formatCurrency(total)}</span>
          </p>
          <p>Forma de pagamento: {data.forma_pagamento === 'A_VISTA' ? 'À VISTA' : 'PARCELADO'}</p>
          {data.forma_pagamento === 'A_VISTA' ? (
            <p>
              Data: {data.pagamento_a_vista_data.split('-').reverse().join('/')} — Meio:{' '}
              {data.pagamento_a_vista_meio}
            </p>
          ) : (
            <p>
              Parcelas: {data.pagamento_parcelado.length} — Primeira em{' '}
              {data.pagamento_parcelado[0]?.data.split('-').reverse().join('/')} — Meio principal:{' '}
              {data.pagamento_parcelado[0]?.meio}
            </p>
          )}
        </div>
        <div>
          <h3 className="font-semibold mb-[4px]">Nome de quem vendeu:</h3>
          <input
            type="text"
            className={inputClass + ' max-w-[300px]'}
            value={data.vendedor_nome}
            onChange={(e) => update('vendedor_nome', e.target.value)}
          />
        </div>
        <div>
          <h3 className="font-semibold mb-[4px]">Data da venda:</h3>
          <p>{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  )
}
