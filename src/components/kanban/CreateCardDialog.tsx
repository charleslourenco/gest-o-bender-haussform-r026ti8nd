import { useState } from 'react'
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
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [produtoNome, setProdutoNome] = useState('')
  const [qtd, setQtd] = useState(1)
  const [descricao, setDescricao] = useState('')

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
      const { error } = await supabase.from('produtos_servicos_projeto').insert({
        cliente_id: clienteId,
        nome_produto: produtoNome.trim(),
        qtd,
        descricao,
        valor_unitario: 0,
        valor_total: 0,
        status_analise: 'iniciar',
        codigo_rastreio: codigoRastreio,
      })

      if (error) throw error

      toast.success(`Card criado com código ${codigoRastreio}`)
      onOpenChange(false)
      window.dispatchEvent(new Event('kanban_updated'))

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
              <Label htmlFor="cliente">Nome Completo do Cliente *</Label>
              <Input
                id="cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Ex: João da Silva"
                required
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
              className="bg-steel-blue hover:bg-steel-blue/90 text-white"
            >
              {loading ? 'Salvando...' : 'Criar Card'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
