import { useState, useEffect, useMemo } from 'react'
import {
  fetchPlanoContas,
  createPlanoConta,
  updatePlanoConta,
  setPlanoContaAtivo,
  PlanoContaItem,
  NaturezaPlanoContas,
  NATUREZA_LABELS,
  NATUREZA_COLORS,
} from '@/services/plano-contas'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BookOpen,
  Plus,
  Pencil,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Archive,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'

const NATUREZAS: NaturezaPlanoContas[] = [
  'receita',
  'custo_direto',
  'despesa_fixa',
  'imposto',
  'financeiro',
]

export function PlanoContasTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<PlanoContaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNatureza, setFilterNatureza] = useState<string>('todos')
  const [showInactive, setShowInactive] = useState(true)

  // Modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<PlanoContaItem | null>(null)

  // Form states
  const [formNome, setFormNome] = useState('')
  const [formCodigo, setFormCodigo] = useState('')
  const [formNatureza, setFormNatureza] = useState<NaturezaPlanoContas>('despesa_fixa')
  const [formDescricao, setFormDescricao] = useState('')
  const [formOrdem, setFormOrdem] = useState('0')
  const [formAtivo, setFormAtivo] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await fetchPlanoContas(true)
      if (error) throw new Error(error)
      setItems(data || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar plano de contas',
        description: err.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenModal = (item?: PlanoContaItem) => {
    if (item) {
      setEditingItem(item)
      setFormNome(item.nome || '')
      setFormCodigo(item.codigo || '')
      setFormNatureza((item.natureza as NaturezaPlanoContas) || 'despesa_fixa')
      setFormDescricao(item.descricao || '')
      setFormOrdem(item.ordem !== undefined ? item.ordem.toString() : '0')
      setFormAtivo(item.ativo)
    } else {
      setEditingItem(null)
      setFormNome('')
      setFormCodigo('')
      setFormNatureza('despesa_fixa')
      setFormDescricao('')
      // Sugerir próxima ordem
      const maxOrdem = items.reduce((max, i) => Math.max(max, i.ordem || 0), 0)
      setFormOrdem((maxOrdem + 10).toString())
      setFormAtivo(true)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const ordemNum = parseInt(formOrdem, 10) || 0

      if (editingItem) {
        const { error } = await updatePlanoConta(editingItem.id, {
          nome: formNome,
          codigo: formCodigo || null,
          natureza: formNatureza,
          descricao: formDescricao || null,
          ordem: ordemNum,
          ativo: formAtivo,
        })
        if (error) throw new Error(error)
        toast({
          title: 'Categoria atualizada',
          description: `A categoria "${formNome}" foi atualizada com sucesso.`,
        })
      } else {
        const { error } = await createPlanoConta({
          nome: formNome,
          codigo: formCodigo || null,
          natureza: formNatureza,
          descricao: formDescricao || null,
          ordem: ordemNum,
          ativo: formAtivo,
        })
        if (error) throw new Error(error)
        toast({
          title: 'Categoria criada',
          description: `A categoria "${formNome}" foi cadastrada com sucesso.`,
        })
      }

      handleCloseModal()
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar categoria',
        description: err.message || 'Falha ao gravar os dados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (item: PlanoContaItem) => {
    const novoStatus = !item.ativo
    try {
      const { error } = await setPlanoContaAtivo(item.id, novoStatus)
      if (error) throw new Error(error)
      toast({
        title: novoStatus ? 'Categoria reativada' : 'Categoria inativada',
        description: `A categoria "${item.nome}" foi ${novoStatus ? 'reativada' : 'inativada'}.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!showInactive && !item.ativo) return false
      if (filterNatureza !== 'todos' && item.natureza !== filterNatureza) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchNome = item.nome?.toLowerCase().includes(term)
        const matchCodigo = item.codigo?.toLowerCase().includes(term)
        const matchDesc = item.descricao?.toLowerCase().includes(term)
        const matchNat = NATUREZA_LABELS[item.natureza as NaturezaPlanoContas]
          ?.toLowerCase()
          .includes(term)
        if (!matchNome && !matchCodigo && !matchDesc && !matchNat) return false
      }

      return true
    })
  }, [items, showInactive, filterNatureza, searchTerm])

  const stats = useMemo(() => {
    const total = items.length
    const ativos = items.filter((i) => i.ativo).length
    const inativos = total - ativos
    return { total, ativos, inativos }
  }, [items])

  return (
    <div className="space-y-6">
      <Card className="bg-midnight-navy border-none text-off-white">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-off-white">
              <BookOpen className="h-5 w-5 text-off-white" /> Plano de Contas Gerencial
            </CardTitle>
            <CardDescription className="text-off-white/70">
              Estruture as categorias de receitas, custos, despesas, impostos e movimentações
              financeiras.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80 h-9"
              title="Atualizar lista"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-steel-blue text-off-white hover:bg-steel-blue/90 w-full sm:w-auto h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Nova Categoria
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Métricas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-dark-denim/50 border border-steel-blue/30 rounded-lg p-3">
              <span className="text-xs text-off-white/70 uppercase tracking-wider font-semibold">
                Total de Categorias
              </span>
              <p className="text-2xl font-bold text-off-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-dark-denim/50 border border-steel-blue/30 rounded-lg p-3">
              <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
                Ativas / Disponíveis
              </span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.ativos}</p>
            </div>
            <div className="bg-dark-denim/50 border border-steel-blue/30 rounded-lg p-3">
              <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">
                Inativas / Arquivadas
              </span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats.inativos}</p>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-off-white/50" />
              <Input
                placeholder="Buscar por código, nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40 h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-44">
                <Select value={filterNatureza} onValueChange={setFilterNatureza}>
                  <SelectTrigger className="bg-dark-denim border-steel-blue/40 text-off-white h-9">
                    <SelectValue placeholder="Natureza" />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-denim border-steel-blue/40 text-off-white">
                    <SelectItem value="todos">Todas as Naturezas</SelectItem>
                    {NATUREZAS.map((nat) => (
                      <SelectItem key={nat} value={nat}>
                        {NATUREZA_LABELS[nat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInactive(!showInactive)}
                className={`h-9 text-xs bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80 ${
                  showInactive ? 'border-primary/80 text-primary-foreground' : ''
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                {showInactive ? 'Exibindo Inativos' : 'Ocultando Inativos'}
              </Button>
            </div>
          </div>

          {/* Tabela de categorias */}
          <div className="rounded-lg border border-steel-blue/30 overflow-hidden bg-midnight-navy/90">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-off-white/70 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-off-white" />
                <span>Carregando plano de contas...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-off-white/60">
                Nenhuma categoria contábil encontrada com os filtros selecionados.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-dark-denim/80">
                  <TableRow className="border-steel-blue/30 hover:bg-transparent">
                    <TableHead className="text-off-white font-semibold w-24">Código</TableHead>
                    <TableHead className="text-off-white font-semibold">
                      Nome da Categoria
                    </TableHead>
                    <TableHead className="text-off-white font-semibold w-40">Natureza</TableHead>
                    <TableHead className="text-off-white font-semibold hidden md:table-cell">
                      Descrição
                    </TableHead>
                    <TableHead className="text-off-white font-semibold text-center w-28">
                      Situação
                    </TableHead>
                    <TableHead className="text-off-white font-semibold text-right w-36">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const nat = item.natureza as NaturezaPlanoContas
                    const natLabel = NATUREZA_LABELS[nat] || item.natureza
                    const natColor = NATUREZA_COLORS[nat]

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-steel-blue/20 hover:bg-dark-denim/40 transition-colors ${
                          !item.ativo ? 'opacity-60 bg-dark-denim/20' : ''
                        }`}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-off-white">
                          {item.codigo || '—'}
                        </TableCell>
                        <TableCell className="font-medium text-off-white">
                          <div className="flex items-center gap-2">
                            <span>{item.nome}</span>
                            {item.padrao && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-normal">
                                Padrão
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium px-2 py-0.5 ${
                              natColor?.badge || 'bg-dark-denim text-off-white border-steel-blue/40'
                            }`}
                          >
                            {natLabel}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="text-xs text-off-white/70 hidden md:table-cell max-w-xs truncate"
                          title={item.descricao || ''}
                        >
                          {item.descricao || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.ativo ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                              <XCircle className="w-3.5 h-3.5" /> Inativo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(item)}
                              className="h-8 px-2 text-off-white hover:bg-dark-denim hover:text-off-white"
                              title="Editar categoria"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleAtivo(item)}
                              className={`h-8 px-2 text-xs ${
                                item.ativo
                                  ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                              }`}
                              title={item.ativo ? 'Inativar categoria' : 'Reativar categoria'}
                            >
                              {item.ativo ? (
                                <>
                                  <Archive className="w-3.5 h-3.5 mr-1" /> Inativar
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reativar
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[540px] bg-midnight-navy text-off-white border-steel-blue/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-off-white">
              {editingItem
                ? 'Editar Categoria do Plano de Contas'
                : 'Nova Categoria no Plano de Contas'}
            </DialogTitle>
            <DialogDescription className="text-off-white/70">
              Categorias são utilizadas para classificar receitas, despesas e relatórios contábeis
              (DRE).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="pc-nome" className="text-xs font-semibold text-off-white">
                Nome da Categoria <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="pc-nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Matéria-Prima / Venda de Projetos / DAS"
                className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pc-codigo" className="text-xs font-semibold text-off-white">
                  Código Contábil
                </Label>
                <Input
                  id="pc-codigo"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
                  placeholder="Ex: 1.1.01, 2.1.05"
                  className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pc-natureza" className="text-xs font-semibold text-off-white">
                  Natureza <span className="text-rose-400">*</span>
                </Label>
                <Select
                  value={formNatureza}
                  onValueChange={(v) => setFormNatureza(v as NaturezaPlanoContas)}
                >
                  <SelectTrigger
                    id="pc-natureza"
                    className="bg-dark-denim border-steel-blue/40 text-off-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-denim border-steel-blue/40 text-off-white">
                    {NATUREZAS.map((nat) => (
                      <SelectItem key={nat} value={nat}>
                        {NATUREZA_LABELS[nat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pc-ordem" className="text-xs font-semibold text-off-white">
                  Ordem de Exibição
                </Label>
                <Input
                  id="pc-ordem"
                  type="number"
                  value={formOrdem}
                  onChange={(e) => setFormOrdem(e.target.value)}
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pc-ativo" className="text-xs font-semibold text-off-white">
                  Situação
                </Label>
                <Select
                  value={formAtivo ? 'ativo' : 'inativo'}
                  onValueChange={(v) => setFormAtivo(v === 'ativo')}
                >
                  <SelectTrigger
                    id="pc-ativo"
                    className="bg-dark-denim border-steel-blue/40 text-off-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-denim border-steel-blue/40 text-off-white">
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pc-descricao" className="text-xs font-semibold text-off-white">
                Descrição Detalhada
              </Label>
              <Textarea
                id="pc-descricao"
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Exemplos de lançamentos contábeis que pertencem a esta categoria..."
                rows={3}
                className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={saving}
                className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
              >
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {saving ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
