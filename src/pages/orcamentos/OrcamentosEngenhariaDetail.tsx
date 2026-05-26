import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [orcamento, setOrcamento] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [nome, setNome] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState('vista')

  const [globalVista, setGlobalVista] = useState(0.4)
  const [globalPrazo, setGlobalPrazo] = useState(0.35)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)

    const { data: config } = await supabase.from('configuracoes_sistema').select('*').single()
    if (config) {
      setGlobalVista(config.markup_vista)
      setGlobalPrazo(config.markup_prazo)
    }

    const { data: orc } = await supabase
      .from('orcamentos_engenharia')
      .select('*')
      .eq('id', id)
      .single()
    if (orc) {
      setOrcamento(orc)
      setNome(orc.nome)
      if (orc.markup_global === config?.markup_prazo) {
        setTipoPagamento('prazo')
      } else {
        setTipoPagamento('vista')
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const activeDivisor = tipoPagamento === 'vista' ? globalVista : globalPrazo

    const { error } = await supabase
      .from('orcamentos_engenharia')
      .update({
        nome,
        markup_global: activeDivisor,
        markup_divisor_vista: globalVista,
        markup_divisor_normal: globalPrazo,
      })
      .eq('id', id)

    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Orçamento atualizado com sucesso!' })
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando orçamento...
      </div>
    )
  if (!orcamento)
    return <div className="p-8 text-center text-destructive">Orçamento não encontrado.</div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">{nome || 'Orçamento'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
          <TabsTrigger value="itens">Itens & Ambientes</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Principais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-2xl">
                <Label>Nome do Projeto / Orçamento</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>

              <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border max-w-2xl">
                <Label className="text-base">Modelo de Precificação</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Selecione o modelo de pagamento. Isso aplicará o divisor de markup global
                  configurado pelos administradores.
                </p>
                <RadioGroup
                  value={tipoPagamento}
                  onValueChange={setTipoPagamento}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vista" id="r1" />
                    <Label htmlFor="r1" className="cursor-pointer font-medium">
                      À Vista (Divisor aplicado: {Number(globalVista).toFixed(5)})
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prazo" id="r2" />
                    <Label htmlFor="r2" className="cursor-pointer font-medium">
                      A Prazo (Divisor aplicado: {Number(globalPrazo).toFixed(5)})
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itens">
          <Card>
            <CardHeader>
              <CardTitle>Itens do Orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Os itens deste orçamento utilizam o markup global (
                {Number(tipoPagamento === 'vista' ? globalVista : globalPrazo).toFixed(5)})
                selecionado na aba Dados Gerais para calcular o preço final de venda.
              </p>
              <div className="mt-8 text-center p-8 bg-muted/20 border border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Gerenciamento de ambientes e itens será disponibilizado na próxima etapa.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
