import {
  FormState,
  ProdutoForm,
  OPCOES_TIPO_ITEM,
  PLANOS_ACOMPANHAMENTO,
  maskPhoneStrict,
  maskCEP,
  formatCurrencyInput,
  addBusinessDays,
} from './FormUtils'
import { maskCpfCnpj } from '@/lib/cpf-cnpj'
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
          <label className="block text-[14px] font-semibold mb-[4px]">
            Nome Completo / Razão Social *
          </label>
          <input
            type="text"
            className={inputClass}
            value={data.nome}
            onChange={(e) => update('nome', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold mb-[4px]">CPF / CNPJ *</label>
          <input
            type="text"
            className={inputClass}
            value={data.cpf}
            onChange={(e) => update('cpf', maskCpfCnpj(e.target.value))}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
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
        tipo: '',
        nome: '',
        qtd: 1,
        desconto_percentual: 0,
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

  const handleTipoChange = (id: string, novoTipo: string) => {
    const updated = data.produtos.map((p) => {
      if (p.id !== id) return p

      const baseUpdate: ProdutoForm = {
        ...p,
        tipo: (novoTipo as any) || '',
      }

      // Regra 2: "Móveis soltos" marca automaticamente o checkbox 'Solicitar Compra (Item Solto/Terceiro)'
      if (novoTipo === 'Móveis soltos') {
        baseUpdate.is_outsourced = true
        toast.success('Móveis soltos: "Solicitar Compra" marcado automaticamente', {
          style: { background: '#102A43', color: '#fff', border: 'none' },
        })
      }

      // Regra 3: ao escolher uma opção de acompanhamento, preencher automaticamente:
      // Nome = nome exato do plano, Descrição = descrição padrão do plano,
      // Preço sugerido = R$ 5.900,00 (Essencial) / R$ 11.900,00 (Forma) / R$ 19.900,00 (Hauss), Quantidade = 1
      // Regra 4: a palavra 'acompanhamento' deve constar no nome/descrição gravada
      // Campos editáveis após preenchimento e re-preenchimento se trocar o plano.
      if (novoTipo && PLANOS_ACOMPANHAMENTO[novoTipo]) {
        const plano = PLANOS_ACOMPANHAMENTO[novoTipo]
        baseUpdate.nome = plano.nome
        baseUpdate.descricao = plano.descricao
        baseUpdate.valor_unitario = plano.preco
        baseUpdate.qtd = plano.quantidade
        toast.success(`Plano preenchido: ${plano.nome}`, {
          style: { background: '#102A43', color: '#fff', border: 'none' },
        })
      }

      return baseUpdate
    })

    update('produtos', updated)
  }

  const upProd = (id: string, f: string, v: any) => {
    if (f === 'is_outsourced' && v === true) {
      toast.success('Item direcionado para o fluxo de Compras/Estoque', {
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
        <table className="w-full text-left border-collapse min-w-[1150px]">
          <thead>
            <tr className="bg-dark-denim text-off-white font-[600]">
              <th className="p-[12px] border border-steel-blue min-w-[200px]">Tipo *</th>
              <th className="p-[12px] border border-steel-blue min-w-[200px]">Produto/Serviço</th>
              <th className="p-[12px] border border-steel-blue w-[85px]">Qtd</th>
              <th className="p-[12px] border border-steel-blue min-w-[200px]">Descrição</th>
              <th className="p-[12px] border border-steel-blue w-[140px]">Valor Unitário</th>
              <th className="p-[12px] border border-steel-blue w-[95px]">Desc. %</th>
              <th className="p-[12px] border border-steel-blue w-[140px]">Valor Total</th>
              <th className="p-[12px] border border-steel-blue w-[180px]">Solicitar Compra</th>
              <th className="p-[12px] border border-steel-blue w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {data.produtos.map((p) => {
              const isLocked = !p.tipo
              const lockedClass = isLocked ? 'opacity-40 cursor-not-allowed bg-slate-200' : ''
              const numericQtd = typeof p.qtd === 'number' ? p.qtd : parseFloat(String(p.qtd)) || 0
              const numericDescPerc =
                typeof p.desconto_percentual === 'number'
                  ? p.desconto_percentual
                  : parseFloat(String(p.desconto_percentual)) || 0
              const safeQtd = Number.isFinite(numericQtd) && numericQtd > 0 ? numericQtd : 0
              const safeDescPerc =
                Number.isFinite(numericDescPerc) && numericDescPerc >= 0
                  ? Math.min(100, numericDescPerc)
                  : 0
              const vu = Number(p.valor_unitario) || 0
              const totalLinha = Math.max(0, safeQtd * vu * (1 - safeDescPerc / 100))

              return (
                <tr key={p.id} className="bg-off-white text-midnight-navy">
                  {/* Coluna 1: Tipo (Lista suspensa obrigatória para destravar os demais campos) */}
                  <td className="p-[8px] border border-steel-blue">
                    <select
                      className={`${inputClass} font-semibold`}
                      value={p.tipo || ''}
                      onChange={(e) => handleTipoChange(p.id, e.target.value)}
                    >
                      <option value="">Selecione o tipo...</option>
                      {OPCOES_TIPO_ITEM.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {isLocked && (
                      <span className="text-[10px] text-amber-700 block mt-1 font-medium">
                        Escolha o tipo para destravar
                      </span>
                    )}
                  </td>
                  <td className="p-[8px] border border-steel-blue">
                    <input
                      disabled={isLocked}
                      className={`${inputClass} ${lockedClass}`}
                      value={p.nome}
                      placeholder={
                        isLocked ? 'Travado (escolha o tipo)' : 'Nome do produto/serviço'
                      }
                      onChange={(e) => upProd(p.id, 'nome', e.target.value)}
                    />
                  </td>
                  <td className="p-[8px] border border-steel-blue">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={isLocked}
                      className={`${inputClass} ${lockedClass} text-center`}
                      value={p.qtd ?? ''}
                      placeholder="1"
                      onChange={(e) => {
                        const raw = e.target.value
                        // Permite campo vazio temporariamente durante digitação
                        if (raw === '') {
                          upProd(p.id, 'qtd', '')
                          return
                        }
                        const parsed = parseInt(raw, 10)
                        if (Number.isFinite(parsed)) {
                          upProd(p.id, 'qtd', Math.max(1, parsed))
                        }
                      }}
                      onBlur={(e) => {
                        const raw = e.target.value.trim()
                        const parsed = parseInt(raw, 10)
                        if (!Number.isFinite(parsed) || parsed < 1) {
                          upProd(p.id, 'qtd', 1)
                        } else {
                          upProd(p.id, 'qtd', parsed)
                        }
                      }}
                    />
                  </td>
                  <td className="p-[8px] border border-steel-blue">
                    <input
                      disabled={isLocked}
                      className={`${inputClass} ${lockedClass}`}
                      value={p.descricao}
                      placeholder={isLocked ? 'Travado' : 'Descrição/Ambiente'}
                      onChange={(e) => upProd(p.id, 'descricao', e.target.value)}
                    />
                  </td>
                  <td className="p-[8px] border border-steel-blue">
                    <input
                      type="text"
                      disabled={isLocked}
                      className={`${inputClass} ${lockedClass}`}
                      value={formatCurrencyInput(Math.round(vu * 100))}
                      onChange={(e) =>
                        upProd(
                          p.id,
                          'valor_unitario',
                          Number(e.target.value.replace(/\D/g, '')) / 100,
                        )
                      }
                    />
                  </td>
                  <td className="p-[8px] border border-steel-blue">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={isLocked}
                        className={`${inputClass} ${lockedClass} pr-6 text-right`}
                        value={p.desconto_percentual ?? 0}
                        placeholder="0"
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.')
                          if (raw === '') {
                            upProd(p.id, 'desconto_percentual', '')
                            return
                          }
                          // Permite digitar número com ponto
                          if (/^\d*\.?\d*$/.test(raw)) {
                            const parsed = parseFloat(raw)
                            if (Number.isFinite(parsed)) {
                              if (parsed > 100) {
                                upProd(p.id, 'desconto_percentual', 100)
                              } else {
                                upProd(p.id, 'desconto_percentual', raw)
                              }
                            } else {
                              upProd(p.id, 'desconto_percentual', raw)
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const raw = String(e.target.value).trim().replace(',', '.')
                          const parsed = parseFloat(raw)
                          if (!Number.isFinite(parsed) || parsed < 0) {
                            upProd(p.id, 'desconto_percentual', 0)
                          } else if (parsed > 100) {
                            upProd(p.id, 'desconto_percentual', 100)
                          } else {
                            upProd(p.id, 'desconto_percentual', parsed)
                          }
                        }}
                      />
                      <span className="absolute right-2 text-xs font-semibold text-muted-foreground pointer-events-none">
                        %
                      </span>
                    </div>
                  </td>
                  <td className="p-[8px] border border-steel-blue font-bold">
                    {formatCurrencyInput(Math.round(totalLinha * 100))}
                  </td>
                  <td className="p-[8px] border border-steel-blue text-center">
                    <label
                      className={`flex items-center gap-2 text-xs font-semibold justify-center ${
                        isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        className="w-4 h-4 accent-dark-denim disabled:cursor-not-allowed"
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
                      title="Remover linha"
                    >
                      <Trash2 className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SectionTotais({ data, update }: Props) {
  const subtotalBruto = data.produtos.reduce((acc, p) => {
    const q = typeof p.qtd === 'number' ? p.qtd : parseFloat(String(p.qtd)) || 0
    const vu = Number(p.valor_unitario) || 0
    return acc + (Number.isFinite(q) && q > 0 ? q : 0) * vu
  }, 0)

  const subtotalComDescontoItens = data.produtos.reduce((acc, p) => {
    const q = typeof p.qtd === 'number' ? p.qtd : parseFloat(String(p.qtd)) || 0
    const vu = Number(p.valor_unitario) || 0
    const descPercRaw =
      typeof p.desconto_percentual === 'number'
        ? p.desconto_percentual
        : parseFloat(String(p.desconto_percentual)) || 0
    const descPerc =
      Number.isFinite(descPercRaw) && descPercRaw >= 0 ? Math.min(100, descPercRaw) : 0
    const safeQtd = Number.isFinite(q) && q > 0 ? q : 0
    return acc + Math.max(0, safeQtd * vu * (1 - descPerc / 100))
  }, 0)

  const totalDescontoItens = Math.max(0, subtotalBruto - subtotalComDescontoItens)
  const total = Math.max(0, subtotalComDescontoItens - (Number(data.desconto) || 0))

  return (
    <div className="bg-pale-cornflower border-2 border-steel-blue text-midnight-navy p-[16px] rounded-[8px] mb-[16px]">
      <h2 className="font-bold text-[18px] mb-[12px]">SEÇÃO 5 — TOTAIS</h2>
      <div className="flex flex-col gap-[12px] max-w-sm ml-auto">
        <div className="flex justify-between items-center bg-off-white p-3 border-2 border-steel-blue rounded">
          <span className="font-semibold">Subtotal:</span>
          <span>{formatCurrencyInput(Math.round(subtotalBruto * 100))}</span>
        </div>
        {totalDescontoItens > 0 && (
          <div className="flex justify-between items-center bg-off-white p-3 border-2 border-steel-blue rounded text-emerald-800">
            <span className="font-semibold text-xs">Desc. Itens (%):</span>
            <span className="font-semibold text-xs">
              - {formatCurrencyInput(Math.round(totalDescontoItens * 100))}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center bg-off-white p-3 border-2 border-steel-blue rounded">
          <span className="font-semibold">Desconto (R$):</span>
          <input
            type="text"
            className="w-[120px] text-right bg-transparent outline-none font-bold"
            value={formatCurrencyInput(Math.round(data.desconto * 100))}
            onChange={(e) => update('desconto', Number(e.target.value.replace(/\D/g, '')) / 100)}
          />
        </div>
        <div className="flex justify-between items-center bg-dark-denim text-off-white p-3 rounded">
          <span className="font-bold text-lg">Total final:</span>
          <span className="font-bold text-lg">{formatCurrencyInput(Math.round(total * 100))}</span>
        </div>
      </div>
    </div>
  )
}

export function SectionPagamento({ data, update }: Props) {
  const subtotalComDescontoItens = data.produtos.reduce((acc, p) => {
    const q = typeof p.qtd === 'number' ? p.qtd : parseFloat(String(p.qtd)) || 0
    const vu = Number(p.valor_unitario) || 0
    const descPercRaw =
      typeof p.desconto_percentual === 'number'
        ? p.desconto_percentual
        : parseFloat(String(p.desconto_percentual)) || 0
    const descPerc =
      Number.isFinite(descPercRaw) && descPercRaw >= 0 ? Math.min(100, descPercRaw) : 0
    const safeQtd = Number.isFinite(q) && q > 0 ? q : 0
    return acc + Math.max(0, safeQtd * vu * (1 - descPerc / 100))
  }, 0)
  const total = Math.max(0, subtotalComDescontoItens - (Number(data.desconto) || 0))
  const metodos = [
    'PIX',
    'Boleto',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Transferência',
    'Dinheiro',
    'Permuta',
    'Cheque',
  ]

  const buildDefaultParcela = (index: number) => {
    const baseDate = data.data_venda ? new Date(data.data_venda + 'T12:00:00Z') : new Date()
    const pDate = new Date(baseDate.getTime())
    pDate.setDate(pDate.getDate() + 30 * (index + 1))
    return {
      id: Math.random().toString(36).substring(2),
      data: pDate.toISOString().split('T')[0],
      valor: 0,
      meio: 'PIX',
    }
  }

  const equalizeParcels = () => {
    const length = Math.max(1, data.pagamento_parcelado.length)
    const val = Number((total / length).toFixed(2))
    const rem = total - val * length
    const baseDate = data.data_venda ? new Date(data.data_venda + 'T12:00:00Z') : new Date()
    const arr = Array.from({ length }).map((_, i) => {
      const pDate = new Date(baseDate.getTime())
      pDate.setDate(pDate.getDate() + 30 * (i + 1))
      return {
        id: data.pagamento_parcelado[i]?.id || Math.random().toString(36).substring(2),
        data: data.pagamento_parcelado[i]?.data || pDate.toISOString().split('T')[0],
        valor: i === 0 ? val + rem : val,
        meio: data.pagamento_parcelado[i]?.meio || 'PIX',
      }
    })
    update('pagamento_parcelado', arr)
  }

  const addParcela = () => {
    update('pagamento_parcelado', [
      ...data.pagamento_parcelado,
      buildDefaultParcela(data.pagamento_parcelado.length),
    ])
  }

  const removeParcela = () => {
    if (data.pagamento_parcelado.length > 1) {
      update('pagamento_parcelado', data.pagamento_parcelado.slice(0, -1))
    }
  }

  const updateParcelaCount = (e: any) => {
    const count = Math.max(1, parseInt(e.target.value) || 1)
    const current = data.pagamento_parcelado.length
    if (count === current) return
    if (count > current) {
      const newArr = [...data.pagamento_parcelado]
      for (let i = current; i < count; i++) newArr.push(buildDefaultParcela(i))
      update('pagamento_parcelado', newArr)
    } else {
      update('pagamento_parcelado', data.pagamento_parcelado.slice(0, count))
    }
  }

  const somaParcelas = data.pagamento_parcelado.reduce((acc, p) => acc + (Number(p.valor) || 0), 0)
  const diferencaParcelas = Number((total - somaParcelas).toFixed(2))
  const parcelasValidas = Math.abs(diferencaParcelas) < 0.01

  const upParc = (id: string, f: string, v: any) => {
    const isFirstAndDate = f === 'data' && data.pagamento_parcelado[0]?.id === id
    if (isFirstAndDate && v) {
      const baseDate = new Date(v + 'T12:00:00Z')
      if (!isNaN(baseDate.getTime())) {
        const newData = data.pagamento_parcelado.map((p, i) => {
          if (i === 0) return { ...p, [f]: v }
          const pDate = new Date(baseDate.getTime())
          pDate.setDate(pDate.getDate() + 30 * i)
          return { ...p, data: pDate.toISOString().split('T')[0] }
        })
        update('pagamento_parcelado', newData)
        return
      }
    }
    update(
      'pagamento_parcelado',
      data.pagamento_parcelado.map((p) => (p.id === id ? { ...p, [f]: v } : p)),
    )
  }

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
            onChange={() => {
              update('forma_pagamento', 'Parcelado')
              if (!data.pagamento_parcelado || data.pagamento_parcelado.length === 0) {
                update('pagamento_parcelado', [
                  {
                    ...buildDefaultParcela(0),
                    valor: total,
                  },
                ])
              }
            }}
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
            <div className="flex items-center">
              <button
                type="button"
                onClick={removeParcela}
                className="w-10 h-10 flex items-center justify-center bg-off-white border-2 border-r-0 border-steel-blue rounded-l-[4px] text-midnight-navy hover:bg-steel-blue hover:text-off-white transition-colors text-lg font-bold"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                className="w-16 h-10 text-center bg-off-white border-2 border-steel-blue text-midnight-navy focus:outline-none focus:border-dark-denim transition-colors m-0"
                value={data.pagamento_parcelado.length}
                onChange={updateParcelaCount}
              />
              <button
                type="button"
                onClick={addParcela}
                className="w-10 h-10 flex items-center justify-center bg-off-white border-2 border-l-0 border-steel-blue rounded-r-[4px] text-midnight-navy hover:bg-steel-blue hover:text-off-white transition-colors text-lg font-bold"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={equalizeParcels}
              className="bg-steel-blue text-off-white px-4 py-2 rounded text-sm whitespace-nowrap hover:bg-dark-denim transition-colors h-10 font-medium"
            >
              Recalcular Parcelas Iguais
            </button>
          </div>
          {!parcelasValidas && (
            <div className="bg-red-100 border-2 border-red-500 text-red-800 px-4 py-3 rounded-[8px] text-sm font-semibold flex items-center justify-between gap-4">
              <span>
                ⚠️ A soma das parcelas (R$ {somaParcelas.toFixed(2)}) não corresponde ao valor total
                (R$ {total.toFixed(2)}). Diferença: R$ {Math.abs(diferencaParcelas).toFixed(2)}.
              </span>
              <button
                type="button"
                onClick={equalizeParcels}
                className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap hover:bg-red-700 transition-colors"
              >
                Igualar
              </button>
            </div>
          )}
          {parcelasValidas && data.pagamento_parcelado.length > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 px-4 py-2 rounded-[8px] text-xs font-semibold">
              ✓ Soma das parcelas corresponde ao valor total.
            </div>
          )}
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
                        value={formatCurrencyInput(Math.round(p.valor * 100))}
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
