import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Briefcase, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { DocumentosAba } from './DocumentosAba'
import { Textarea } from '@/components/ui/textarea'

export function PastaPJ({ id }: { id: string | null }) {
  const [f, setF] = useState<any>({})
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (id) {
      supabase
        .from('parceiros_pj')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => {
          if (data) setF(data)
        })
    }
  }, [id])

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
      const { data: inserted, error } = await supabase
        .from('parceiros_pj')
        .insert(data)
        .select()
        .single()
      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' })
        return
      }
      toast({ title: 'Parceiro salvo com sucesso!' })
      navigate(`/gestao-pessoas/pj/${inserted.id}`, { replace: true })
      return
    }

    toast({ title: 'Parceiro salvo com sucesso!' })
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
            <h1 className="text-3xl font-bold">{id ? f.razao_social : 'Novo Parceiro PJ'}</h1>
            <p className="text-pale-cornflower mt-1">
              {id
                ? 'Gerencie dados, documentos e assinaturas do parceiro'
                : 'Preencha os dados iniciais do parceiro'}
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
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Informações da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
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
                  <Label>Telefone</Label>
                  <Input
                    value={f.telefone || ''}
                    onChange={(e) => setF({ ...f, telefone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
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
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">
                Dados do Sócio Administrador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="bg-amber-500/10 p-6 rounded-xl border border-amber-500/20">
                <Label className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Ajuda de Custo Mensal (R$)
                </Label>
                <div className="mt-4">
                  <Input
                    type="number"
                    step="0.01"
                    className="bg-white text-lg font-semibold"
                    value={f.ajuda_custo || ''}
                    onChange={(e) => setF({ ...f, ajuda_custo: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/20">
                <Label className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  Comissões Acordadas (%)
                </Label>
                <div className="mt-4">
                  <Input
                    type="number"
                    step="0.01"
                    className="bg-white text-lg font-semibold"
                    value={f.comissoes || ''}
                    onChange={(e) => setF({ ...f, comissoes: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Observações</h3>
              <div className="grid grid-cols-1">
                <Textarea
                  value={f.observacoes || ''}
                  onChange={(e) => setF({ ...f, observacoes: e.target.value })}
                  placeholder="Adicione observações, anotações ou detalhes importantes sobre o parceiro..."
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
                  entityType="pj"
                  entityNome={f.razao_social}
                  entityEmail={f.email}
                  entityCpf={f.cnpj || f.socio_cpf}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}
