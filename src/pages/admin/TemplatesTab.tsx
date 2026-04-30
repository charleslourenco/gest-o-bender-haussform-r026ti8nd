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
  Download,
  Search,
  PlusCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react'
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
        style: { background: '#B3CFE5', color: '#1A3D63', border: 'none' },
        icon: <CheckCircle2 className="text-green-600 h-5 w-5" />,
      })
      fetchTemplates()
    }
  }

  const paginatedTemplates = templates.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = Math.ceil(templates.length / itemsPerPage)

  return (
    <div className="bg-bender-offwhite p-6 space-y-6 rounded-b-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-bender-steel" />
          <Input
            placeholder="Buscar template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] pl-10 focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-bender-denim transition-all"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(null)
            setModalOpen(true)
          }}
          className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 px-6 py-3 min-h-[44px] rounded-lg w-full sm:w-auto text-base font-semibold"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Adicionar Template
        </Button>
      </div>

      <div className="w-full">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full bg-bender-pale rounded-lg" />
            <Skeleton className="h-12 w-full bg-bender-pale rounded-lg" />
            <Skeleton className="h-12 w-full bg-bender-pale rounded-lg" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-bender-offwhite border-2 border-bender-steel/20 rounded-lg">
            <FileText className="h-16 w-16 text-bender-steel mb-4" />
            <h3 className="text-[24px] font-bold text-bender-navy mb-2">
              Nenhum template cadastrado
            </h3>
            <p className="text-bender-navy mb-6 text-base">
              Clique em 'Adicionar Template' para começar.
            </p>
            <Button
              onClick={() => {
                setSelectedTemplate(null)
                setModalOpen(true)
              }}
              className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 px-6 py-3 min-h-[44px] rounded-lg text-base font-semibold"
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
                  className="bg-bender-offwhite border-2 border-bender-steel/20 p-4 rounded-lg flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-bender-navy font-bold text-base">{t.nome}</span>
                    <span className="text-bender-navy text-sm font-semibold px-2 py-1 bg-bender-pale rounded-md border border-bender-steel/30">
                      {t.tipo}
                    </span>
                  </div>
                  <div className="text-bender-navy text-sm">
                    Criado em: {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex justify-end gap-2 mt-2 pt-4 border-t-2 border-bender-steel/20">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale/50 min-h-[44px] min-w-[44px]"
                      onClick={() => window.open(t.arquivo_url)}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale/50 min-h-[44px] min-w-[44px]"
                      onClick={() => {
                        setSelectedTemplate(t)
                        setModalOpen(true)
                      }}
                    >
                      <FileEdit className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale/50 min-h-[44px] min-w-[44px]"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border-2 border-bender-steel/20 rounded-lg">
              <Table className="min-w-[800px] w-full">
                <TableHeader className="bg-bender-denim">
                  <TableRow className="border-b-0 hover:bg-transparent">
                    <TableHead className="text-bender-offwhite font-bold p-4 text-base">
                      Nome
                    </TableHead>
                    <TableHead className="text-bender-offwhite font-bold p-4 text-base">
                      Tipo
                    </TableHead>
                    <TableHead className="text-bender-offwhite font-bold p-4 text-base">
                      Data de Criação
                    </TableHead>
                    <TableHead className="text-bender-offwhite font-bold p-4 text-base text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTemplates.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-b border-bender-steel/20 even:bg-bender-pale/30 odd:bg-bender-offwhite hover:bg-bender-pale/50 transition-colors"
                    >
                      <TableCell className="text-bender-navy font-semibold p-4 text-base">
                        {t.nome}
                      </TableCell>
                      <TableCell className="text-bender-navy p-4 text-base">{t.tipo}</TableCell>
                      <TableCell className="text-bender-navy p-4 text-base">
                        {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale/50 min-h-[44px] min-w-[44px]"
                            onClick={() => window.open(t.arquivo_url)}
                            title="Download"
                          >
                            <Download className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale/50 min-h-[44px] min-w-[44px]"
                            onClick={() => {
                              setSelectedTemplate(t)
                              setModalOpen(true)
                            }}
                            title="Editar"
                          >
                            <FileEdit className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-bender-steel hover:text-bender-denim hover:bg-bender-pale/50 min-h-[44px] min-w-[44px]"
                            onClick={() => handleDelete(t.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-bender-navy font-semibold text-sm">
                Página {page} de {totalPages || 1}
              </span>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90 min-h-[44px] px-6 py-3 rounded-lg flex-1 sm:flex-none font-semibold"
                >
                  Anterior
                </Button>
                <Button
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
                  className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90 min-h-[44px] px-6 py-3 rounded-lg flex-1 sm:flex-none font-semibold"
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
