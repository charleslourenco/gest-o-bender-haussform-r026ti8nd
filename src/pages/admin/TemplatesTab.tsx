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
      toast.success('Template deletado com sucesso!', {
        style: { background: '#1A3D63', color: '#F6FAFD' },
      })
      fetchTemplates()
    }
  }

  const paginatedTemplates = templates.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(templates.length / itemsPerPage)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-bender-steel" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bender-pale border-bender-steel text-bender-navy pl-9 focus-visible:ring-bender-denim"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(null)
            setModalOpen(true)
          }}
          className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Template
        </Button>
      </div>

      <div className="bg-bender-offwhite rounded-lg border border-bender-steel overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full bg-bender-pale" />
            <Skeleton className="h-10 w-full bg-bender-pale" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <FileText className="h-16 w-16 text-bender-steel mb-4" />
            <h3 className="text-xl font-bold text-bender-navy mb-2">Nenhum template cadastrado</h3>
            <p className="text-bender-navy mb-6">Clique em 'Adicionar Template' para começar.</p>
            <Button
              onClick={() => {
                setSelectedTemplate(null)
                setModalOpen(true)
              }}
              className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90"
            >
              Adicionar Template
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-bender-denim">
                <TableRow className="border-bender-steel">
                  <TableHead className="text-bender-offwhite font-bold">Nome</TableHead>
                  <TableHead className="text-bender-offwhite font-bold">Tipo</TableHead>
                  <TableHead className="text-bender-offwhite font-bold">Data de Criação</TableHead>
                  <TableHead className="text-bender-offwhite font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTemplates.map((t, idx) => (
                  <TableRow
                    key={t.id}
                    className={`border-bender-steel ${idx % 2 === 0 ? 'bg-bender-offwhite' : 'bg-bender-pale'}`}
                  >
                    <TableCell className="text-bender-navy font-medium">{t.nome}</TableCell>
                    <TableCell className="text-bender-navy">{t.tipo}</TableCell>
                    <TableCell className="text-bender-navy">
                      {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale"
                          onClick={() => window.open(t.arquivo_url)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale"
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
                          className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale"
                          onClick={() => handleDelete(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t border-bender-steel flex items-center justify-between">
              <span className="text-bender-navy text-sm">
                Página {page} de {totalPages || 1}
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90"
                >
                  Anterior
                </Button>
                <Button
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
                  className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90"
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
