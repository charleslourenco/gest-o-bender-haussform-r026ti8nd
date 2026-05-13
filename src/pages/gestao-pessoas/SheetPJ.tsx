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

export function SheetPJ({ isOpen, onOpenChange, id, onSaved }: Props) {
  const [f, setF] = useState<any>({})
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      if (id) {
        supabase
          .from('parceiros_pj')
          .select('*')
          .eq('id', id)
          .single()
          .then(({ data }) => {
            if (data) setF(data)
          })
      } else {
        setF({})
      }
    }
  }, [isOpen, id])

  const handleSave = async () => {
    if (!f.razao_social) {
      toast({ title: 'A Razão Social é obrigatória', variant: 'destructive' })
      return
    }

    const data = { ...f }
    if (!data.socio_data_nascimento) data.socio_data_nascimento = null
    if (!data.ajuda_custo) data.ajuda_custo = null
    if (!data.comissoes) data.comissoes = null

    if (id) {
      const { error } = await supabase.from('parceiros_pj').update(data).eq('id', id)
      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
        return
      }
    } else {
      const { error } = await supabase.from('parceiros_pj').insert(data)
      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' })
        return
      }
    }

    toast({ title: 'Parceiro salvo com sucesso!' })
    onSaved()
    onOpenChange(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{id ? 'Editar Parceiro PJ' : 'Novo Parceiro PJ'}</SheetTitle>
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
                <Label>Razão Social *</Label>
                <Input
                  value={f.razao_social || ''}
                  onChange={(e) => setF({ ...f, razao_social: e.target.value })}
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={f.cnpj || ''}
                  onChange={(e) => setF({ ...f, cnpj: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone (Empresa)</Label>
                <Input
                  value={f.telefone || ''}
                  onChange={(e) => setF({ ...f, telefone: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
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

              <div className="col-span-2 font-semibold text-sm">Dados do Sócio Administrador</div>
              <div className="col-span-2">
                <Label>Nome Completo do Sócio</Label>
                <Input
                  value={f.socio_nome || ''}
                  onChange={(e) => setF({ ...f, socio_nome: e.target.value })}
                />
              </div>
              <div>
                <Label>RG do Sócio</Label>
                <Input
                  value={f.socio_rg || ''}
                  onChange={(e) => setF({ ...f, socio_rg: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF do Sócio</Label>
                <Input
                  value={f.socio_cpf || ''}
                  onChange={(e) => setF({ ...f, socio_cpf: e.target.value })}
                />
              </div>
              <div>
                <Label>Nascimento do Sócio</Label>
                <Input
                  type="date"
                  value={f.socio_data_nascimento || ''}
                  onChange={(e) => setF({ ...f, socio_data_nascimento: e.target.value })}
                />
              </div>

              <div className="col-span-2 border-b border-border my-2"></div>

              <div className="col-span-2 font-semibold text-sm">Acordos Comerciais</div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Ajuda de Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={f.ajuda_custo || ''}
                  onChange={(e) => setF({ ...f, ajuda_custo: e.target.value })}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Label>Comissões (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={f.comissoes || ''}
                  onChange={(e) => setF({ ...f, comissoes: e.target.value })}
                />
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
              <DocumentosAba entityId={id} entityType="pj" />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
