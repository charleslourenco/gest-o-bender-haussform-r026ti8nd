import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ListasMateriais() {
  const [listas, setListas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchListas = async () => {
    const { data, error } = await supabase
      .from('documentos_cliente')
      .select(`
        id,
        criado_em,
        arquivo_url,
        status,
        tipo,
        template_nome,
        clientes ( nome ),
        users ( nome )
      `)
      .eq('tipo', 'lista_materiais')
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar listas de materiais:', error)
    }

    if (data) {
      setListas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchListas()

    const channel = supabase
      .channel('documentos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_cliente',
          filter: 'tipo=eq.lista_materiais',
        },
        () => {
          fetchListas()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('documentos_cliente')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    } else {
      toast({ title: 'Status atualizado com sucesso' })
      setListas((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)))
    }
  }

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      let bucket = 'bender_clientes'
      let path = url

      if (url.startsWith('http')) {
        const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
        if (match) {
          bucket = match[1]
          path = decodeURIComponent(match[2])
        }
      }

      const { data, error } = await supabase.storage.from(bucket).download(path)
      if (error) throw error

      if (data) {
        const objectUrl = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename || 'Lista_de_Materiais'
        document.body.appendChild(a)
        a.click()
        URL.revokeObjectURL(objectUrl)
      }
    } catch (e) {
      toast({ title: 'Erro ao fazer download', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Carregando listas de materiais...</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card overflow-auto min-w-[800px]">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Enviado por</TableHead>
              <TableHead>Status Compra</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma lista encontrada.
                </TableCell>
              </TableRow>
            ) : (
              listas.map((doc) => {
                const isPending = (doc.status || 'Pendente') === 'Pendente'
                return (
                  <TableRow
                    key={doc.id}
                    className={`relative transition-colors hover:bg-muted/60 ${
                      isPending
                        ? 'bg-orange-50/60 dark:bg-orange-950/20 border-l-[3px] border-l-orange-500'
                        : ''
                    }`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText
                          className={`h-4 w-4 ${isPending ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground'}`}
                        />
                        {doc.template_nome || 'Lista de Materiais'}
                      </div>
                    </TableCell>
                    <TableCell>{doc.clientes?.nome || '-'}</TableCell>
                    <TableCell>{format(new Date(doc.criado_em), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>{doc.users?.nome || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={doc.status === 'pendente' ? 'Pendente' : doc.status || 'Pendente'}
                        onValueChange={(val) => handleStatusChange(doc.id, val)}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Comprado">Comprado</SelectItem>
                          <SelectItem value="revisado">Revisado</SelectItem>
                          <SelectItem value="Concluído">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(doc.arquivo_url, doc.template_nome)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
