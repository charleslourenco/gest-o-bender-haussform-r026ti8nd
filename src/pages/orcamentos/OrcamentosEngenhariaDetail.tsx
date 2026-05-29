import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OcrUploadZone } from '@/components/OcrUploadZone'
import { Loader2, Plus, ArrowLeft, Trash2, Save } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [orcamento, setOrcamento] = useState<any>(null)
  const [ambientes, setAmbientes] = useState<any[]>([])

  const [isAddAmbModalOpen, setIsAddAmbModalOpen] = useState(false)
  const [newAmbNome, setNewAmbNome] = useState('')

  useEffect(() => {
    async function load() {
      if (!id || id === 'novo') {
        const { data: userSession } = await supabase.auth.getSession()
        const userId = userSession.session?.user?.id

        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .insert({
            nome: 'Novo Orçamento',
            status: 'Rascunho',
            cliente_nome_manual: '',
            modo_pagamento: 'vista',
            usuario_id: userId,
          })
          .select()
          .single()

        if (error) {
          toast.error('Erro ao criar rascunho: ' + error.message)
          setLoading(false)
          return
        }

        navigate(`/orcamentos/${data.id}`, { replace: true })
        return
      }

      const { data, error } = await supabase
        .from('orcamentos_engenharia')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        toast.error('Orçamento não encontrado')
        navigate('/orcamentos')
        return
      }

      setOrcamento(data)
      await loadAmbientes(id)
      setLoading(false)
    }
    load()
  }, [id, navigate])

  async function loadAmbientes(orcId: string) {
    const { data, error } = await supabase
      .from('orcamentos_ambientes')
      .select('*, orcamentos_itens(*)')
      .eq('orcamento_id', orcId)
      .order('criado_em', { ascending: true })

    if (data && !error) {
      setAmbientes(data)
    }
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('orcamentos_engenharia')
      .update({
        nome: orcamento.nome,
        cliente_nome_manual: orcamento.cliente_nome_manual,
        modo_pagamento: orcamento.modo_pagamento,
        markup_divisor_vista: orcamento.markup_divisor_vista,
        markup_divisor_normal: orcamento.markup_divisor_normal,
      })
      .eq('id', orcamento.id)

    setSaving(false)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Orçamento salvo com sucesso')
    }
  }

  async function handleOcrSuccess(data: any, fileUrl: string) {
    if (!orcamento) return

    const ambName = data.ambiente || 'Ambiente Importado'
    const { data: newAmb, error: ambError } = await supabase
      .from('orcamentos_ambientes')
      .insert({
        orcamento_id: orcamento.id,
        nome: ambName,
        descricao_comercial: data.descricao || '',
      })
      .select()
      .single()

    if (ambError) {
      toast.error('Erro ao criar ambiente do OCR: ' + ambError.message)
      return
    }

    if (data.itens && data.itens.length > 0) {
      const itensToInsert = data.itens.map((it: any) => ({
        ambiente_id: newAmb.id,
        nome_item: it.nome_item || 'Item sem nome',
        quantidade: it.quantidade || 1,
        custo_unitario: it.custo_unitario || 0,
        unidade_medida: 'un',
        markup:
          orcamento.modo_pagamento === 'vista'
            ? orcamento.markup_divisor_vista
            : orcamento.markup_divisor_normal,
        markup_manual: false,
      }))

      const { error: itemsError } = await supabase.from('orcamentos_itens').insert(itensToInsert)
      if (itemsError) {
        toast.error('Erro ao inserir itens do OCR')
      } else {
        toast.success(`Foram importados ${itensToInsert.length} itens para o ambiente ${ambName}`)
      }
    }

    if (data.cliente && !orcamento.cliente_nome_manual) {
      setOrcamento((prev: any) => ({ ...prev, cliente_nome_manual: data.cliente }))
      await supabase
        .from('orcamentos_engenharia')
        .update({ cliente_nome_manual: data.cliente })
        .eq('id', orcamento.id)
    }

    await loadAmbientes(orcamento.id)
  }

  async function handleAddAmbiente() {
    if (!newAmbNome.trim()) return
    const { error } = await supabase.from('orcamentos_ambientes').insert({
      orcamento_id: orcamento.id,
      nome: newAmbNome,
    })

    if (error) {
      toast.error('Erro ao criar ambiente')
    } else {
      toast.success('Ambiente criado!')
      setNewAmbNome('')
      setIsAddAmbModalOpen(false)
      await loadAmbientes(orcamento.id)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50 overflow-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Detalhes do Orçamento</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="ambientes">Ambientes e Itens</TabsTrigger>
          <TabsTrigger value="importacao">Importação (OCR)</TabsTrigger>
          <TabsTrigger value="markup">Configuração de Markup</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Principais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Orçamento</Label>
                  <Input
                    value={orcamento?.nome || ''}
                    onChange={(e) => setOrcamento({ ...orcamento, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome do Cliente/Projeto</Label>
                  <Input
                    value={orcamento?.cliente_nome_manual || ''}
                    onChange={(e) =>
                      setOrcamento({ ...orcamento, cliente_nome_manual: e.target.value })
                    }
                    placeholder="Digite o nome do cliente ou projeto..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modo de Pagamento</Label>
                  <Select
                    value={orcamento?.modo_pagamento || 'vista'}
                    onValueChange={(val) => setOrcamento({ ...orcamento, modo_pagamento: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vista">À Vista</SelectItem>
                      <SelectItem value="prazo">A Prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ambientes" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Ambientes</h2>
            <Button onClick={() => setIsAddAmbModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Ambiente
            </Button>
          </div>

          {ambientes.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-xl border border-dashed text-gray-500">
              Nenhum ambiente adicionado. Clique no botão acima para adicionar ou use a Importação
              via OCR.
            </div>
          ) : (
            <div className="space-y-4">
              {ambientes.map((amb) => (
                <Card key={amb.id}>
                  <CardHeader className="py-4 border-b bg-gray-50 flex flex-row items-center justify-between">
                    <CardTitle className="text-md">{amb.nome}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={async () => {
                        await supabase.from('orcamentos_ambientes').delete().eq('id', amb.id)
                        loadAmbientes(orcamento.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {amb.orcamentos_itens?.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-4 py-2 text-left">Item</th>
                            <th className="px-4 py-2 text-right">Qtd</th>
                            <th className="px-4 py-2 text-right">Custo Un.</th>
                            <th className="px-4 py-2 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {amb.orcamentos_itens.map((it: any) => (
                            <tr key={it.id}>
                              <td className="px-4 py-3">{it.nome_item}</td>
                              <td className="px-4 py-3 text-right">{it.quantidade}</td>
                              <td className="px-4 py-3 text-right">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(it.custo_unitario)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500"
                                  onClick={async () => {
                                    await supabase.from('orcamentos_itens').delete().eq('id', it.id)
                                    loadAmbientes(orcamento.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Sem itens neste ambiente.
                      </div>
                    )}
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nome = window.prompt('Nome do Item:')
                          if (nome) {
                            supabase
                              .from('orcamentos_itens')
                              .insert({
                                ambiente_id: amb.id,
                                nome_item: nome,
                                quantidade: 1,
                                custo_unitario: 0,
                                unidade_medida: 'un',
                                markup:
                                  orcamento.modo_pagamento === 'vista'
                                    ? orcamento.markup_divisor_vista
                                    : orcamento.markup_divisor_normal,
                                markup_manual: false,
                              })
                              .then(() => loadAmbientes(orcamento.id))
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item Manual
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="importacao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Orçamento / Lista (OCR)</CardTitle>
            </CardHeader>
            <CardContent>
              <OcrUploadZone
                onSuccess={handleOcrSuccess}
                label="Arraste seu PDF ou imagem do projeto"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markup" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Markup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Markup À Vista (Divisor)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orcamento?.markup_divisor_vista || 0}
                    onChange={(e) =>
                      setOrcamento({
                        ...orcamento,
                        markup_divisor_vista: parseFloat(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">Ex: 0.40</p>
                </div>
                <div className="space-y-2">
                  <Label>Markup A Prazo (Divisor)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orcamento?.markup_divisor_normal || 0}
                    onChange={(e) =>
                      setOrcamento({
                        ...orcamento,
                        markup_divisor_normal: parseFloat(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">Ex: 0.35</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddAmbModalOpen} onOpenChange={setIsAddAmbModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Ambiente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Ambiente</Label>
              <Input
                value={newAmbNome}
                onChange={(e) => setNewAmbNome(e.target.value)}
                placeholder="Ex: Cozinha, Quarto Casal..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAmbiente()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAmbModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddAmbiente}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
