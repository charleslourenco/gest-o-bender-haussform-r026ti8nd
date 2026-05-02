import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileEdit,
  Trash2,
  Search,
  PlusCircle,
  FileText,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { TemplateModal } from './TemplateModal'

export function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('templates').select('*').order('criado_em', { ascending: false })
      if (search) query = query.ilike('nome', `%${search}%`)
      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr
      setTemplates(data || [])
    } catch (err: any) {
      setError('Erro ao carregar templates.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (t: any) => {
    if (confirm('Tem certeza que deseja deletar este template?')) {
      try {
        if (t.arquivo_url && !t.arquivo_url.startsWith('http')) {
          await supabase.storage.from('templates').remove([t.arquivo_url])
        } else if (t.arquivo_url && t.arquivo_url.startsWith('http')) {
          const urlParts = t.arquivo_url.split('/storage/v1/object/public/templates/')
          if (urlParts.length > 1) {
            await supabase.storage.from('templates').remove([urlParts[1]])
          }
        }
        const { error: delErr } = await supabase.from('templates').delete().eq('id', t.id)
        if (delErr) throw delErr
        toast.success('Template deletado com sucesso!')
        fetchTemplates()
      } catch (err: any) {
        toast.error('Erro ao deletar template.')
      }
    }
  }

  const formatTipo = (tipo: string) => {
    switch (tipo) {
      case 'contrato':
        return 'Contrato'
      case 'termo_conclusao':
        return 'Termo de Conclusão'
      case 'termo_garantia':
        return 'Termo de Garantia'
      default:
        return tipo
    }
  }

  return (
    <div className="bg-pale-cornflower text-midnight-navy p-6 space-y-6 rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-midnight-navy/60" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-steel-blue/30 text-midnight-navy placeholder:text-midnight-navy/50"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(null)
            setModalOpen(true)
          }}
          className="w-full sm:w-auto bg-steel-blue text-off-white hover:bg-steel-blue/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Template
        </Button>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full bg-white/50 rounded-lg" />
            <Skeleton className="h-12 w-full bg-white/50 rounded-lg" />
            <Skeleton className="h-12 w-full bg-white/50 rounded-lg" />
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-white/50 border border-steel-blue border-dashed rounded-lg">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-midnight-navy mb-2">{error}</h3>
            <Button
              onClick={fetchTemplates}
              className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-white/50 border border-steel-blue border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-steel-blue mb-4" />
            <h3 className="text-lg font-medium text-midnight-navy mb-2">
              Nenhum template encontrado
            </h3>
            <p className="text-midnight-navy/70 mb-6 text-sm">
              Clique em 'Adicionar Template' para começar.
            </p>
            <Button
              className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
              onClick={() => {
                setSelectedTemplate(null)
                setModalOpen(true)
              }}
            >
              Adicionar Template
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-steel-blue rounded-lg bg-white">
            <Table className="min-w-[800px] w-full">
              <TableHeader className="bg-steel-blue/10">
                <TableRow className="hover:bg-transparent border-steel-blue">
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy">Nome</TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy">Tipo</TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy">
                    Data de Criação
                  </TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow
                    key={t.id}
                    className="border-b border-steel-blue/20 hover:bg-steel-blue/5 transition-colors"
                  >
                    <TableCell className="font-medium p-4 text-sm">{t.nome}</TableCell>
                    <TableCell className="p-4 text-sm">
                      <span className="px-2 py-1 bg-pale-cornflower text-midnight-navy rounded-md text-xs font-medium border border-steel-blue/30">
                        {formatTipo(t.tipo)}
                      </span>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-midnight-navy/80">
                      {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-steel-blue hover:text-midnight-navy hover:bg-pale-cornflower"
                          onClick={() => {
                            setSelectedTemplate(t)
                            setModalOpen(true)
                          }}
                          title="Editar"
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(t)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {modalOpen && (
        <TemplateModal
          template={selectedTemplate}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            fetchTemplates()
          }}
        />
      )}
    </div>
  )
}
