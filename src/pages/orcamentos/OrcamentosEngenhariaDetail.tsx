import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const isNew = id === 'novo'
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNomeManual, setClienteNomeManual] = useState('')
  const [status, setStatus] = useState('Rascunho')

  const [clientes, setClientes] = useState<any[]>([])

  useEffect(() => {
    fetchClientes()
    if (!isNew && id) {
      fetchOrcamento(id)
    }
  }, [id, isNew])

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome').order('nome')
    if (data) setClientes(data)
  }

  const fetchOrcamento = async (orcamentoId: string) => {
    try {
      const { data, error } = await supabase
        .from('orcamentos_engenharia')
        .select('*')
        .eq('id', orcamentoId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setNome(data.nome || '')
        if (data.cliente_id) {
          setClienteId(data.cliente_id)
        } else if (data.cliente_nome_manual) {
          setClienteId('manual')
          setClienteNomeManual(data.cliente_nome_manual)
        } else {
          setClienteId(null)
        }
        setStatus(data.status || 'Rascunho')
      } else {
        toast({
          title: 'Não encontrado',
          description: 'Orçamento não encontrado.',
          variant: 'destructive',
        })
        navigate('/orcamentos')
      }
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!nome) {
      toast({
        title: 'Atenção',
        description: 'O nome do orçamento é obrigatório',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        nome,
        cliente_id: clienteId === 'manual' ? null : clienteId,
        cliente_nome_manual: clienteId === 'manual' ? clienteNomeManual : null,
        status,
        atualizado_em: new Date().toISOString(),
      }

      if (isNew) {
        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .insert([payload])
          .select()
          .maybeSingle()
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Orçamento criado com sucesso!' })
        navigate(`/orcamentos/${data?.id}`)
      } else {
        const { error } = await supabase.from('orcamentos_engenharia').update(payload).eq('id', id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Orçamento atualizado com sucesso!' })
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
            onClick={() => navigate('/orcamentos')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-off-white font-bold text-[24px] sm:text-[32px]">
              {isNew ? 'Novo Orçamento' : 'Editar Orçamento'}
            </h1>
            <p className="text-pale-cornflower mt-1">Preencha os dados do orçamento</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-2">
            <Label className="text-midnight-navy font-semibold">Nome do Orçamento</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Projeto Residencial Cozinha"
              className="border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-midnight-navy font-semibold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                placeholder="Ex: João da Silva"
                className="border-gray-300"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
