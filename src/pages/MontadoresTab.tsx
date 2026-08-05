import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { FichaFuncional } from '@/components/montagem/FichaFuncional'
import { cn } from '@/lib/utils'

interface Montador {
  id: string
  nome_completo: string
  telefone: string | null
  status: string
  comissao_percentual: number | null
  alocacao_montagem?: { card_id: string }[]
}

export function MontadoresTab() {
  const [montadores, setMontadores] = useState<Montador[]>([])
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novaComissao, setNovaComissao] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchMontadores = async () => {
    const { data, error } = await supabase
      .from('montadores')
      .select('*, alocacao_montagem(card_id)')
      .order('nome_completo')
    if (error) {
      toast({ title: 'Erro ao carregar montadores', variant: 'destructive' })
      return
    }
    if (data) setMontadores(data as unknown as Montador[])
  }

  useEffect(() => {
    fetchMontadores()
  }, [])

  const handleAdd = async () => {
    if (!novoNome) return
    const comissao = parseFloat(novaComissao) || 0
    const { error } = await supabase.from('montadores').insert({
      nome_completo: novoNome,
      telefone: novoTelefone,
      status: 'Disponível',
      comissao_percentual: comissao,
    })
    if (!error) {
      toast({ title: 'Montador adicionado' })
      setIsAddOpen(false)
      setNovoNome('')
      setNovoTelefone('')
      setNovaComissao('')
      fetchMontadores()
    } else {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('montadores').delete().eq('id', id)
    if (!error) {
      toast({ title: 'Montador removido' })
      if (expandedId === id) setExpandedId(null)
      fetchMontadores()
    }
  }

  const handleComissaoChange = (id: string, value: number) => {
    setMontadores((prev) =>
      prev.map((m) => (m.id === id ? { ...m, comissao_percentual: value } : m)),
    )
  }

  const filtered = montadores.filter((m) =>
    (m?.nome_completo || '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar montador..."
            className="pl-9 bg-off-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-steel-blue text-white hover:bg-steel-blue/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Montador
        </Button>
      </div>

      <div className="border border-steel-blue/20 rounded-md bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-steel-blue/20 hover:bg-transparent">
              <TableHead className="w-10" />
              <TableHead className="text-midnight-navy font-semibold">Nome</TableHead>
              <TableHead className="text-midnight-navy font-semibold">Telefone</TableHead>
              <TableHead className="text-midnight-navy font-semibold">Status</TableHead>
              <TableHead className="text-midnight-navy font-semibold">Comissão</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-steel-blue/20">
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum montador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const alocacoes = Array.isArray(m?.alocacao_montagem) ? m.alocacao_montagem : []
                const isAlocado = alocacoes.length > 0
                const isExpanded = expandedId === m.id
                return (
                  <Fragment key={m.id}>
                    <TableRow
                      className={cn(
                        'border-steel-blue/20 cursor-pointer hover:bg-muted/30 transition-colors',
                        isExpanded && 'bg-muted/30',
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-midnight-navy">
                        {m.nome_completo}
                      </TableCell>
                      <TableCell className="text-midnight-navy/80">{m.telefone || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={isAlocado ? 'default' : 'secondary'}
                          className={
                            isAlocado
                              ? 'bg-orange-500 hover:bg-orange-600 border-none'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white border-none'
                          }
                        >
                          {isAlocado ? 'Alocado' : 'Disponível'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-midnight-navy/80">
                        {m.comissao_percentual != null ? `${m.comissao_percentual}%` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(m.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-steel-blue/20">
                        <TableCell colSpan={6} className="p-0">
                          <FichaFuncional
                            montadorId={m.id}
                            nomeCompleto={m.nome_completo}
                            telefone={m.telefone}
                            comissaoPercentual={m.comissao_percentual}
                            onComissaoChange={(val) => handleComissaoChange(m.id, val)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-white border-steel-blue/20">
          <DialogHeader>
            <DialogTitle className="text-midnight-navy">Novo Montador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Nome Completo</Label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="bg-off-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Telefone</Label>
              <Input
                value={novoTelefone}
                onChange={(e) => setNovoTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-off-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Comissão (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={novaComissao}
                onChange={(e) => setNovaComissao(e.target.value)}
                placeholder="Ex: 10"
                className="bg-off-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="border-steel-blue/20 text-midnight-navy"
            >
              Cancelar
            </Button>
            <Button onClick={handleAdd} className="bg-steel-blue text-white hover:bg-steel-blue/90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
