import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Calculator, Loader2 } from 'lucide-react'

export default function NovoOrcamento() {
  const [nome, setNome] = useState('')
  const [tipoPagamento, setTipoPagamento] = useState('vista')
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<any>(null)

  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    supabase
      .from('configuracoes_sistema')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setConfig(data)
      })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const markupVista = config?.markup_vista ?? 0.4
    const markupPrazo = config?.markup_prazo ?? 0.35
    const divisor = tipoPagamento === 'vista' ? markupVista : markupPrazo

    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .insert({
        nome,
        markup_divisor_vista: markupVista,
        markup_divisor_normal: markupPrazo,
        markup_global: divisor,
        status: 'Rascunho',
      })
      .select()
      .single()

    setLoading(false)
    if (error) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' })
    } else if (data) {
      toast({ title: 'Orçamento criado!' })
      navigate(`/orcamentos/${data.id}`)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Criar Novo Orçamento</h1>
          <p className="text-muted-foreground text-sm">
            Preencha as informações básicas para iniciar a orçamentação.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg">Configuração Inicial</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="space-y-8">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Nome do Projeto / Orçamento <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Cozinha e Sala Apto 101 - Sr. João"
                className="max-w-xl"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Modelo de Precificação</Label>
              </div>
              <CardDescription>
                Selecione a modalidade de pagamento. O sistema aplicará automaticamente o markup
                global configurado pelo administrador.
              </CardDescription>

              <RadioGroup
                value={tipoPagamento}
                onValueChange={setTipoPagamento}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2"
              >
                <Label
                  htmlFor="r1"
                  className={`flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${tipoPagamento === 'vista' ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="vista" id="r1" />
                    <span className="font-semibold text-base">À Vista</span>
                  </div>
                  <span className="text-sm text-muted-foreground pl-6">
                    Aplica o divisor configurado de{' '}
                    <strong className="text-foreground">
                      {config ? Number(config.markup_vista).toFixed(5) : '0.40000'}
                    </strong>
                  </span>
                </Label>

                <Label
                  htmlFor="r2"
                  className={`flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${tipoPagamento === 'prazo' ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="prazo" id="r2" />
                    <span className="font-semibold text-base">A Prazo</span>
                  </div>
                  <span className="text-sm text-muted-foreground pl-6">
                    Aplica o divisor configurado de{' '}
                    <strong className="text-foreground">
                      {config ? Number(config.markup_prazo).toFixed(5) : '0.35000'}
                    </strong>
                  </span>
                </Label>
              </RadioGroup>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/orcamentos')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Criar Orçamento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
