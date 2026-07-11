import { useEffect, useState } from 'react'
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
import { Plus, Search, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export function MontadoresTab() {
  const [montadores, setMontadores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const { toast } = useToast()

  const fetchMontadores = async () => {
    const { data, error } = await supabase
      .from('montadores')
      .select(`
        *,
        alocacao_montagem(
          card_id,
          produtos_servicos_projeto(
            nome_produto,
            clientes(nome)
          )
        )
      `)
      .order('nome_completo')

    if (data) setMontadores(data)
  }

  useEffect(() => {
    fetchMontadores()
  }, [])

  const handleAdd = async () => {
    if (!novoNome) return
    const { error } = await supabase.from('montadores').insert({
      nome_completo: novoNome,
      telefone: novoTelefone,
      status: 'Disponível',
    })
    if (!error) {
      toast({ title: 'Montador adicionado' })
      setIsAddOpen(false)
      setNovoNome('')
      setNovoTelefone('')
      fetchMontadores()
    } else {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('montadores').delete().eq('id', id)
    if (!error) {
      toast({ title: 'Montador removido' })
      fetchMontadores()
    }
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

      <div className="border border-steel-blue/20 rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-steel-blue/20 hover:bg-transparent">
              <TableHead className="text-midnight-navy font-semibold">Nome</TableHead>
              <TableHead className="text-midnight-navy font-semibold">Telefone</TableHead>
              <TableHead className="text-midnight-navy font-semibold">Status</TableHead>
              <TableHead className="text-midnight-navy font-semibold">
                Alocação Atual (Cliente / Projeto)
              </TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-steel-blue/20">
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum montador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const alocacoes = Array.isArray(m?.alocacao_montagem) ? m.alocacao_montagem : []
                const isAlocado = alocacoes.length > 0
                const clientes = Array.from(
                  new Set(
                    alocacoes
                      .map((a: any) => a?.produtos_servicos_projeto?.clientes?.nome)
                      .filter(Boolean),
                  ),
                )

                return (
                  <TableRow key={m.id} className="border-steel-blue/20">
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
                    <TableCell>
                      {isAlocado ? (
                        <span className="text-sm font-medium text-midnight-navy/80">
                          {clientes.join(', ')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
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
