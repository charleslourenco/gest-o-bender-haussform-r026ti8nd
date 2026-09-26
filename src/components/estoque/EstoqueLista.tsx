import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Plus,
  Trash2,
  Tags,
  Download,
  ChevronLeft,
  ChevronRight,
  GitMerge,
  X,
  MoreVertical,
  Pencil,
  Printer,
  PackageMinus,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useTableScroll } from '@/hooks/use-table-scroll'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const CATEGORIAS_ESTOQUE = [
  'Ferragens',
  'Chapas',
  'Acessórios',
  'Fitas de borda',
  'Sistemas de fixação',
  'Serralheria',
  'Estofaria',
  'Portas de alumínio e vidro',
  'Espelhos',
  'Perfil puxador/puxador',
  'Iluminação',
  'Colas/Adesivos/Solventes',
  'Insumos',
  'Material elétrico',
  'Uniformes e EPIs',
  'móveis soltos',
  'brocas/fresas/serras',
  'Parafusos',
]

const CATEGORY_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  Ferragens: {
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/50',
  },
  Chapas: {
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/50',
  },
  Acessórios: {
    bg: 'bg-purple-100 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/50',
  },
  'Fitas de borda': {
    bg: 'bg-pink-100 dark:bg-pink-950/60',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800/50',
  },
  'Sistemas de fixação': {
    bg: 'bg-cyan-100 dark:bg-cyan-950/60',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/50',
  },
  Serralheria: {
    bg: 'bg-slate-200 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700/50',
  },
  Estofaria: {
    bg: 'bg-rose-100 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/50',
  },
  'Portas de alumínio e vidro': {
    bg: 'bg-teal-100 dark:bg-teal-950/60',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/50',
  },
  Espelhos: {
    bg: 'bg-indigo-100 dark:bg-indigo-950/60',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/50',
  },
  'Perfil puxador/puxador': {
    bg: 'bg-orange-100 dark:bg-orange-950/60',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800/50',
  },
  Iluminação: {
    bg: 'bg-yellow-100 dark:bg-yellow-950/60',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800/50',
  },
  'Colas/Adesivos/Solventes': {
    bg: 'bg-lime-100 dark:bg-lime-950/60',
    text: 'text-lime-700 dark:text-lime-300',
    border: 'border-lime-200 dark:border-lime-800/50',
  },
  Insumos: {
    bg: 'bg-green-100 dark:bg-green-950/60',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800/50',
  },
  'Material elétrico': {
    bg: 'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800/50',
  },
  'Uniformes e EPIs': {
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/50',
  },
  'móveis soltos': {
    bg: 'bg-violet-100 dark:bg-violet-950/60',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800/50',
  },
  'brocas/fresas/serras': {
    bg: 'bg-stone-200 dark:bg-stone-800/60',
    text: 'text-stone-700 dark:text-stone-300',
    border: 'border-stone-300 dark:border-stone-700/50',
  },
  Parafusos: {
    bg: 'bg-sky-100 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800/50',
  },
}

const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-gray-100 dark:bg-slate-800/60',
  text: 'text-gray-600 dark:text-slate-400',
  border: 'border-gray-200 dark:border-slate-700/50',
}

function getCategoryColor(cat: string | null | undefined) {
  if (!cat) return DEFAULT_CATEGORY_COLOR
  return CATEGORY_COLOR_MAP[cat] || DEFAULT_CATEGORY_COLOR
}

function getQuantityColor(quantidade: number, estoqueMinimo: number): string {
  if (quantidade === 0) return 'text-red-600 dark:text-red-400 font-semibold'
  if (quantidade <= estoqueMinimo) return 'text-orange-600 dark:text-orange-400 font-semibold'
  return 'text-green-600 dark:text-green-400 font-semibold'
}

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

import { GerarEtiquetaModal } from './GerarEtiquetaModal'
import { EditItemModal } from './EditItemModal'
import { MergeItemsModal } from './MergeItemsModal'
import { DesalocarModal } from './DesalocarModal'
import { saveManualEstoqueItem, normalizeItemInBackground } from '@/services/unified-item'

