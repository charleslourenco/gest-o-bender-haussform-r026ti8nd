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
import { Plus, Search, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
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

type DialogMode = 'add' | 'edit' | null

export function MontadoresTab() {
  const [montadores, setMontadores] = useState<Montador[]>([])
  const [search, setSearch] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [comissao, setComissao] = useState('')
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

  const openAdd = () => {
    setDialogMode('add')
    setEditingId(null)
    setNome('')
    setTelefone('')
    setComissao('')
  }

  const openEdit = (m: Montador) => {
    setDialogMode('edit')
    setEditingId(m.id)
    setNome(m.nome_completo)
    setTelefone(m.telefone || '')
    setComissao(m.comissao_percentual != null ? String(m.comissao_percentual) : '')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!nome) return
    const comissaoVal = parseFloat(comissao) || 0

    if (dialogMode === 'edit' && editingId) {
      const { error } = await supabase
        .from('montadores')
        .update({
          nome_completo: nome,
          telefone: telefone || null,
          comissao_percentual: comissaoVal,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', editingId)

      if (!error) {
        toast({ title: 'Montador atualizado' })
        closeDialog()
        fetchMontadores()
      } else {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      }
    } else {
      const { error } = await supabase.from('montadores').insert({
        nome_completo: nome,
        telefone: telefone || null,
        status: 'Disponível',
        comissao_percentual: comissaoVal,
      })

      if (!error) {
        toast({ title: 'Montador adicionado' })
        closeDialog()
        fetchMontadores()
      } else {
        toast({ title: 'Erro ao adicionar', variant: 'destructive' })
      }
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
        <Button onClick={openAdd} className="bg-steel-blue text-white hover:bg-steel-blue/90">
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
              <TableHead className="w-20" />
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(m)
                            }}
                          >
                            <Pencil className="w-4 h-4 text-steel-blue" />
                          </Button>
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
                        </div>
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

      <Dialog open={dialogMode !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="bg-white border-steel-blue/20">
          <DialogHeader>
            <DialogTitle className="text-midnight-navy">
              {dialogMode === 'edit' ? 'Editar Montador' : 'Novo Montador'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Nome Completo</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="bg-off-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-off-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Comissão (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={comissao}
                onChange={(e) => setComissao(e.target.value)}
                placeholder="Ex: 10"
                className="bg-off-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              className="border-steel-blue/20 text-midnight-navy"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-steel-blue text-white hover:bg-steel-blue/90"
            >
              {dialogMode === 'edit' ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
