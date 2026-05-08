import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Lead } from '@/types'
import { gerarDocumentoCliente } from '@/services/gerar-documento-cliente'

interface Props {
  lead: Lead | null
  users: any[]
  onClose: () => void
  onSave: (data: any) => void
}

export function LeadModal({ lead, users, onClose, onSave }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)

  const formatPhone = (value: string) => {
    if (!value) return ''
    let v = value.replace(/\D/g, '')

    if (v.startsWith('55') && v.length > 11) {
      if (v.length > 13) v = v.slice(0, 13)
      if (v.length <= 4) return `+${v.slice(0, 2)} (${v.slice(2)}`
      if (v.length <= 9) return `+${v.slice(0, 2)} (${v.slice(2, 4)}) ${v.slice(4)}`
      return `+${v.slice(0, 2)} (${v.slice(2, 4)}) ${v.slice(4, 9)}-${v.slice(9)}`
    } else {
      if (v.length > 11) v = v.slice(0, 11)
      if (v.length <= 2) return v.length > 0 ? `(${v}` : v
      if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
      if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
      return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    }
  }

  const [telefone, setTelefone] = useState(formatPhone(lead?.telefone || ''))
  const [nome, setNome] = useState(lead?.nome || '')

  useEffect(() => {
    setTelefone(formatPhone(lead?.telefone || ''))
    setNome(lead?.nome || '')
  }, [lead])

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e']
    const formatted = e.target.value
      .split(' ')
      .map((word, index) => {
        if (word.length === 0) return word
        const lowerWord = word.toLowerCase()
        if (exceptions.includes(lowerWord) && index !== 0) {
          return lowerWord
        }
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1)
      })
      .join(' ')
    setNome(formatted)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhone(e.target.value))
  }

  const handleGerarDossie = async () => {
    setIsGenerating(true)
    toast.info('Iniciando geração do dossiê... Preparando 7 templates.')
    toast.loading('Processando em paralelo...', { id: 'gerar-dossie' })

    const clienteNome = lead?.nome || 'Cliente Desconhecido'
    const vendedorNome = users.find((u) => u.id === lead?.consultor_id)?.nome || 'Não informado'

    try {
      const { data, error } = await gerarDocumentoCliente({
        cliente_id: clienteNome,
        dados_formulario: {
          Cliente: clienteNome,
          'Valor total': 'A Definir',
          'Nome de quem vendeu': vendedorNome,
        },
      })

      if (error) {
        throw new Error(error.message || 'Erro desconhecido')
      }

      toast.success('Dossiê completo! 7/7 templates gerados. Baixe na Área de Clientes.', {
        id: 'gerar-dossie',
      })
    } catch (error: any) {
      toast.error(`Falha na geração: ${error.message}`, { id: 'gerar-dossie' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    if (!data.consultor_id) data.consultor_id = null

    let phoneStr = (data.telefone as string).replace(/\D/g, '')
    if (phoneStr.length === 10) {
      phoneStr = '55' + phoneStr.slice(0, 2) + '9' + phoneStr.slice(2)
    } else if (phoneStr.length === 11) {
      phoneStr = '55' + phoneStr
    } else if (phoneStr.length === 12 && phoneStr.startsWith('55')) {
      phoneStr = '55' + phoneStr.slice(2, 4) + '9' + phoneStr.slice(4)
    }
    data.telefone = phoneStr

    onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-midnight-navy opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-off-white rounded-lg p-6 max-w-xl w-full relative z-10 border-t-4 border-dark-denim max-h-[90vh] overflow-y-auto shadow-xl animate-fade-in-up">
        <h2 className="text-midnight-navy font-bold text-[24px] mb-6">
          {lead ? 'Editar Lead' : 'Novo Lead'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
              Nome Completo *
            </label>
            <input
              required
              name="nome"
              value={nome}
              onChange={handleNomeChange}
              className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
              E-mail *
            </label>
            <input
              required
              type="email"
              name="email"
              defaultValue={lead?.email}
              className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
              Telefone *
            </label>
            <input
              required
              type="tel"
              name="telefone"
              value={telefone}
              onChange={handlePhoneChange}
              minLength={14}
              maxLength={19}
              placeholder="+55 (11) 99999-9999"
              className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
              Origem *
            </label>
            <select
              required
              name="origem"
              defaultValue={lead?.origem || 'Instagram'}
              className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 cursor-pointer"
            >
              <option value="Instagram">Instagram</option>
              <option value="Google">Google</option>
              <option value="Facebook">Facebook</option>
              <option value="Parceiros">Parceiros</option>
              <option value="Corretor">Corretor</option>
              <option value="Arquiteto">Arquiteto</option>
              <option value="Outdoor">Outdoor</option>
              <option value="Recompra">Recompra</option>
              <option value="Indicação">Indicação</option>
              <option value="Porta">Porta</option>
            </select>
          </div>
          <div>
            <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
              Consultor Responsável
            </label>
            <select
              name="consultor_id"
              defaultValue={lead?.consultor_id || ''}
              className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 cursor-pointer"
            >
              <option value="">Selecione...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
              Notas Iniciais
            </label>
            <textarea
              name="notas"
              defaultValue={lead?.notas || ''}
              rows={3}
              className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 resize-none"
            ></textarea>
          </div>
          <div className="flex justify-end gap-4 mt-2">
            {lead && (
              <button
                type="button"
                onClick={handleGerarDossie}
                disabled={isGenerating}
                className="bg-green-600 text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200 disabled:opacity-50"
              >
                {isGenerating ? 'Gerando...' : 'Gerar Dossiê'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-steel-blue text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-dark-denim text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-medium transition-opacity duration-200"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
