import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Save, Briefcase, FileText, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { DocumentosAba } from './DocumentosAba'
import { Textarea } from '@/components/ui/textarea'

const AREAS_DISPONIVEIS = [
  { id: 'producao', label: 'Produção' },
  { id: 'montagem', label: 'Montagem' },
  { id: 'analise_tecnica', label: 'Análise Técnica' },
] as const

export function PastaCLT({ id }: { id: string | null }) {
  const [f, setF] = useState<any>({
    ferias_adiantadas_dias: 0,
    areas_atuacao: ['producao', 'montagem', 'analise_tecnica'],
  })
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      supabase
        .from('equipe_clt')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) {
            setF({
              ...data,
              areas_atuacao:
                Array.isArray(data.areas_atuacao) && data.areas_atuacao.length > 0
                  ? data.areas_atuacao
                  : ['producao', 'montagem', 'analise_tecnica'],
            })
          }
        })
    }
  }, [id])

  const handleSave = async () => {
    if (!f.nome_completo) {
      toast({ title: 'O nome completo é obrigatório', variant: 'destructive' })
      return
    }

    const areas = Array.isArray(f.areas_atuacao) ? f.areas_atuacao : []
    if (areas.length === 0) {
      toast({
        title: 'Áreas de atuação obrigatórias',
        description:
          'Selecione pelo menos 1 área de atuação (Produção, Montagem ou Análise Técnica).',
        variant: 'destructive',
      })
      return
    }

    const data = { ...f, areas_atuacao: areas }
    if (!data.data_nascimento) data.data_nascimento = null
    if (!data.data_admissao) data.data_admissao = null
    if (!data.salario_base) data.salario_base = null

    if (id) {
      const { error } = await supabase.from('equipe_clt').update(data).eq('id', id)
      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
        return
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('equipe_clt')
        .insert(data)
        .select()
        .single()
      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' })
        return
      }
      toast({ title: 'Colaborador salvo com sucesso!' })
      navigate(`/gestao-pessoas/clt/${inserted.id}`, { replace: true })
      return
    }

    toast({ title: 'Colaborador salvo com sucesso!' })
  }

  const calcularFerias = () => {
    if (!f.data_admissao) return 0
    const admissao = new Date(f.data_admissao)
    const hoje = new Date()
    const diffTime = hoje.getTime() - admissao.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diasDireito = Math.floor((diffDays / 365) * 30)
    return Math.max(0, diasDireito - (f.ferias_adiantadas_dias || 0))
  }

  const tempoServico = () => {
    if (!f.data_admissao) return '-'
    const admissao = new Date(f.data_admissao)
    const hoje = new Date()
    const diffTime = hoje.getTime() - admissao.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const years = Math.floor(diffDays / 365)
    const months = Math.floor((diffDays % 365) / 30)
    return `${years} anos e ${months} meses`
  }

  return (
    <div className="flex flex-col h-full bg-off-white min-h-screen">
      <div className="bg-midnight-navy px-6 py-8 text-white flex flex-col gap-4 shadow-md">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 hover:bg-white/10"
            onClick={() => navigate('/gestao-pessoas')}
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
          </Button>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">{id ? f.nome_completo : 'Novo Colaborador CLT'}</h1>
            <p className="text-pale-cornflower mt-1">
              {id
                ? 'Gerencie dados, documentos e assinaturas do colaborador'
                : 'Preencha os dados iniciais do colaborador'}
            </p>
          </div>
          <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Save className="w-4 h-4 mr-2" /> Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="dados" className="flex flex-col h-full">
          <TabsList className="w-fit mb-6">
            <TabsTrigger value="dados" className="gap-2">
              <Briefcase className="w-4 h-4" /> Dados Cadastrais
            </TabsTrigger>
            <TabsTrigger value="docs" disabled={!id} className="gap-2">
              <FileText className="w-4 h-4" /> Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="dados"
            className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-8 flex-1"
          >
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Informações Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={f.nome_completo || ''}
                    onChange={(e) => setF({ ...f, nome_completo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Nascimento</Label>
                  <Input
                    type="date"
                    value={f.data_nascimento || ''}
                    onChange={(e) => setF({ ...f, data_nascimento: e.target.value })}
                  />
                </div>
                <div>
                  <Label>RG</Label>
                  <Input value={f.rg || ''} onChange={(e) => setF({ ...f, rg: e.target.value })} />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={f.cpf || ''}
                    onChange={(e) => setF({ ...f, cpf: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={f.telefone || ''}
                    onChange={(e) => setF({ ...f, telefone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>E-mail</Label>
                  <Input
                    value={f.email || ''}
                    onChange={(e) => setF({ ...f, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <Label>CEP</Label>
                  <Input
                    value={f.cep || ''}
                    onChange={(e) => setF({ ...f, cep: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Rua</Label>
                  <Input
                    value={f.rua || ''}
                    onChange={(e) => setF({ ...f, rua: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={f.numero || ''}
                    onChange={(e) => setF({ ...f, numero: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input
                    value={f.complemento || ''}
                    onChange={(e) => setF({ ...f, complemento: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={f.bairro || ''}
                    onChange={(e) => setF({ ...f, bairro: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Município</Label>
                  <Input
                    value={f.municipio || ''}
                    onChange={(e) => setF({ ...f, municipio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input
                    value={f.estado || ''}
                    onChange={(e) => setF({ ...f, estado: e.target.value })}
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                Áreas de Atuação *
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Marque onde este profissional pode ser alocado nos fluxos de trabalho (mínimo 1
                área).
              </p>
              <div className="flex flex-wrap items-center gap-6 p-4 rounded-lg bg-muted/40 border border-border">
                {AREAS_DISPONIVEIS.map((area) => {
                  const currentAreas: string[] = Array.isArray(f.areas_atuacao)
                    ? f.areas_atuacao
                    : []
                  const isChecked = currentAreas.includes(area.id)
                  return (
                    <label
                      key={area.id}
                      className="flex items-center space-x-2.5 cursor-pointer text-sm font-medium select-none"
                    >
                      <Checkbox
                        id={`area-clt-${area.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          let next: string[]
                          if (checked) {
                            next = Array.from(new Set([...currentAreas, area.id]))
                          } else {
                            next = currentAreas.filter((a) => a !== area.id)
                          }
                          setF({ ...f, areas_atuacao: next })
                        }}
                      />
                      <span className="text-foreground">{area.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Profissional & Contrato</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <Label>Data Admissão</Label>
                  <Input
                    type="date"
                    value={f.data_admissao || ''}
                    onChange={(e) => setF({ ...f, data_admissao: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nº CTPS</Label>
                  <Input
                    value={f.ctps || ''}
                    onChange={(e) => setF({ ...f, ctps: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nº PIS</Label>
                  <Input
                    value={f.pis || ''}
                    onChange={(e) => setF({ ...f, pis: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Salário Base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={f.salario_base || ''}
                    onChange={(e) => setF({ ...f, salario_base: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nº CNH</Label>
                  <Input
                    value={f.cnh || ''}
                    onChange={(e) => setF({ ...f, cnh: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Categoria CNH</Label>
                  <Input
                    value={f.cnh_categoria || ''}
                    onChange={(e) => setF({ ...f, cnh_categoria: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="bg-emerald-500/10 p-6 rounded-xl border border-emerald-500/20">
                <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Controle de Férias
                </Label>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo estimado de dias:</p>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                      {calcularFerias()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Label className="text-xs">Dias adiantados/gozados</Label>
                    <Input
                      type="number"
                      className="w-24 text-center bg-white"
                      value={f.ferias_adiantadas_dias ?? 0}
                      onChange={(e) =>
                        setF({ ...f, ferias_adiantadas_dias: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/20 flex flex-col justify-center">
                <Label className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  Tempo de Serviço
                </Label>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                    {tempoServico()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Desde a data de admissão</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Observações</h3>
              <div className="grid grid-cols-1">
                <Textarea
                  value={f.observacoes || ''}
                  onChange={(e) => setF({ ...f, observacoes: e.target.value })}
                  placeholder="Adicione observações, anotações ou detalhes importantes sobre o colaborador..."
                  className="min-h-[120px]"
                />
              </div>
            </div>
          </TabsContent>

          {id && (
            <>
              <TabsContent
                value="docs"
                className="bg-card border border-border rounded-xl p-6 shadow-sm flex-1"
              >
                <DocumentosAba
                  entityId={id}
                  entityType="clt"
                  entityNome={f.nome_completo}
                  entityEmail={f.email}
                  entityCpf={f.cpf}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
