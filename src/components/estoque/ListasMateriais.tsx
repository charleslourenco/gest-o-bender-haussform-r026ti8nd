import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FileText, Download, Clock, CheckCircle } from 'lucide-react'
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
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
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
              listas.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function OldListasMateriais() {
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
        clientes (
          nome
        )
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

  const markAsReviewed = async (id: string) => {
    const { error } = await supabase
      .from('documentos_cliente')
      .update({ status: 'revisado' })
      .eq('id', id)

    if (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    } else {
      toast({ title: 'Documento marcado como revisado' })
      setListas((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'revisado' } : l)))
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
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      }
    } catch (e: any) {
      console.error('Erro ao baixar arquivo:', e)
      toast({ title: 'Não foi possível baixar o arquivo.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Carregando listas de materiais...
      </div>
    )
  }

  if (listas.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 rounded-lg border dark:border-slate-800 shadow-sm flex flex-col items-center">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
        <p>Nenhuma lista de materiais encontrada no sistema.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg border dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800">
            <tr>
              <th className="px-6 py-3 font-semibold">Documento</th>
              <th className="px-6 py-3 font-semibold">Cliente</th>
              <th className="px-6 py-3 font-semibold">Data de Envio</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {listas.map((doc) => {
              const isUnread = doc.status === 'pendente' || !doc.status || doc.status === 'novo'

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText
                      className={`w-4 h-4 ${isUnread ? 'text-orange-500 dark:text-orange-400' : 'text-blue-500 dark:text-blue-400'}`}
                    />
                    {doc.template_nome || 'Lista de Materiais'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {doc.clientes?.nome || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(doc.criado_em), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide ${
                        isUnread
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                      }`}
                    >
                      {isUnread ? 'Pendente de Revisão' : 'Revisado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.arquivo_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownloadFile(
                              doc.arquivo_url,
                              doc.template_nome || 'Lista_de_Materiais',
                            )
                          }
                          className="h-8 gap-1.5 bg-white dark:bg-slate-950"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar
                        </Button>
                      )}
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReviewed(doc.id)}
                          className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Revisado
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
