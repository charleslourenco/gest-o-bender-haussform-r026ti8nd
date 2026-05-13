import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DocumentosAba } from './DocumentosAba'
import { useToast } from '@/hooks/use-toast'

interface Props {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  id: string | null
  onSaved: () => void
}

export function SheetCLT({ isOpen, onOpenChange, id, onSaved }: Props) {
  const [f, setF] = useState<any>({})
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      if (id) {
        supabase
          .from('equipe_clt')
          .select('*')
          .eq('id', id)
          .single()
          .then(({ data }) => {
            if (data) setF(data)
          })
      } else {
        setF({ ferias_adiantadas_dias: 0 })
      }
    }
  }, [isOpen, id])

  const handleSave = async () => {
    if (!f.nome_completo) {
      toast({ title: 'O nome completo é obrigatório', variant: 'destructive' })
      return
    }

    const data = { ...f }
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
      const { error } = await supabase.from('equipe_clt').insert(data)
      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' })
        return
      }
    }

    toast({ title: 'Colaborador salvo com sucesso!' })
    onSaved()
    onOpenChange(false)
  }

  const calcularFerias = () => {
    if (!f.data_admissao) return 0
    const admissao = new Date(f.data_admissao)
    const hoje = new Date()
    const diffTime = Math.abs(hoje.getTime() - admissao.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const diasDireito = Math.floor((diffDays / 365) * 30)
    return Math.max(0, diasDireito - (f.ferias_adiantadas_dias || 0))
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{id ? 'Editar Colaborador CLT' : 'Novo Colaborador CLT'}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="dados" className="mt-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
            <TabsTrigger value="docs" disabled={!id}>
              Documentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={f.nome_completo || ''}
                  onChange={(e) => setF({ ...f, nome_completo: e.target.value })}
                />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={f.rg || ''} onChange={(e) => setF({ ...f, rg: e.target.value })} />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={f.cpf || ''} onChange={(e) => setF({ ...f, cpf: e.target.value })} />
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
                <Input value={f.pis || ''} onChange={(e) => setF({ ...f, pis: e.target.value })} />
              </div>
              <div>
                <Label>Nº CNH</Label>
                <Input value={f.cnh || ''} onChange={(e) => setF({ ...f, cnh: e.target.value })} />
              </div>
              <div>
                <Label>Categoria CNH</Label>
                <Input
                  value={f.cnh_categoria || ''}
                  onChange={(e) => setF({ ...f, cnh_categoria: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={f.telefone || ''}
                  onChange={(e) => setF({ ...f, telefone: e.target.value })}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={f.email || ''}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </div>

              <div className="col-span-2 border-b border-border my-2"></div>

              <div className="col-span-2 font-semibold text-sm">Endereço</div>
              <div>
                <Label>CEP</Label>
                <Input value={f.cep || ''} onChange={(e) => setF({ ...f, cep: e.target.value })} />
              </div>
              <div>
                <Label>Rua</Label>
                <Input value={f.rua || ''} onChange={(e) => setF({ ...f, rua: e.target.value })} />
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
                <Label>Município / UF</Label>
                <div className="flex gap-2">
                  <Input
                    value={f.municipio || ''}
                    onChange={(e) => setF({ ...f, municipio: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    value={f.estado || ''}
                    onChange={(e) => setF({ ...f, estado: e.target.value })}
                    className="w-16"
                    maxLength={2}
                    placeholder="UF"
                  />
                </div>
              </div>

              <div className="col-span-2 border-b border-border my-2"></div>

              <div className="col-span-2 font-semibold text-sm">Dados Financeiros & Ponto</div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Salário Base (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={f.salario_base || ''}
                  onChange={(e) => setF({ ...f, salario_base: e.target.value })}
                />
              </div>

              <div className="col-span-2 bg-emerald-500/10 p-4 rounded-lg flex items-center justify-between border border-emerald-500/20">
                <div>
                  <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Férias
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimativa de saldo com base na admissão:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400 text-lg ml-1">
                      {calcularFerias()} dias
                    </strong>
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Label className="text-xs">Dias adiantados</Label>
                  <Input
                    type="number"
                    className="w-20 h-8 text-center"
                    value={f.ferias_adiantadas_dias ?? 0}
                    onChange={(e) =>
                      setF({ ...f, ferias_adiantadas_dias: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-6">
              <Button onClick={handleSave} className="w-full sm:w-auto">
                Salvar Alterações
              </Button>
            </div>
          </TabsContent>

          {id && (
            <TabsContent value="docs">
              <DocumentosAba entityId={id} entityType="clt" />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
