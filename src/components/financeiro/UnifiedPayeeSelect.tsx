import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Check,
  ChevronsUpDown,
  Plus,
  Building2,
  User,
  Briefcase,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type PayeeType = 'fornecedor' | 'clt' | 'pj'

export interface PayeeOption {
  id: string
  name: string
  type: PayeeType
}

const PAYEE_LABELS: Record<PayeeType, string> = {
  fornecedor: 'Fornecedores',
  clt: 'Colaboradores (CLT)',
  pj: 'Parceiros (PJ)',
}

const PAYEE_ICONS: Record<PayeeType, typeof Building2> = {
  fornecedor: Building2,
  clt: User,
  pj: Briefcase,
}

export function UnifiedPayeeSelect({
  value,
  onChange,
}: {
  value: PayeeOption | null
  onChange: (payee: PayeeOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [payees, setPayees] = useState<PayeeOption[]>([])
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newRazaoSocial, setNewRazaoSocial] = useState('')
  const [newCnpj, setNewCnpj] = useState('')
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    Promise.all([
      supabase.from('fornecedores').select('id, razao_social').order('razao_social'),
      supabase.from('equipe_clt').select('id, nome_completo').order('nome_completo'),
      supabase.from('parceiros_pj').select('id, razao_social').order('razao_social'),
    ]).then(([fRes, cRes, pRes]) => {
      const list: PayeeOption[] = []
      fRes.data?.forEach((f: any) =>
        list.push({ id: f.id, name: f.razao_social, type: 'fornecedor' }),
      )
      cRes.data?.forEach((c: any) => list.push({ id: c.id, name: c.nome_completo, type: 'clt' }))
      pRes.data?.forEach((p: any) => list.push({ id: p.id, name: p.razao_social, type: 'pj' }))
      setPayees(list)
    })
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return payees
    return payees.filter((p) => p.name?.toLowerCase().includes(term))
  }, [payees, search])

  const grouped = useMemo(() => {
    const g: Record<PayeeType, PayeeOption[]> = { fornecedor: [], clt: [], pj: [] }
    filtered.forEach((p) => g[p.type].push(p))
    return g
  }, [filtered])

  const handleCreateSupplier = async () => {
    if (newRazaoSocial.trim().length < 2) return
    const cnpjDigits = newCnpj.replace(/\D/g, '')
    if (cnpjDigits.length < 14) {
      toast({ title: 'CNPJ inválido', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          razao_social: newRazaoSocial.trim(),
          cnpj: cnpjDigits,
          nome_fantasia: newRazaoSocial.trim(),
        })
        .select('id, razao_social')
        .single()
      if (error) throw error
      const newPayee: PayeeOption = {
        id: data.id,
        name: data.razao_social,
        type: 'fornecedor',
      }
      setPayees((prev) => [...prev, newPayee])
      onChange(newPayee)
      setShowNewSupplier(false)
      setNewRazaoSocial('')
      setNewCnpj('')
      toast({ title: 'Fornecedor cadastrado' })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const Icon = value ? PAYEE_ICONS[value.type] : null

  return (
    <div className="space-y-2">
      <Label>Fornecedor / Beneficiário</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span className="truncate flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />}
                <span className="truncate">{value.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Selecione fornecedor, colaborador ou parceiro
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Buscar..."
                value={search}
                onValueChange={setSearch}
                className="h-9"
              />
            </div>
            <CommandList>
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              {(['fornecedor', 'clt', 'pj'] as PayeeType[]).map((type) => {
                const items = grouped[type]
                if (items.length === 0) return null
                return (
                  <CommandGroup key={type} heading={PAYEE_LABELS[type]}>
                    {items.map((p) => (
                      <CommandItem
                        key={`${p.type}-${p.id}`}
                        value={`${p.type}-${p.id}`}
                        onSelect={() => {
                          onChange(p)
                          setOpen(false)
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value?.id === p.id && value?.type === p.type
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        <span className="truncate">{p.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setShowNewSupplier(true)
                    setOpen(false)
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
          <Button
            type="button"
            size="sm"
            onClick={handleCreateSupplier}
            disabled={creating}
            className="w-full"
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creating ? 'Cadastrando...' : 'Cadastrar Fornecedor'}
          </Button>
        </div>
      )}
    </div>
  )
}
