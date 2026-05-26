import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orcamento, setOrcamento] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetalhes = async () => {
      try {
        if (!id) return

        const { data: orcData, error: orcError } = await supabase
          .from('orcamentos')
          .select('*, clientes(nome, email, telefone)')
          .eq('id', id)
          .single()

        if (orcError) throw orcError

        const { data: itensData, error: itensError } = await supabase
          .from('itens_orcamento')
          .select('*, estoque_itens(nome, unidade)')
          .eq('orcamento_id', id)

        if (itensError) throw itensError

        setOrcamento(orcData)
        setItens(itensData || [])
      } catch (err: any) {
        toast.error('Erro ao carregar detalhes do orçamento: ' + err.message)
        navigate('/orcamentos')
      } finally {
        setLoading(false)
      }
    }

    fetchDetalhes()
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!orcamento) return null

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="hover:bg-muted shrink-0">
            <Link to="/orcamentos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalhes do Orçamento</h1>
            <p className="text-muted-foreground text-sm">
              Visualização completa dos itens e custos
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link to={`/orcamentos/${id}/pdf`}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl shadow-sm p-6 space-y-6 md:col-span-2">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Título / Referência</h3>
            <p className="text-xl font-semibold mt-1">{orcamento.nome || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              <p className="font-medium mt-1">{orcamento.clientes?.nome || 'Não vinculado'}</p>
              {orcamento.clientes?.telefone && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {orcamento.clientes.telefone}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Data de Criação</h3>
              <p className="font-medium mt-1">
                {new Date(orcamento.data_criacao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4 flex flex-col justify-center shadow-sm">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Valor Total</h3>
            <p className="text-4xl font-bold text-primary">{formatMoney(orcamento.valor_total)}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="bg-background px-3 py-1">
              {orcamento.tipo_pagamento === 'prazo' ? 'A Prazo' : 'À Vista'}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {orcamento.status || 'Rascunho'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 bg-muted/40 border-b flex justify-between items-center">
          <h3 className="font-semibold text-lg">Itens do Orçamento ({itens.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4">Descrição do Item</TableHead>
                <TableHead className="py-4 text-right">Qtd.</TableHead>
                <TableHead className="py-4 text-right">Custo Unit.</TableHead>
                <TableHead className="py-4 text-right">Venda Unit.</TableHead>
                <TableHead className="py-4 text-right">Subtotal Venda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Nenhum item vinculado a este orçamento.
                  </TableCell>
                </TableRow>
              ) : (
                itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-4">
                      <span className="font-medium">
                        {item.nome_item || item.estoque_itens?.nome}
                      </span>
                      {item.estoque_itens && (
                        <Badge
                          variant="outline"
                          className="ml-3 text-[10px] h-5 border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          Estoque
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium">{item.quantidade}</TableCell>
                    <TableCell className="py-4 text-right text-muted-foreground">
                      {formatMoney(item.preco_custo)}
                    </TableCell>
                    <TableCell className="py-4 text-right font-medium">
                      {formatMoney(item.preco_venda)}
                    </TableCell>
                    <TableCell className="py-4 text-right font-bold text-primary">
                      {formatMoney(item.quantidade * item.preco_venda)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