function CategoryBadge({ category, onEdit }: { category: string; onEdit: (val: string) => void }) {
  const [open, setOpen] = useState(false)
  const colors = getCategoryColor(category)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {category || 'Sem categoria'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-2">
          <Select
            value={category || ''}
            onValueChange={(val) => {
              onEdit(val)
              setOpen(false)
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {CATEGORIAS_ESTOQUE.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function EstoqueLista() {
  const [items, setItems] = useState<any[]>([])
  const [allocations, setAllocations] = useState<any[]>([])
  const [sobrasChapas, setSobrasChapas] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [itemToAllocate, setItemToAllocate] = useState<any>(null)
  const [itemToEdit, setItemToEdit] = useState<any>(null)
  const [itemToDesalocar, setItemToDesalocar] = useState<any>(null)
  const [mergeMode, setMergeMode] = useState(false)
  const [masterId, setMasterId] = useState<string | null>(null)
  const [duplicateIds, setDuplicateIds] = useState<string[]>([])
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const { toast } = useToast()

  const { scrollRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight, checkScroll } =
    useTableScroll()

  const handleCategoryChange = async (id: string, newCategory: string) => {
    try {
      const { error } = await supabase
        .from('estoque_itens')
        .update({ categoria: newCategory, atualizado_em: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      toast({ title: 'Categoria atualizada' })
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, categoria: newCategory } : item)),
      )
    } catch (e: any) {
      toast({
        title: 'Erro ao atualizar categoria',
        description: e.message,
        variant: 'destructive',
      })
    }
  }

  const [newItem, setNewItem] = useState({
    nome: '',
    categoria: '',
    quantidade: 0,
    unidade: 'un',
    estoque_minimo: 0,
    valor_unitario: 0,
    fornecedor: '',
    terceirizado: false,
    marca: '',
    cor: '',
    espessura_mm: '',
    largura_mm: '',
    comprimento_m: '',
  })

  async function fetchItems() {
    const { data: itemsData } = await supabase
      .from('estoque_itens' as any)
      .select('*')
      .order('nome')

    const { data: allocData } = await supabase
      .from('estoque_alocacoes' as any)
      .select('*')
      .eq('status', 'ativo')
    const { data: sobrasData } = await supabase
      .from('estoque_sobras' as any)
      .select('*')
      .eq('tipo', 'chapa_inteira')
      .eq('status', 'disponivel')

    if (itemsData) setItems(itemsData)
    if (allocData) setAllocations(allocData)
    if (sobrasData) setSobrasChapas(sobrasData)
  }

  useEffect(() => {
    fetchItems()
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.rpc('is_admin', { user_id: user.id })
      setIsAdmin(!!data)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este item do inventário?')) return
    await supabase.from('estoque_itens').delete().eq('id', id)
    fetchItems()
    toast({ title: 'Item apagado' })
  }

  const handleSaveItem = async () => {
    if (!newItem.nome.trim()) {
      toast({ title: 'Nome do item é obrigatório', variant: 'destructive' })
      return
    }
    if (!newItem.unidade.trim()) {
      toast({ title: 'Unidade é obrigatória', variant: 'destructive' })
      return
    }

    setSavingItem(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const result = await saveManualEstoqueItem(
        {
          nome: newItem.nome.trim(),
          marca: newItem.marca,
          cor: newItem.cor,
          espessura_mm: newItem.espessura_mm,
          largura_mm: newItem.largura_mm,
          comprimento_m: newItem.comprimento_m,
          fornecedor: newItem.fornecedor,
          unidade: newItem.unidade,
          valor_unitario: newItem.valor_unitario,
          quantidade: newItem.quantidade,
          categoria: newItem.categoria,
          classe: '',
          grupo: '',
          terceirizado: newItem.terceirizado,
          estoque_minimo: newItem.estoque_minimo,
        },
        user?.id,
      )

      if (result.error || !result.item) {
        throw new Error(result.error || 'Falha ao salvar o item.')
      }

      const saved = result.item
      const baseFields = {
        nome: newItem.nome.trim(),
        marca: newItem.marca || null,
        cor: newItem.cor || null,
        espessura_mm: newItem.espessura_mm ? Number(newItem.espessura_mm) : null,
        largura_mm: newItem.largura_mm ? Number(newItem.largura_mm) : null,
        comprimento_m: newItem.comprimento_m ? Number(newItem.comprimento_m) : null,
        fornecedor: newItem.fornecedor || null,
        unidade: newItem.unidade,
        valor_unitario: Number(newItem.valor_unitario),
        categoria: newItem.categoria || null,
        terceirizado: newItem.terceirizado,
        estoque_minimo: Number(newItem.estoque_minimo) || 0,
        atualizado_em: new Date().toISOString(),
      }

      if (saved.isNew) {
        setItems((prev) => [
          {
            id: saved.id,
            ...baseFields,
            quantidade: saved.quantidade,
            criado_em: new Date().toISOString(),
            metadados_normalizados: null,
            classe: null,
            grupo: null,
          },
          ...prev,
        ])
      } else {
        setItems((prev) =>
          prev.map((it) =>
            it.id === saved.id ? { ...it, ...baseFields, quantidade: saved.quantidade } : it,
          ),
        )
      }

      toast({
        title: saved.isNew ? 'Item Cadastrado' : 'Estoque Atualizado',
        description: saved.isNew
          ? 'O item foi adicionado ao inventário.'
          : 'O item já existia e sua quantidade foi somada.',
      })

      normalizeItemInBackground(saved.id, newItem.nome.trim()).catch((e) =>
        console.error('background normalization failed:', e),
      )

      setIsModalOpen(false)
      setNewItem({
        nome: '',
        categoria: '',
        quantidade: 0,
        unidade: 'un',
        estoque_minimo: 0,
        valor_unitario: 0,
        fornecedor: '',
        terceirizado: false,
        marca: '',
        cor: '',
        espessura_mm: '',
        largura_mm: '',
        comprimento_m: '',
      })
    } catch (e: any) {
      toast({ title: 'Erro ao salvar item', description: e.message, variant: 'destructive' })
    } finally {
      setSavingItem(false)
    }
  }

  const filteredItems = items.filter(
    (i) =>
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      i.categoria?.toLowerCase().includes(search.toLowerCase()) ||
      i.marca?.toLowerCase().includes(search.toLowerCase()) ||
      i.fornecedor?.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleDuplicate = (id: string) => {
    setDuplicateIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const toggleMaster = (id: string) => {
    setMasterId((prev) => {
      if (prev === id) {
        setDuplicateIds((dups) => dups.filter((d) => d !== id))
        return null
      }
      setDuplicateIds((dups) => dups.filter((d) => d !== id))
      return id
    })
  }

  const exitMergeMode = () => {
    setMergeMode(false)
    setMasterId(null)
    setDuplicateIds([])
  }

  const canConfirmMerge = !!masterId && duplicateIds.length > 0

  const masterItem = masterId ? items.find((i) => i.id === masterId) : null
  const duplicateItems = items.filter((i) => duplicateIds.includes(i.id))

  const [isNormalizing, setIsNormalizing] = useState(false)
  const [normalizeProgress, setNormalizeProgress] = useState(0)

  const handleNormalizeBatch = async () => {
    const unnormalized = items.filter((i) => !i.metadados_normalizados)
    if (unnormalized.length === 0) return
    setIsNormalizing(true)
    setNormalizeProgress(0)
    try {
      toast({
        title: 'Normalizando...',
        description: `Processando ${unnormalized.length} itens pelo motor de IA.`,
      })

      const batchSize = 50
      const totalBatches = Math.ceil(unnormalized.length / batchSize)
      let processedBatches = 0

      for (let i = 0; i < unnormalized.length; i += batchSize) {
        const batch = unnormalized.slice(i, i + batchSize)
        const descricoes = batch.map((b) => b.nome)

        const { data, error } = await supabase.functions.invoke('material-normalization', {
          body: { action: 'normalize_batch', items: descricoes },
        })

        if (error) throw error

        const results = data.results || []

        for (let j = 0; j < batch.length; j++) {
          if (results[j]) {
            const res = results[j]
            await supabase
              .from('estoque_itens')
              .update({
                metadados_normalizados: res,
                marca: res.marca || undefined,
                cor: res.cor || undefined,
                espessura_mm: res.espessura_mm || undefined,
                largura_mm: res.largura_mm || undefined,
                comprimento_m: res.comprimento_m || undefined,
              })
              .eq('id', batch[j].id)
          }
        }

        processedBatches++
        setNormalizeProgress(Math.round((processedBatches / totalBatches) * 100))
      }

      toast({ title: 'Sucesso', description: 'Nomenclaturas normalizadas com sucesso.' })
      fetchItems()
    } catch (e: any) {
      toast({ title: 'Erro na Normalização', description: e.message, variant: 'destructive' })
    } finally {
      setIsNormalizing(false)
      setNormalizeProgress(0)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return

    const headers = [
      'Item',
      'Marca',
      'Detalhes Técnicos',
      'Categoria',
      'Fornecedor',
      'Quantidade',
      'Unidade',
      'Valor Unitário',
      'Valor Total',
      'Alocações de Clientes',
    ]

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""'
      const stringValue = String(value)
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    const rows = filteredItems.map((item) => {
      const detalhes = []
      if (item.cor) detalhes.push(`Cor: ${item.cor}`)
      if (item.espessura_mm) detalhes.push(`Esp: ${item.espessura_mm}mm`)
      if (item.largura_mm) detalhes.push(`Larg: ${item.largura_mm}mm`)
      if (item.comprimento_m) detalhes.push(`Comp: ${item.comprimento_m}m`)
      const detalhesStr = detalhes.length > 0 ? detalhes.join(' | ') : '-'

      const itemAllocations = allocations.filter((a) => a.item_id === item.id)
      const alocacoesStr =
        itemAllocations.length > 0
          ? itemAllocations
              .map((a) =>
                a.destino === 'consumo_interno'
                  ? `Consumo Interno (${a.quantidade})`
                  : `${a.cliente_nome} (${a.quantidade})`,
              )
              .join(', ')
          : '-'

      return [
        escapeCSV(item.nome),
        escapeCSV(item.marca || '-'),
        escapeCSV(detalhesStr),
        escapeCSV(item.categoria || '-'),
        escapeCSV(item.fornecedor || '-'),
        escapeCSV(item.quantidade),
        escapeCSV(item.unidade),
        escapeCSV(Number(item.valor_unitario || 0).toFixed(2)),
        escapeCSV((Number(item.quantidade || 0) * Number(item.valor_unitario || 0)).toFixed(2)),
        escapeCSV(alocacoesStr),
      ].join(';')
    })

    const csvContent = [headers.join(';'), ...rows].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    const dateStr = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `inventario_exportado_${dateStr}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const itemsSemMetadados = items.filter((i) => !i.metadados_normalizados).length

  const buildDetalhesText = (item: any): string => {
    const parts: string[] = []
    if (item.marca) parts.push(`Marca: ${item.marca}`)
    if (item.cor) parts.push(`Cor: ${item.cor}`)
    if (item.espessura_mm) parts.push(`Esp: ${item.espessura_mm}mm`)
    if (item.largura_mm) parts.push(`Larg: ${item.largura_mm}mm`)
    if (item.comprimento_m) parts.push(`Comp: ${item.comprimento_m}m`)
    if (item.grupo) parts.push(`Grupo: ${item.grupo}`)
    if (item.classe) parts.push(`Classe: ${item.classe}`)
    return parts.join(' · ')
  }

  return (
    <div className="h-full flex flex-col space-y-4 bg-card p-6 rounded-xl border border-border min-h-0">
      {itemsSemMetadados > 0 && isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 flex items-center justify-between mb-4 flex-none">
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-300">
              Normalização Inteligente Pendente
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Há {itemsSemMetadados} itens no estoque sem os metadados normalizados. Normalize para
              ativar a conciliação automática completa.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button
              onClick={handleNormalizeBatch}
              disabled={isNormalizing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isNormalizing ? 'Processando...' : 'Normalizar Estoque'}
            </Button>
            {isNormalizing && (
              <div className="w-48">
                <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 mb-1">
                  <span>Progresso</span>
                  <span>{normalizeProgress}%</span>
                </div>
                <div className="h-2 bg-blue-100 dark:bg-blue-900/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 rounded-full"
                    style={{ width: `${normalizeProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between flex-none">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar item, marca ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {mergeMode ? (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mr-2">
                <span className="font-medium">
                  Mestre: {masterItem ? '1 selecionado' : 'nenhum'}
                </span>
                <span className="text-slate-400">|</span>
                <span className="font-medium">Duplicados: {duplicateIds.length}</span>
              </div>
              <Button variant="outline" onClick={exitMergeMode} className="border-border">
                <X className="h-4 w-4 mr-2" /> Cancelar
              </Button>
              <Button
                onClick={() => setMergeModalOpen(true)}
                disabled={!canConfirmMerge}
                className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                <GitMerge className="h-4 w-4 mr-2" /> Confirmar Mesclagem
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={filteredItems.length === 0}
                className="border-border"
              >
                <Download className="h-4 w-4 mr-2" /> Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => setMergeMode(true)}
                disabled={filteredItems.length < 2}
                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                <GitMerge className="h-4 w-4 mr-2" /> Mesclar Itens
              </Button>
              <Button
                className="bg-steel-blue hover:bg-dark-denim dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Novo Item
              </Button>
            </>
          )}
        </div>
      </div>

      {mergeMode && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 flex items-start gap-3 flex-none">
          <GitMerge className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Modo de Mesclagem ativo</p>
            <p className="text-xs mt-0.5">
              Selecione <strong>um item como Mestre</strong> (botão radio) e um ou mais itens como
              <strong> Duplicados</strong> (checkbox). Os duplicados serão excluídos e seus
              registros migrados para o mestre.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col min-h-0 relative group">
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-8 rounded-l-none rounded-r-md bg-card/70 hover:bg-card/90 backdrop-blur-sm shadow-md border-l-0 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-8 rounded-r-none rounded-l-md bg-card/70 hover:bg-card/90 backdrop-blur-sm shadow-md border-r-0 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
        <div ref={scrollRef} onScroll={checkScroll} className="overflow-auto flex-1">
          {' '}
          <Table className="min-w-[900px] relative">
            <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
              <TableRow>
                {mergeMode && (
                  <TableHead className="w-[110px] text-center whitespace-nowrap px-2">
                    Mesclar
                  </TableHead>
                )}
                <TableHead className="w-[260px] min-w-[260px] px-2">Item</TableHead>
                <TableHead className="whitespace-nowrap px-2">Categoria</TableHead>
                <TableHead className="min-w-[120px] max-w-[140px] px-2">Fornecedor</TableHead>
                <TableHead className="text-right whitespace-nowrap px-2">Qtd</TableHead>
                <TableHead className="text-right whitespace-nowrap px-2">Valor</TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 w-[50px]">⋮</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const itemAllocations = allocations.filter((a) => a.item_id === item.id)
                const totalAllocated = itemAllocations.reduce(
                  (acc, curr) => acc + curr.quantidade,
                  0,
                )
                const itemSobras = sobrasChapas.filter((s) => s.item_id === item.id)
                const totalSobras = itemSobras.length
                const detalhesText = buildDetalhesText(item)
                const qtdColor = getQuantityColor(
                  Number(item.quantidade || 0),
                  Number(item.estoque_minimo || 0),
                )
                const fornecedorText = item.fornecedor || '-'

                return (
                  <TableRow key={item.id}>
                    {mergeMode && (
                      <TableCell className="text-center align-top pt-3 px-2">
                        <div className="flex flex-col items-center gap-1.5">
                          <label className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 cursor-pointer">
                            <Checkbox
                              checked={masterId === item.id}
                              onCheckedChange={() => toggleMaster(item.id)}
                              className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                            Mestre
                          </label>
                          <label className="flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 cursor-pointer">
                            <Checkbox
                              checked={duplicateIds.includes(item.id)}
                              onCheckedChange={() => toggleDuplicate(item.id)}
                              disabled={masterId === item.id}
                              className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                            />
                            Dup.
                          </label>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="font-medium align-top px-2 w-[260px] min-w-[260px]">
                      <div
                        className="leading-snug"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {item.nome}
                      </div>
                      {detalhesText && (
                        <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5 leading-tight">
                          {detalhesText}
                        </div>
                      )}
                      <div className="flex flex-col gap-1 mt-1">
                        {itemAllocations.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {itemAllocations.map((a) => (
                              <span
                                key={a.id}
                                className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm flex items-center gap-1 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50"
                              >
                                <span className="text-[9px]">📍</span> {a.quantidade}x{' '}
                                {a.cliente_nome}
                              </span>
                            ))}
                          </div>
                        )}
                        {totalSobras > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-sm flex items-center gap-1 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50">
                              <span className="text-[9px]">♻️</span> Possui Sobras ({totalSobras})
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2">
                      <div className="flex items-center gap-2">
                        <CategoryBadge
                          category={item.categoria || ''}
                          onEdit={(val) => handleCategoryChange(item.id, val)}
                        />
                        {item.terceirizado && (
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900 text-[10px] px-1.5 py-0"
                          >
                            Terc.
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 min-w-[120px] max-w-[140px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="block truncate text-sm cursor-default"
                            style={{ maxWidth: 120 }}
                          >
                            {fornecedorText}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span className="max-w-xs">{fornecedorText}</span>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right px-2">
                      <span className={qtdColor}>{item.quantidade}</span>{' '}
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {item.unidade}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-2">
                      <div className="flex flex-col items-end leading-tight">
                        <span className="text-sm text-gray-700 dark:text-slate-300">
                          Unit: {formatCurrency(item.valor_unitario)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          Total: {formatCurrency(item.quantidade * item.valor_unitario)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap align-top pt-3 px-2 w-[50px]">
                      {!mergeMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setItemToEdit(item)}>
                              <Pencil className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setItemToAllocate(item)}>
                              <Tags className="w-4 h-4 mr-2" /> Alocar e Gerar Etiqueta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setItemToDesalocar(item)}>
                              <PackageMinus className="w-4 h-4 mr-2" /> Desalocar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={mergeMode ? 7 : 6}
                    className="text-center py-8 text-gray-500 dark:text-slate-400"
                  >
                    Nenhum item encontrado no estoque.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Novo Item de Estoque</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Item</Label>
              <Input
                value={newItem.nome}
                onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                placeholder="Ex: Dobradiça com amortecedor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={newItem.categoria}
                  onValueChange={(val) => setNewItem({ ...newItem, categoria: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_ESTOQUE.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  value={newItem.fornecedor}
                  onChange={(e) => setNewItem({ ...newItem, fornecedor: e.target.value })}
                  placeholder="Nome do Fornecedor"
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border border-border">
              <h4 className="font-medium text-sm text-gray-700 dark:text-slate-300">
                Atributos Técnicos (Opcional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={newItem.marca}
                    onChange={(e) => setNewItem({ ...newItem, marca: e.target.value })}
                    placeholder="Ex: Arauco, Blum, Guararapes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={newItem.cor}
                    onChange={(e) => setNewItem({ ...newItem, cor: e.target.value })}
                    placeholder="Ex: Branco TX, Preto Silk"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Espessura (mm)</Label>
                  <Input
                    type="number"
                    value={newItem.espessura_mm}
                    onChange={(e) => setNewItem({ ...newItem, espessura_mm: e.target.value })}
                    placeholder="15, 18..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Largura (mm)</Label>
                  <Input
                    type="number"
                    value={newItem.largura_mm}
                    onChange={(e) => setNewItem({ ...newItem, largura_mm: e.target.value })}
                    placeholder="Para fitas..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comprimento (m)</Label>
                  <Input
                    type="number"
                    value={newItem.comprimento_m}
                    onChange={(e) => setNewItem({ ...newItem, comprimento_m: e.target.value })}
                    placeholder="Para perfis..."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Qtd Inicial</Label>
                <Input
                  type="number"
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={newItem.unidade}
                  onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                  placeholder="un, m2, kg"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unit. (R$)</Label>
                <Input
                  type="number"
                  value={newItem.valor_unitario}
                  onChange={(e) =>
                    setNewItem({ ...newItem, valor_unitario: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="terceirizado"
                checked={newItem.terceirizado}
                onCheckedChange={(c) => setNewItem({ ...newItem, terceirizado: c })}
              />
              <Label htmlFor="terceirizado" className="cursor-pointer text-purple-700 font-medium">
                Este é um item terceirizado (Ex: Vidros, Pedras)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveItem}
              className="bg-steel-blue text-white hover:bg-dark-denim"
              disabled={savingItem}
            >
              {savingItem && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {savingItem ? 'Salvando...' : 'Salvar Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {itemToAllocate && (
        <GerarEtiquetaModal
          isOpen={!!itemToAllocate}
          onClose={() => setItemToAllocate(null)}
          item={itemToAllocate}
          totalAllocated={allocations
            .filter((a) => a.item_id === itemToAllocate.id)
            .reduce((acc, curr) => acc + curr.quantidade, 0)}
          onSave={fetchItems}
        />
      )}

      {itemToEdit && (
        <EditItemModal
          isOpen={!!itemToEdit}
          onClose={() => setItemToEdit(null)}
          item={itemToEdit}
          onSaved={() => {
            setItemToEdit(null)
            fetchItems()
          }}
        />
      )}

      {itemToDesalocar && (
        <DesalocarModal
          isOpen={!!itemToDesalocar}
          onClose={() => setItemToDesalocar(null)}
          item={itemToDesalocar}
          onDone={fetchItems}
        />
      )}

      <MergeItemsModal
        isOpen={mergeModalOpen}
        onClose={() => setMergeModalOpen(false)}
        masterItem={masterItem}
        duplicateItems={duplicateItems}
        onMerged={() => {
          setMergeModalOpen(false)
          exitMergeMode()
          fetchItems()
        }}
      />
    </div>
  )
}
