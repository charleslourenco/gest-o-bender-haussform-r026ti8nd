import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function CreateCardDialog({
  open,
  onOpenChange,
  onCreated,
  initialIsOutsourced = false,
  parentCardId = null,
  initialCorVinculo = null,
  initialClienteNome = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  initialIsOutsourced?: boolean
  parentCardId?: string | null
  initialCorVinculo?: string | null
  initialClienteNome?: string | null
}) {
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [clienteNome, setClienteNome] = useState(initialClienteNome || '')
  const [produtoNome, setProdutoNome] = useState('')
  const [qtd, setQtd] = useState(1)
  const [descricao, setDescricao] = useState('')
  const [selectedParentId, setSelectedParentId] = useState(parentCardId || '')
  const [corVinculoInput, setCorVinculoInput] = useState(initialCorVinculo || '')
  const [parentCards, setParentCards] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      setSelectedParentId(parentCardId || '')
      setCorVinculoInput(initialCorVinculo || '')
      setClienteNome(initialClienteNome || '')
      setProdutoNome('')
      setQtd(1)
      setDescricao('')

      supabase
        .from('produtos_servicos_projeto')
        .select('id, nome_produto, status_analise, cor_vinculo, cliente_id, clientes(nome)')
        .is('card_pai_id', null)
        .order('criado_em', { ascending: false })
        .limit(100)
        .then(({ data }) => {
          if (data) {
            setParentCards(data)
            if (parentCardId) {
              const matched = data.find((p) => p.id === parentCardId)
              if (matched) {
                if (matched.clientes?.nome && !initialClienteNome) {
                  setClienteNome(matched.clientes.nome)
                }
                if (matched.cor_vinculo && !initialCorVinculo) {
                  setCorVinculoInput(matched.cor_vinculo)
                }
              }
            }
          }
        })
    }
  }, [open, parentCardId, initialCorVinculo, initialClienteNome])
  const getInitials = (name: string) => {
    if (!name) return 'CLI'
    const skip = ['de', 'da', 'do', 'das', 'dos']
    const parts = name
      .trim()
      .split(' ')
      .filter((p) => p && !skip.includes(p.toLowerCase()))
    if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase()
    return parts
      .map((n) => n[0])
      .join('')
      .substring(0, 3)
      .toUpperCase()
  }

  const getProductCode = (prodName: string) => {
    const clean = (prodName || 'PRO').replace(/[^a-zA-Z]/g, '')
    return (clean.length > 0 ? clean : 'PRO').substring(0, 3).toUpperCase()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteNome || !produtoNome || qtd < 1) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      // 1. Procurar ou criar cliente
      let clienteId = null
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nome', clienteNome.trim())
        .limit(1)

      if (clientes && clientes.length > 0) {
        clienteId = clientes[0].id
      } else {
        const { data: newCliente, error: cliErr } = await supabase
          .from('clientes')
          .insert({
            nome: clienteNome.trim(),
            email: `${Date.now()}@avulso.com`,
            telefone: '00000000000',
            status: 'Ativo',
          })
          .select('id')
          .single()

        if (cliErr) throw cliErr
        if (newCliente) clienteId = newCliente.id
      }

      // 2. Gerar codigo_rastreio
      const initials = getInitials(clienteNome)
      const prodCode = getProductCode(produtoNome)
      const prefix = `${initials}-${prodCode}-`

      const { data: existing } = await supabase
        .from('produtos_servicos_projeto')
        .select('codigo_rastreio')
        .like('codigo_rastreio', `${prefix}%`)

      let maxSeq = 0
      if (existing) {
        existing.forEach((item) => {
          if (item.codigo_rastreio) {
            const parts = item.codigo_rastreio.split('-')
            if (parts.length === 3) {
              const num = parseInt(parts[2], 10)
              if (!isNaN(num) && num > maxSeq) maxSeq = num
            }
          }
        })
      }
      const seq = (maxSeq + 1).toString().padStart(4, '0')
      const codigoRastreio = `${prefix}${seq}`

      // 3. Inserir Card
      let defaultStatus = 'iniciar'
      const path = location.pathname
      if (path.includes('/montagem')) defaultStatus = 'aguardando_agenda'
      else if (path.includes('/producao')) defaultStatus = 'aguardando_plano_corte'
      // Se parentCardId veio por prop ou o usuário selecionou no dropdown
      const effectiveParentId = (selectedParentId || parentCardId || '').trim() || null
      let chosenParent = effectiveParentId
        ? parentCards.find((p) => p.id === effectiveParentId)
        : null

      // Se não encontrou no estado de parentCards (ex: paginado/não listado), busca diretamente no Supabase
      if (effectiveParentId && !chosenParent) {
        const { data: directParent } = await supabase
          .from('produtos_servicos_projeto')
          .select('id, nome_produto, status_analise, cor_vinculo, cliente_id, clientes(nome)')
          .eq('id', effectiveParentId)
          .maybeSingle()
        if (directParent) {
          chosenParent = directParent
        }
      }

      let corVinculo: string | null = null

      if (effectiveParentId) {
        corVinculo = corVinculoInput || chosenParent?.cor_vinculo || '#3b82f6'

        if (chosenParent && !chosenParent.cor_vinculo) {
          await supabase
            .from('produtos_servicos_projeto')
            .update({ cor_vinculo: corVinculo })
            .eq('id', effectiveParentId)
        } else if (!chosenParent) {
          // Atualiza diretamente no banco se o pai ainda não tem cor
          await supabase
            .from('produtos_servicos_projeto')
            .update({ cor_vinculo: corVinculo })
            .eq('id', effectiveParentId)
            .is('cor_vinculo', null)
        }
      }

      const effectiveClienteId = chosenParent?.cliente_id || clienteId

      // Se for subcard (effectiveParentId), tentar herdar valor do JSON de produtos_servicos do formulário
      let valorUnitario = 0
      let descontoPercentual = 0
      let valorTotal = 0
      let formularioId = chosenParent?.formulario_comercial_id || null

      if (effectiveParentId && !formularioId) {
        const { data: parentRecord } = await supabase
          .from('produtos_servicos_projeto')
          .select('formulario_comercial_id')
          .eq('id', effectiveParentId)
          .maybeSingle()
        if (parentRecord?.formulario_comercial_id) {
          formularioId = parentRecord.formulario_comercial_id
        }
      }

      if (formularioId) {
        const { data: formData } = await supabase
          .from('formulario_comercial')
          .select('produtos_servicos')
          .eq('id', formularioId)
          .maybeSingle()

        if (formData && Array.isArray(formData.produtos_servicos)) {
          const nomeNorm = produtoNome.trim().toLowerCase()
          const matched = formData.produtos_servicos.find((item: any) => {
            if (!item || !item.nome) return false
            const itNorm = String(item.nome).trim().toLowerCase()
            return (
              itNorm === nomeNorm ||
              (nomeNorm.length >= 4 && itNorm.includes(nomeNorm)) ||
              (itNorm.length >= 4 && nomeNorm.includes(itNorm))
            )
          })

          if (matched) {
            valorUnitario = Number(matched.valor_unitario) || 0
            descontoPercentual = Number(matched.desconto_percentual ?? matched.desconto) || 0
            const itemQtd = Number(matched.qtd) || qtd
            const totalCalc = valorUnitario * (1 - descontoPercentual / 100) * itemQtd
            valorTotal = Math.round(totalCalc * 100) / 100
          }
        }
      }

      const { error } = await supabase.from('produtos_servicos_projeto').insert({
        cliente_id: effectiveClienteId,
        formulario_comercial_id: formularioId,
        nome_produto: produtoNome.trim(),
        qtd,
        descricao,
        valor_unitario: valorUnitario,
        desconto_percentual: descontoPercentual,
        valor_total: valorTotal,
        status_analise: defaultStatus,
        codigo_rastreio: codigoRastreio,
        card_pai_id: effectiveParentId,
        cor_vinculo: corVinculo,
        // @ts-expect-error
        is_outsourced: initialIsOutsourced,
      })

      if (error) throw error

      toast.success(`Card criado com código ${codigoRastreio}`)
      onOpenChange(false)
      window.dispatchEvent(new Event('kanban_updated'))
      onCreated?.()

      // Reset form
      setClienteNome('')
      setProdutoNome('')
      setQtd(1)
      setDescricao('')
    } catch (error: any) {
      toast.error('Erro ao criar card: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Card Avulso</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="parentCard">Card Pai / Ambiente (Opcional - Subcard)</Label>
              <select
                id="parentCard"
                value={selectedParentId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedParentId(val)
                  const found = parentCards.find((p) => p.id === val)
                  if (found?.clientes?.nome) {
                    setClienteNome(found.clientes.nome)
                  }
                }}
                disabled={loading}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Nenhum (Card Independente)</option>
                {parentCards.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.clientes?.nome ? `${p.clientes.nome} - ` : ''}
                    {p.nome_produto}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cliente">Nome Completo do Cliente *</Label>
              <Input
                id="cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: João da Silva"
                required
                disabled={loading || !!selectedParentId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="produto">Produto / Serviço *</Label>
              <Input
                id="produto"
                value={produtoNome}
                onChange={(e) => setProdutoNome(e.target.value)}
                placeholder="Ex: Armário Cozinha"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qtd">Quantidade *</Label>
              <Input
                id="qtd"
                type="number"
                min="1"
                value={qtd}
                onChange={(e) => setQtd(Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea
                id="desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Salvando...' : 'Criar Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
