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
import { FileEdit, Trash2, Download, Search, PlusCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { TemplateModal } from './TemplateModal'

export function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates()
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchTemplates = async () => {
    setLoading(true)
    let query = supabase.from('templates').select('*').order('criado_em', { ascending: false })
    if (search) query = query.ilike('nome', `%${search}%`)
    const { data } = await query
    setTemplates(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este template?')) {
      await supabase.from('templates').delete().eq('id', id)
      toast.success('Template deletado com sucesso!')
      fetchTemplates()
    }
  }

  const paginatedTemplates = templates.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(templates.length / itemsPerPage)

  return (
    <div className="bg-card border text-card-foreground p-6 space-y-6 rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(null)
            setModalOpen(true)
          }}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Template
        </Button>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full bg-muted rounded-lg" />
            <Skeleton className="h-12 w-full bg-muted rounded-lg" />
            <Skeleton className="h-12 w-full bg-muted rounded-lg" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-muted/30 border border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum template cadastrado</h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Clique em 'Adicionar Template' para começar.
            </p>
            <Button
              onClick={() => {
                setSelectedTemplate(null)
                setModalOpen(true)
              }}
            >
              Adicionar Template
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 md:hidden gap-4">
              {paginatedTemplates.map((t) => (
                <div
                  key={t.id}
                  className="bg-background border p-4 rounded-lg flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-foreground text-sm">{t.nome}</span>
                    <span className="text-muted-foreground text-xs font-medium px-2 py-1 bg-muted rounded-md border">
                      {t.tipo}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Criado em: {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex justify-end gap-2 mt-2 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(t.arquivo_url)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSelectedTemplate(t)
                        setModalOpen(true)
                      }}
                    >
                      <FileEdit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border rounded-lg bg-background">
              <Table className="min-w-[800px] w-full">
                <TableHeader className="bg-muted">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium p-4 text-sm text-muted-foreground">
                      Nome
                    </TableHead>
                    <TableHead className="font-medium p-4 text-sm text-muted-foreground">
                      Tipo
                    </TableHead>
                    <TableHead className="font-medium p-4 text-sm text-muted-foreground">
                      Data de Criação
                    </TableHead>
                    <TableHead className="font-medium p-4 text-sm text-muted-foreground text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTemplates.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-b hover:bg-muted/50 transition-colors last:border-0"
                    >
                      <TableCell className="font-medium p-4 text-sm">{t.nome}</TableCell>
                      <TableCell className="p-4 text-sm">{t.tipo}</TableCell>
                      <TableCell className="p-4 text-sm text-muted-foreground">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(t.arquivo_url)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDelete(t.id)}
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

            <div className="mt-4 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Página {page} de {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </>
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
