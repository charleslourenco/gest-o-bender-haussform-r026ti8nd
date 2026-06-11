import {
  FormState,
  maskCPF,
  maskPhoneStrict,
  maskCEP,
  formatCurrencyInput,
  addBusinessDays,
} from './FormUtils'
import { Plus, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'

const inputClass =
  'w-full bg-off-white border-2 border-steel-blue rounded-[4px] px-[12px] py-[8px] text-midnight-navy focus:outline-none focus:border-dark-denim transition-colors'

interface Props {
  data: FormState
  update: (field: keyof FormState, val: any) => void
  updateViaCep?: (cep: string, isObra: boolean) => void
}

export function SectionPessoal({ data, update }: Props) {
  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 1 — DADOS PESSOAIS</h2>
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
          <label className="block text-[14px] font-semibold mb-[4px]">Data de Nascimento</label>
          <input
            type="date"
            className={inputClass}
            value={data.data_nascimento}
            onChange={(e) => update('data_nascimento', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Profissão</label>
          <input
            type="text"
            className={inputClass}
            value={data.profissao}
            onChange={(e) => update('profissao', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Estado civil</label>
          <select
            className={inputClass}
            value={data.estado_civil}
            onChange={(e) => update('estado_civil', e.target.value)}
          >
            <option value="Solteiro">Solteiro</option>
            <option value="Solteira">Solteira</option>
            <option value="Casado">Casado</option>
            <option value="Casada">Casada</option>
            <option value="Divorciado">Divorciado</option>
            <option value="Divorciada">Divorciada</option>
            <option value="Viúvo">Viúvo</option>
            <option value="Viúva">Viúva</option>
            <option value="Separado Judicialmente">Separado Judicialmente</option>
            <option value="Separada Judicialmente">Separada Judicialmente</option>
            <option value="União Estável">União Estável</option>
          </select>
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
          <label className="block text-[14px] font-semibold mb-[4px]">Telefone *</label>
          <input
            type="text"
            className={inputClass}
            value={data.telefone}
            onChange={(e) => update('telefone', maskPhoneStrict(e.target.value))}
            placeholder="(00)00000-0000"
          />
        </div>
      </div>
    </div>
  )
}

export function SectionEndereco({ data, update, updateViaCep }: Props) {
  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 2 — ENDEREÇO RESIDENCIAL</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">CEP</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_cep}
            onBlur={(e) => updateViaCep?.(e.target.value, false)}
            onChange={(e) => update('end_cep', maskCEP(e.target.value))}
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
          <label className="block text-[14px] font-semibold mb-[4px]">Número</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_numero}
            onChange={(e) => update('end_numero', e.target.value.replace(/\D/g, ''))}
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
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Bairro</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_bairro}
            onChange={(e) => update('end_bairro', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Município</label>
          <input
            type="text"
            className={inputClass}
            value={data.end_municipio}
            onChange={(e) => update('end_municipio', e.target.value)}
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
        <h2 className="font-bold text-[18px]">SEÇÃO 3 — ENDEREÇO DA OBRA</h2>
        <button
          type="button"
          onClick={handleCopy}
          className="bg-off-white border-2 border-steel-blue text-midnight-navy px-[16px] py-[8px] rounded-[4px] font-semibold flex items-center gap-[8px] hover:bg-steel-blue hover:text-off-white transition-colors"
        >
          <Copy className="w-4 h-4" /> Mesmo endereço residencial
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">CEP</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_cep}
            onBlur={(e) => updateViaCep?.(e.target.value, true)}
            onChange={(e) => update('obra_cep', maskCEP(e.target.value))}
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
          <label className="block text-[14px] font-semibold mb-[4px]">Número</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_numero}
            onChange={(e) => update('obra_numero', e.target.value.replace(/\D/g, ''))}
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
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Bairro</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_bairro}
            onChange={(e) => update('obra_bairro', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[14px] font-semibold mb-[4px]">Município</label>
          <input
            type="text"
            className={inputClass}
            value={data.obra_municipio}
            onChange={(e) => update('obra_municipio', e.target.value)}
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
      </div>
    </div>
  )
}

export function SectionProdutos({ data, update }: Props) {
  const addProd = () =>
    update('produtos', [
      ...data.produtos,
      {
        id: Math.random().toString(36).substring(2),
        nome: '',
        qtd: 1,
        descricao: '',
        valor_unitario: 0,
        is_outsourced: false,
      },
    ])
  const remProd = (id: string) => {
    if (data.produtos.length > 1)
      update(
        'produtos',
        data.produtos.filter((p) => p.id !== id),
      )
  }
  const upProd = (id: string, f: string, v: any) => {
    if (f === 'is_outsourced' && v === true) {
      toast('Item direcionado para o fluxo de Compras/Estoque', {
        style: { background: '#102A43', color: '#fff', border: 'none' },
      })
    }
    update(
      'produtos',
      data.produtos.map((p) => (p.id === id ? { ...p, [f]: v } : p)),
    )
  }

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 4 — PRODUTOS E SERVIÇOS</h2>
      <button
        type="button"
        onClick={addProd}
        className="bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] font-bold mb-[16px] flex items-center gap-[8px] hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> Adicionar Produto
      </button>
      <div className="overflow-x-auto mb-[16px]">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-dark-denim text-off-white font-[600]">
              <th className="p-[12px] border border-steel-blue min-w-[200px]">Produto/Serviço</th>
              <th className="p-[12px] border border-steel-blue w-[80px]">Qtd</th>
              <th className="p-[12px] border border-steel-blue min-w-[200px]">Descrição</th>
              <th className="p-[12px] border border-steel-blue w-[150px]">Valor Unitário</th>
              <th className="p-[12px] border border-steel-blue w-[150px]">Valor Total</th>
              <th className="p-[12px] border border-steel-blue w-[180px]">Solicitar Compra</th>
              <th className="p-[12px] border border-steel-blue w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {data.produtos.map((p) => (
              <tr key={p.id} className="bg-off-white text-midnight-navy">
                <td className="p-[8px] border border-steel-blue">
                  <input
                    className={inputClass}
                    value={p.nome}
                    onChange={(e) => upProd(p.id, 'nome', e.target.value)}
                  />
                </td>
                <td className="p-[8px] border border-steel-blue">
                  <input
                    type="number"
                    min="1"
                    className={inputClass}
                    value={p.qtd}
                    onChange={(e) =>
                      upProd(p.id, 'qtd', Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                </td>
                <td className="p-[8px] border border-steel-blue">
                  <input
                    className={inputClass}
                    value={p.descricao}
                    onChange={(e) => upProd(p.id, 'descricao', e.target.value)}
                  />
                </td>
                <td className="p-[8px] border border-steel-blue">
                  <input
                    type="text"
                    className={inputClass}
                    value={formatCurrencyInput(p.valor_unitario * 100)}
                    onChange={(e) =>
                      upProd(
                        p.id,
                        'valor_unitario',
                        Number(e.target.value.replace(/\D/g, '')) / 100,
                      )
                    }
                  />
                </td>
                <td className="p-[8px] border border-steel-blue font-bold">
                  {formatCurrencyInput(p.qtd * p.valor_unitario * 100)}
                </td>
                <td className="p-[8px] border border-steel-blue text-center">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer justify-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-dark-denim"
                      checked={p.is_outsourced || false}
                      onChange={(e) => upProd(p.id, 'is_outsourced', e.target.checked)}
                    />
                    <span className="leading-tight text-left">
                      Solicitar Compra
                      <br />
                      <span className="text-[10px] font-normal">(Item Solto/Terceiro)</span>
                    </span>
                  </label>
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
    </div>
  )
}

export function SectionTotais({ data, update }: Props) {
  const subtotal = data.produtos.reduce((acc, p) => acc + p.qtd * p.valor_unitario, 0)
  const total = Math.max(0, subtotal - data.desconto)

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 5 — TOTAIS</h2>
      <div className="flex flex-col gap-[12px] max-w-xs ml-auto">
        <div className="flex justify-between items-center bg-off-white p-3 border-2 border-steel-blue rounded">
          <span className="font-semibold">Subtotal:</span>
          <span>{formatCurrencyInput(subtotal * 100)}</span>
        </div>
        <div className="flex justify-between items-center bg-off-white p-3 border-2 border-steel-blue rounded">
          <span className="font-semibold">Desconto:</span>
          <input
            type="text"
            className="w-[120px] text-right bg-transparent outline-none font-bold"
            value={formatCurrencyInput(data.desconto * 100)}
            onChange={(e) => update('desconto', Number(e.target.value.replace(/\D/g, '')) / 100)}
          />
        </div>
        <div className="flex justify-between items-center bg-dark-denim text-off-white p-3 rounded">
          <span className="font-bold text-lg">Total final:</span>
          <span className="font-bold text-lg">{formatCurrencyInput(total * 100)}</span>
        </div>
      </div>
    </div>
  )
}

export function SectionPagamento({ data, update }: Props) {
  const subtotal = data.produtos.reduce((acc, p) => acc + p.qtd * p.valor_unitario, 0)
  const total = Math.max(0, subtotal - data.desconto)
  const metodos = ['PIX', 'Boleto', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência']

  const applyParcels = (length: number) => {
    const val = Number((total / length).toFixed(2))
    const rem = total - val * length
    const baseDate = data.data_venda ? new Date(data.data_venda + 'T12:00:00Z') : new Date()

    const arr = Array.from({ length }).map((_, i) => {
      const pDate = new Date(baseDate.getTime())
      pDate.setDate(pDate.getDate() + 30 * (i + 1))

      return {
        id: Math.random().toString(36).substring(2),
        data: pDate.toISOString().split('T')[0],
        valor: i === 0 ? val + rem : val,
        meio: 'PIX',
      }
    })
    update('pagamento_parcelado', arr)
  }

  const updateParcelaCount = (e: any) => {
    const count = Math.max(1, parseInt(e.target.value) || 1)
    applyParcels(count)
  }

  const upParc = (id: string, f: string, v: any) =>
    update(
      'pagamento_parcelado',
      data.pagamento_parcelado.map((p) => (p.id === id ? { ...p, [f]: v } : p)),
    )

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 6 — PAGAMENTO</h2>
      <div className="flex gap-[16px] mb-[16px]">
        <label className="flex items-center gap-[8px] bg-off-white px-[16px] py-[12px] border-2 border-steel-blue rounded-[8px] cursor-pointer">
          <input
            type="radio"
            checked={data.forma_pagamento === 'À vista'}
            onChange={() => update('forma_pagamento', 'À vista')}
          />{' '}
          À vista
        </label>
        <label className="flex items-center gap-[8px] bg-off-white px-[16px] py-[12px] border-2 border-steel-blue rounded-[8px] cursor-pointer">
          <input
            type="radio"
            checked={data.forma_pagamento === 'Parcelado'}
            onChange={() => update('forma_pagamento', 'Parcelado')}
          />{' '}
          Parcelado
        </label>
      </div>

      {data.forma_pagamento === 'À vista' ? (
        <div className="max-w-sm">
          <label className="block text-[14px] font-semibold mb-[4px]">Método de pagamento</label>
          <select
            className={inputClass}
            value={data.pagamento_a_vista_meio}
            onChange={(e) => update('pagamento_a_vista_meio', e.target.value)}
          >
            {metodos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-w-sm flex items-center gap-4">
            <label className="text-[14px] font-semibold whitespace-nowrap">
              Número de parcelas:
            </label>
            <input
              type="number"
              min="1"
              className={inputClass + ' w-20'}
              value={data.pagamento_parcelado.length}
              onChange={updateParcelaCount}
            />
            <button
              type="button"
              onClick={() => applyParcels(data.pagamento_parcelado.length)}
              className="bg-steel-blue text-off-white px-4 py-2 rounded text-sm whitespace-nowrap"
            >
              Recalcular Valores
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-off-white min-w-[500px]">
              <thead>
                <tr className="bg-dark-denim text-off-white">
                  <th className="p-[12px] border border-steel-blue">Nº</th>
                  <th className="p-[12px] border border-steel-blue">Data</th>
                  <th className="p-[12px] border border-steel-blue">Valor</th>
                  <th className="p-[12px] border border-steel-blue">Método</th>
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
                        type="text"
                        className={inputClass}
                        value={formatCurrencyInput(p.valor * 100)}
                        onChange={(e) =>
                          upParc(p.id, 'valor', Number(e.target.value.replace(/\D/g, '')) / 100)
                        }
                      />
                    </td>
                    <td className="p-[8px] border border-steel-blue">
                      <select
                        className={inputClass}
                        value={p.meio}
                        onChange={(e) => upParc(p.id, 'meio', e.target.value)}
                      >
                        {metodos.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
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
  const handleAcessoChange = (val: string) => {
    update('data_acesso_imovel', val)
    if (val) {
      const medicao = addBusinessDays(val, 5)
      update('data_medicao_final', medicao)
      update('data_entrega_minima', addBusinessDays(medicao, 50))
      update('data_entrega_maxima', addBusinessDays(medicao, 70))
    }
  }

  const handleMedicaoChange = (val: string) => {
    update('data_medicao_final', val)
    if (val) {
      update('data_entrega_minima', addBusinessDays(val, 50))
      update('data_entrega_maxima', addBusinessDays(val, 70))
    }
  }

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 7 — DATAS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Data da venda</label>
          <input
            type="date"
            readOnly
            className={inputClass + ' opacity-50 cursor-not-allowed'}
            value={data.data_venda}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">
            Data de acesso ao imóvel *
          </label>
          <input
            type="date"
            className={inputClass}
            value={data.data_acesso_imovel}
            onChange={(e) => handleAcessoChange(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">Data da medição final</label>
          <input
            type="date"
            className={inputClass}
            value={data.data_medicao_final}
            onChange={(e) => handleMedicaoChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">
            Data estimada de entrega — Prazo mínimo
          </label>
          <input
            type="date"
            className={inputClass}
            value={data.data_entrega_minima}
            onChange={(e) => update('data_entrega_minima', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">
            Data estimada de entrega — Prazo máximo
          </label>
          <input
            type="date"
            className={inputClass}
            value={data.data_entrega_maxima}
            onChange={(e) => update('data_entrega_maxima', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
