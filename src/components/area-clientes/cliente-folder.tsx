import { useEffect, useState } from 'react'
import { ArrowLeft, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Timeline } from './timeline'
import { DocumentRow } from './document-row'

export function ClienteFolder({ formId, onBack }: { formId: string; onBack: () => void }) {
  const [form, setForm] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const { data: formData } = await supabase
          .from('formulario_comercial')
          .select('*, cliente:clientes(*)')
          .eq('id', formId)
          .single()

        if (formData) {
          const uid = formData.usuario_id || formData.user_id
          let vendedor = 'Vendedor não definido'
          if (uid) {
            const { data: uData } = await supabase
              .from('users')
              .select('nome')
              .eq('id', uid)
              .single()
            if (uData?.nome) vendedor = uData.nome
          }
          formData.vendedorNome = vendedor

          const dossierId = formData.cliente?.nome || formData.cliente_id || formId
          const { data: storageFiles } = await supabase.storage.from('dossiers').list(dossierId)

          if (storageFiles && storageFiles.length > 0) {
            setFiles(
              storageFiles
                .filter((f) => f.name !== '.emptyFolderPlaceholder')
                .map((f) => ({
                  id: f.id,
                  title: f.name,
                  actions: ['ler', 'baixar', 'enviar'],
                  path: `${dossierId}/${f.name}`,
                })),
            )
          }
          setForm(formData)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [formId])

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando dados reais do banco...
      </div>
    )
  if (!form)
    return (
      <div className="p-8 text-center text-destructive">
        Formulário não encontrado ou sem permissão.
      </div>
    )

  let produtos = form.produtos_servicos || []
  if (typeof produtos === 'string') {
    try {
      produtos = JSON.parse(produtos)
    } catch (e) {
      produtos = []
    }
  }

  const valorTotal = Array.isArray(produtos)
    ? produtos.reduce(
        (acc: number, p: any) =>
          acc + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
        0,
      )
    : 0

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorTotal - (Number(form.desconto) || 0))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {form.cliente?.nome || 'Cliente não identificado'}
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Vendedor: <span className="text-foreground">{form.vendedorNome}</span> | Valor do
            Projeto: <span className="text-foreground">{valorFormatado}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-5 rounded-lg border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-card-foreground">
              <Folder className="w-5 h-5 text-primary" /> Arquivos do Dossiê
            </h2>
            <div className="space-y-3">
              {files.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-md border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">
                    Nenhum documento gerado ou enviado ainda no Storage.
                  </p>
                </div>
              ) : (
                files.map((f) => <DocumentRow key={f.id} doc={f} />)
              )}
            </div>
          </div>
        </div>
        <div>
          <Timeline clienteId={form.cliente?.id} />
        </div>
      </div>
    </div>
  )
}
