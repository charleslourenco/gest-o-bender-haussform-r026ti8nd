import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, ClipboardList } from 'lucide-react'

export default function NovaListaMateriais() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const isNew = !id || id === 'nova'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const [ambiente, setAmbiente] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState('Rascunho')

  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNomeManual, setClienteNomeManual] = useState('')

  const [clientes, setClientes] = useState<any[]>([])

  useEffect(() => {
    fetchClientes()
    if (!isNew && id) {
      fetchLista(id)
    }
  }, [id, isNew])

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome').order('nome')
    if (data) setClientes(data)
  }

  const fetchLista = async (listaId: string) => {
    try {
      const { data, error } = await supabase
        .from('listas_materiais')
        .select('*')
        .eq('id', listaId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setAmbiente(data.ambiente || '')
        setDescricao(data.descricao || '')
        setStatus(data.status || 'Rascunho')

        if (data.cliente_id) {
          setClienteId(data.cliente_id)
        } else {
          setClienteId('manual')
          if (data.descricao && data.descricao.startsWith('Cliente (Manual):')) {
            const lines = data.descricao.split('\n')
            const nameLine = lines[0].replace('Cliente (Manual): ', '').trim()
            setClienteNomeManual(nameLine)
            setDescricao(lines.slice(1).join('\n'))
          }
        }
      } else {
        toast({
          title: 'Não encontrada',
          description: 'Lista não encontrada.',
          variant: 'destructive',
        })
        navigate('/listas-materiais')
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let finalDescricao = descricao
      if (clienteId === 'manual' && clienteNomeManual) {
        finalDescricao = `Cliente (Manual): ${clienteNomeManual}\n${descricao}`
      }

      const payload = {
        ambiente,
        descricao: finalDescricao,
        cliente_id: clienteId === 'manual' ? null : clienteId,
        status,
        data_atualizacao: new Date().toISOString(),
      }

      if (isNew) {
        const { error } = await supabase.from('listas_materiais').insert([payload])
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Lista criada com sucesso!' })
        navigate('/listas-materiais')
      } else {
        const { error } = await supabase.from('listas_materiais').update(payload).eq('id', id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Lista atualizada com sucesso!' })
      }
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-midnight-navy"></div>
      </div>
    )

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/listas-materiais')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <ClipboardList className="h-10 w-10 text-emerald-400 hidden sm:block" />
          <div>
            <h1 className="text-off-white font-bold text-[24px] sm:text-[32px]">
              {isNew ? 'Nova Lista de Materiais' : 'Editar Lista'}
            </h1>
            <p className="text-pale-cornflower mt-1">Preencha as informações da lista</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Lista'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-2">
            <Label className="text-midnight-navy font-semibold">Ambiente</Label>
            <Input
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
              placeholder="Ex: Cozinha Planejada"
              className="border-gray-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-midnight-navy font-semibold">Cliente</Label>
              <Select value={clienteId || 'manual'} onValueChange={setClienteId}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">-- Digitar nome manualmente --</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {clienteId === 'manual' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label className="text-midnight-navy font-semibold">Nome do Cliente (Manual)</Label>
                <Input
                  value={clienteNomeManual}
                  onChange={(e) => setClienteNomeManual(e.target.value)}
                  placeholder="Nome do cliente"
                  className="border-gray-300"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-midnight-navy font-semibold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Concluída">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-midnight-navy font-semibold">Descrição / Observações</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Observações adicionais..."
              rows={6}
              className="border-gray-300"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
