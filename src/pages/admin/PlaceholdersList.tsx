import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
import { FileEdit, Trash2, Search, PlusCircle, AlertCircle, RefreshCcw, Code } from 'lucide-react'
import { toast } from 'sonner'
import { PlaceholderModal } from './PlaceholderModal'

export function PlaceholdersList() {
  const { user } = useAuth()
  const [placeholders, setPlaceholders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<any>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlaceholders()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPlaceholders = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('placeholders').select('*').order('criado_em', { ascending: false })
      if (search) {
        query = query.or(
          `placeholder.ilike.%${search}%,descricao.ilike.%${search}%,origem.ilike.%${search}%`,
        )
      }
      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr
      setPlaceholders(data || [])
    } catch (err: any) {
      setError('Erro ao carregar placeholders.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (p: any) => {
    if (confirm('Tem certeza que deseja deletar este placeholder?')) {
      try {
        const { error: delErr } = await supabase.from('placeholders').delete().eq('id', p.id)
        if (delErr) throw delErr
        toast.success('Placeholder deletado com sucesso!')
        fetchPlaceholders()
      } catch (err: any) {
        toast.error('Erro ao deletar placeholder.')
      }
    }
  }

  return (
    <div className="bg-pale-cornflower text-midnight-navy p-6 space-y-6 rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-midnight-navy/60" />
          <Input
            placeholder="Buscar placeholder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-steel-blue/30 text-midnight-navy placeholder:text-midnight-navy/50"
          />
        </div>
        <Button
          onClick={() => {
            setSelectedPlaceholder(null)
            setModalOpen(true)
          }}
          className="w-full sm:w-auto bg-steel-blue text-off-white hover:bg-steel-blue/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Placeholder
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
              onClick={fetchPlaceholders}
              className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
          </div>
        ) : placeholders.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-white/50 border border-steel-blue border-dashed rounded-lg">
            <Code className="h-12 w-12 text-steel-blue mb-4" />
            <h3 className="text-lg font-medium text-midnight-navy mb-2">
              Nenhum placeholder encontrado
            </h3>
            <p className="text-midnight-navy/70 mb-6 text-sm">
              Clique em 'Adicionar Placeholder' para começar.
            </p>
            <Button
              className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
              onClick={() => {
                setSelectedPlaceholder(null)
                setModalOpen(true)
              }}
            >
              Adicionar Placeholder
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-steel-blue rounded-lg bg-white">
            <Table className="min-w-[800px] w-full">
              <TableHeader className="bg-steel-blue/10">
                <TableRow className="hover:bg-transparent border-steel-blue">
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy w-[60px]">
                    ID
                  </TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy">
                    Placeholder
                  </TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy">
                    Descrição
                  </TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy">
                    Origem
                  </TableHead>
                  <TableHead className="font-medium p-4 text-sm text-midnight-navy text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {placeholders.map((p, idx) => (
                  <TableRow
                    key={p.id}
                    className="border-b border-steel-blue/20 hover:bg-steel-blue/5 transition-colors"
                  >
                    <TableCell className="p-4 text-sm text-midnight-navy/60">
                      {String(idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="font-mono p-4 text-sm font-semibold text-steel-blue">
                      {p.placeholder}
                    </TableCell>
                    <TableCell className="p-4 text-sm max-w-[300px] truncate" title={p.descricao}>
                      {p.descricao}
                    </TableCell>
                    <TableCell className="p-4 text-sm">
                      <span className="px-2 py-1 bg-pale-cornflower text-midnight-navy rounded-md text-xs font-medium border border-steel-blue/30">
                        {p.origem}
                      </span>
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-steel-blue hover:text-midnight-navy hover:bg-pale-cornflower"
                          onClick={() => {
                            setSelectedPlaceholder(p)
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
                          onClick={() => handleDelete(p)}
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
        <PlaceholderModal
          placeholder={selectedPlaceholder}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            fetchPlaceholders()
          }}
        />
      )}
    </div>
  )
}
