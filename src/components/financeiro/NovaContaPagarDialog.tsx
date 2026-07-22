import { useState, useEffect, useMemo } from 'react'
import { CircleArrowDown, Plus, Search, Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'

interface Fornecedor {
  id: string
  razao_social: string
  cnpj: string | null
  nome_fantasia: string | null
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  // Handle month overflow (e.g. Jan 31 + 1 month)
  if (d.getDate() < day) d.setDate(0)
  return d.toISOString().slice(0, 10)
}

export function NovaContaPagarDialog({ onRefresh }: { onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [fornecedorSel, setFornecedorSel] = useState<Fornecedor | null>(null)
  const [comboOpen, setComboOpen] = useState(false)
  const [comboSearch, setComboSearch] = useState('')

  // inline new supplier
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newRazaoSocial, setNewRazaoSocial] = useState('')
  const [newCnpj, setNewCnpj] = useState('')

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [categoria, setCategoria] = useState('')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [contas, setContas] = useState<any[]>([])

  // recurrence
  const [recorrente, setRecorrente] = useState(false)
  const [qtdMeses, setQtdMeses] = useState('2')

  useEffect(() => {
    if (open) {
      supabase
        .from('fornecedores')
        .select('id, razao_social, cnpj, nome_fantasia')
        .order('razao_social')
        .then(({ data, error }) => {
          if (!error && data) setFornecedores(data as Fornecedor[])
        })
      supabase
        .from('contas_bancarias')
        .select('id, nome_exibicao, status')
        .order('nome_exibicao')
        .then(({ data }) => {
          if (data) setContas(data.filter((c) => c.status))
        })
    }
  }, [open])

  const filteredFornecedores = useMemo(() => {
    const term = comboSearch.trim().toLowerCase()
    if (!term) return fornecedores
    return fornecedores.filter(
      (f) =>
        f.razao_social?.toLowerCase().includes(term) ||
        f.cnpj?.toLowerCase().includes(term) ||
        f.nome_fantasia?.toLowerCase().includes(term),
    )
  }, [fornecedores, comboSearch])

  const resetForm = () => {
    setFornecedorSel(null)
    setShowNewSupplier(false)
    setNewRazaoSocial('')
    setNewCnpj('')
    setComboSearch('')
    setDescricao('')
    setValor('')
    setDataVencimento('')
    setCategoria('')
    setContaBancariaId('none')
    setRecorrente(false)
    setQtdMeses('2')
  }

  const isValid = useMemo(() => {
    const hasSupplier =
      fornecedorSel !== null || (showNewSupplier && newRazaoSocial.trim().length >= 2)
    const hasValor = Number(valor) > 0
    const hasData = !!dataVencimento
    const supplierCnpjValid = !showNewSupplier || newCnpj.replace(/\D/g, '').length >= 14
    return hasSupplier && hasValor && hasData && supplierCnpjValid
  }, [fornecedorSel, showNewSupplier, newRazaoSocial, newCnpj, valor, dataVencimento])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    try {
      setLoading(true)

      let supplierName = fornecedorSel?.razao_social || ''
      if (showNewSupplier) {
        const cnpjDigits = newCnpj.replace(/\D/g, '')
        const { data: created, error: supErr } = await supabase
          .from('fornecedores')
          .insert({
            razao_social: newRazaoSocial.trim(),
            cnpj: cnpjDigits,
            nome_fantasia: newRazaoSocial.trim(),
          })
          .select('id, razao_social')
          .single()
        if (supErr) throw supErr
        supplierName = created?.razao_social || newRazaoSocial.trim()
        setFornecedores((prev) => [...prev, created as Fornecedor])
        setFornecedorSel(created as Fornecedor)
        setShowNewSupplier(false)
      }

      const valorNum = Number(valor)
      const meses = recorrente ? Math.max(1, parseInt(qtdMeses, 10) || 1) : 1

      const rows: any[] = []
      for (let i = 0; i < meses; i++) {
        rows.push({
          fornecedor: supplierName,
          descricao,
          valor: valorNum,
          data_vencimento: addMonths(dataVencimento, i),
          categoria: categoria || null,
          user_id: user?.id,
          status_pagamento: 'pendente',
          conta_bancaria_id: contaBancariaId === 'none' ? null : contaBancariaId,
        })
      }

      const { error } = await supabase.from('contas_pagar').insert(rows)
      if (error) throw error

      toast({
        title: 'Sucesso',
        description:
          meses > 1
            ? `${meses} contas a pagar recorrentes cadastradas.`
            : 'Conta a pagar cadastrada com sucesso.',
      })
      setOpen(false)
      resetForm()
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível cadastrar a conta.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white border-0 inline-flex items-center rounded-md h-10 px-4 w-full sm:w-auto">
          <CircleArrowDown className="mr-2 h-4 w-4 text-white" />
          Nova Conta a Pagar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para cadastrar uma nova despesa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Fornecedor combobox */}
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {fornecedorSel && !showNewSupplier ? (
                    <span className="truncate">{fornecedorSel.razao_social}</span>
                  ) : (
                    <span className="text-muted-foreground">Selecione um fornecedor</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <CommandInput
                      placeholder="Buscar fornecedor..."
                      value={comboSearch}
                      onValueChange={setComboSearch}
                      className="h-9"
                    />
                  </div>
                  <CommandList>
                    <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredFornecedores.map((f) => (
                        <CommandItem
                          key={f.id}
                          value={f.id}
                          onSelect={() => {
                            setFornecedorSel(f)
                            setShowNewSupplier(false)
                            setComboOpen(false)
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              fornecedorSel?.id === f.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{f.razao_social}</span>
                            {f.nome_fantasia && f.nome_fantasia !== f.razao_social && (
                              <span className="text-xs text-muted-foreground">
                                {f.nome_fantasia}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setShowNewSupplier(true)
                          setFornecedorSel(null)
                          setComboOpen(false)
                        }}
                        className="cursor-pointer text-emerald-600"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar Novo Fornecedor
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Inline new supplier */}
          {showNewSupplier && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
              <p className="text-xs font-medium text-emerald-700">Novo Fornecedor</p>
              <div className="space-y-2">
                <Label htmlFor="new-razao">Razão Social *</Label>
                <Input
                  id="new-razao"
                  value={newRazaoSocial}
                  onChange={(e) => setNewRazaoSocial(e.target.value)}
                  placeholder="Razão social do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-cnpj">CNPJ *</Label>
                <Input
                  id="new-cnpj"
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Compra de materiais"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <CurrencyInput
                id="valor"
                value={valor}
                onValueChange={(val) => setValor(val ? val.toString() : '')}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">Vencimento *</Label>
              <Input
                id="dataVencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Material de Consumo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contaBancaria">Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_exibicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recorrente"
                checked={recorrente}
                onCheckedChange={(v) => setRecorrente(v === true)}
              />
              <Label htmlFor="recorrente" className="cursor-pointer">
                Lançamento Recorrente
              </Label>
            </div>
            {recorrente && (
              <div className="space-y-2">
                <Label htmlFor="qtdMeses">Quantidade de Meses</Label>
                <Input
                  id="qtdMeses"
                  type="number"
                  min={1}
                  max={60}
                  value={qtdMeses}
                  onChange={(e) => setQtdMeses(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Serão criadas {Math.max(1, parseInt(qtdMeses, 10) || 1)} contas, com vencimento
                  mensal a partir de {dataVencimento || '—'}.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !isValid}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar Conta a Pagar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
