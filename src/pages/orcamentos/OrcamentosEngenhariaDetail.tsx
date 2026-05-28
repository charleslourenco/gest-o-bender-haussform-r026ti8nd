import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OcrUploadZone } from '@/components/OcrUploadZone'
import { Loader2, ArrowLeft, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'

interface ClienteOption {
  id: string
  nome: string
}

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<ClienteOption[]>([])

  // Form State
  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNomeManual, setClienteNomeManual] = useState<string>('')

  const [markupVista, setMarkupVista] = useState<number>(0.4)
  const [markupPrazo, setMarkupPrazo] = useState<number>(0.35)
  const [desconto, setDesconto] = useState<number>(0)

  // Combobox State
  const [openCombobox, setOpenCombobox] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Ambientes e itens
  const [ambientes, setAmbientes] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)

    // Load config markups
    const { data: config } = await supabase
      .from('configuracoes_sistema')
      .select('*')
      .limit(1)
      .maybeSingle()
    const defVista = config?.markup_vista ?? 0.4
    const defPrazo = config?.markup_prazo ?? 0.35

    // Load clients
    const { data: clientsData } = await supabase.from('clientes').select('id, nome').order('nome')
    setClientes(clientsData || [])

    if (id) {
      const { data: orcData, error } = await supabase
        .from('orcamentos_engenharia')
        .select(`
          *,
          ambientes:orcamentos_ambientes(
            *,
            itens:orcamentos_itens(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        toast.error('Erro ao carregar orçamento')
        navigate('/orcamentos')
        return
      }

      setNome(orcData.nome)
      setClienteId(orcData.cliente_id)
      setClienteNomeManual(orcData.cliente_nome_manual || '')
      setMarkupVista(orcData.markup_divisor_vista ?? defVista)
      setMarkupPrazo(orcData.markup_divisor_normal ?? defPrazo)
      setDesconto(orcData.desconto ?? 0)

      if (orcData.ambientes) {
        setAmbientes(orcData.ambientes)
      }
    } else {
      setMarkupVista(defVista)
      setMarkupPrazo(defPrazo)
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!nome.trim()) {
      toast.error('Nome do orçamento é obrigatório')
      return
    }
    if (!clienteId && !clienteNomeManual.trim()) {
      toast.error('Selecione ou informe um cliente')
      return
    }

    setSaving(true)
    const payload = {
      nome,
      cliente_id: clienteId,
      cliente_nome_manual: clienteId ? null : clienteNomeManual,
      markup_divisor_vista: markupVista,
      markup_divisor_normal: markupPrazo,
      desconto,
      atualizado_em: new Date().toISOString(),
    }

    let orcId = id
    if (id) {
      const { error } = await supabase.from('orcamentos_engenharia').update(payload).eq('id', id)
      if (error) toast.error('Erro ao atualizar')
      else toast.success('Atualizado com sucesso!')
    } else {
      const { data, error } = await supabase
        .from('orcamentos_engenharia')
        .insert([payload])
        .select()
        .single()
      if (error) {
        toast.error('Erro ao criar')
      } else {
        toast.success('Orçamento criado!')
        orcId = data.id
        navigate(`/orcamentos/${data.id}`, { replace: true })
      }
    }
    setSaving(false)
  }

  async function handleOcrSuccess(data: any) {
    if (!id) {
      toast.error('Salve o orçamento (cabeçalho) antes de importar itens via OCR.')
      return
    }

    try {
      // 1. Verificar/criar ambiente
      const nomeAmbiente = data.ambiente || 'Ambiente Geral OCR'
      let targetAmbiente = ambientes.find(
        (a) => a.nome.toLowerCase() === nomeAmbiente.toLowerCase(),
      )

      if (!targetAmbiente) {
        const { data: newAmb, error: ambError } = await supabase
          .from('orcamentos_ambientes')
          .insert({
            orcamento_id: id,
            nome: nomeAmbiente,
            descricao_comercial: data.descricao || '',
          })
          .select()
          .single()

        if (ambError) throw ambError
        targetAmbiente = newAmb
        setAmbientes((prev) => [...prev, { ...newAmb, itens: [] }])
      }

      // 2. Inserir Itens
      if (data.itens && Array.isArray(data.itens) && data.itens.length > 0) {
        const itensToInsert = data.itens.map((it: any) => ({
          ambiente_id: targetAmbiente.id,
          nome_item: it.nome_item || 'Item OCR',
          quantidade: it.quantidade || 1,
          custo_unitario: it.custo_unitario || 0,
          unidade_medida: 'un',
          markup: markupPrazo,
          markup_manual: false,
        }))

        const { data: newItems, error: itError } = await supabase
          .from('orcamentos_itens')
          .insert(itensToInsert)
          .select()

        if (itError) throw itError

        setAmbientes((prev) =>
          prev.map((a) =>
            a.id === targetAmbiente.id
              ? { ...a, itens: [...(a.itens || []), ...(newItems || [])] }
              : a,
          ),
        )
      }

      // Update client name if empty
      if (data.cliente && !clienteId && !clienteNomeManual) {
        setClienteNomeManual(data.cliente)
      }

      toast.success('Itens do OCR importados com sucesso!')
    } catch (error: any) {
      toast.error(`Falha ao importar itens: ${error.message}`)
    }
  }

  // Combobox Display Logic
  const selectedDisplay = clienteId
    ? clientes.find((c) => c.id === clienteId)?.nome
    : clienteNomeManual

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const showAddOption =
    searchQuery.trim().length > 0 &&
    !clientes.some((c) => c.nome.toLowerCase() === searchQuery.trim().toLowerCase())

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex items-center gap-4 p-6 pb-4 shrink-0 bg-white border-b border-slate-200">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {id ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h1>
          <p className="text-slate-500 text-sm">Preencha os dados e adicione os itens</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Orçamento
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados Principais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Nome do Orçamento / Projeto *</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Móveis Cozinha AP 201"
              />
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <Label>Cliente *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                  >
                    {selectedDisplay || 'Selecione ou digite um cliente...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <div className="flex items-center border-b px-3">
                      <Input
                        placeholder="Buscar ou adicionar cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 border-0 shadow-none focus-visible:ring-0 px-0"
                      />
                    </div>
                    <CommandList>
                      <CommandGroup>
                        {filteredClientes.map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            value={cliente.nome}
                            onSelect={() => {
                              setClienteId(cliente.id)
                              setClienteNomeManual('')
                              setOpenCombobox(false)
                              setSearchQuery('')
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                clienteId === cliente.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {cliente.nome}
                          </CommandItem>
                        ))}
                        {showAddOption && (
                          <CommandItem
                            onSelect={() => {
                              setClienteId(null)
                              setClienteNomeManual(searchQuery.trim())
                              setOpenCombobox(false)
                              setSearchQuery('')
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                            Adicionar "{searchQuery}"
                          </CommandItem>
                        )}
                        {!showAddOption && filteredClientes.length === 0 && (
                          <div className="p-4 text-center text-sm text-slate-500">
                            Nenhum cliente encontrado.
                          </div>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Desconto Geral (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={desconto}
                onChange={(e) => setDesconto(parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Markup Divisor (À Vista)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={markupVista}
                onChange={(e) => setMarkupVista(parseFloat(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Markup Divisor (A Prazo)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="1"
                value={markupPrazo}
                onChange={(e) => setMarkupPrazo(parseFloat(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {id ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle>Ambientes e Itens</CardTitle>
                  <Button size="sm" variant="outline">
                    Adicionar Ambiente Manual
                  </Button>
                </CardHeader>
                <CardContent>
                  {ambientes.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 border border-dashed rounded-lg bg-slate-50">
                      Nenhum ambiente cadastrado.
                      <br />
                      Importe uma lista via OCR ao lado ou adicione manualmente.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {ambientes.map((amb) => (
                        <div key={amb.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-slate-100 p-3 font-medium border-b flex justify-between items-center">
                            <span>{amb.nome}</span>
                            <span className="text-xs text-slate-500">
                              {amb.itens?.length || 0} itens
                            </span>
                          </div>
                          <div className="p-0">
                            {!amb.itens || amb.itens.length === 0 ? (
                              <div className="p-4 text-sm text-slate-500 text-center">
                                Sem itens neste ambiente
                              </div>
                            ) : (
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 border-b">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-medium">Item</th>
                                    <th className="px-4 py-2 text-right font-medium">Qtd</th>
                                    <th className="px-4 py-2 text-right font-medium">Custo Un.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {amb.itens.map((it: any) => (
                                    <tr
                                      key={it.id}
                                      className="border-b last:border-0 hover:bg-slate-50"
                                    >
                                      <td className="px-4 py-2 truncate max-w-[200px]">
                                        {it.nome_item}
                                      </td>
                                      <td className="px-4 py-2 text-right">{it.quantidade}</td>
                                      <td className="px-4 py-2 text-right">
                                        {new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        }).format(it.custo_unitario)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="xl:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Importação OCR</CardTitle>
                </CardHeader>
                <CardContent>
                  <OcrUploadZone onSuccess={handleOcrSuccess} label="Importar PDF ou Imagem" />
                  <p className="text-xs text-slate-500 mt-4">
                    Arraste um PDF ou Planilha do Promob/CorteCloud para extrair os itens e custos
                    automaticamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              <p>
                Salve o orçamento inicial no botão "Salvar Orçamento" acima para liberar a
                importação de itens por OCR e ambientes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
