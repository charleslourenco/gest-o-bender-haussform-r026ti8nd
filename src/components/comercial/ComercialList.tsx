import { useState, useEffect } from 'react'
import { fetchLeads, updateLead } from '@/services/comercial'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { COLUMNS } from './constants'

export function ComercialList() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await fetchLeads()
      setLeads(data || [])
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusChange = async (id: string, newStatus: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)))
    try {
      await updateLead(id, { status: newStatus })
      toast({
        description: 'Status atualizado com sucesso!',
        className: 'bg-dark-denim text-off-white border-none',
      })
    } catch (e: any) {
      toast({
        description: 'Erro ao atualizar status',
        variant: 'destructive',
      })
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Novo Lead':
        return 'bg-blue-100 text-blue-800'
      case 'Vendido':
        return 'bg-green-100 text-green-800'
      case 'Perdido':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const safeLeads = Array.isArray(leads) ? leads : []

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Data de Criação</TableHead>
          <TableHead className="text-right">Consultor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {safeLeads.filter(Boolean).map((lead) => {
          const consultorRaw = lead.consultor || lead.users
          const consultorNome = Array.isArray(consultorRaw)
            ? consultorRaw[0]?.nome
            : typeof consultorRaw === 'object' && consultorRaw !== null
              ? consultorRaw.nome
              : typeof consultorRaw === 'string'
                ? consultorRaw
                : undefined
          return (
            <TableRow key={lead.id} className="hover:bg-slate-50 transition-colors">
              <TableCell className="font-medium text-midnight-navy">{lead.nome || '-'}</TableCell>
              <TableCell className="text-gray-600">{lead.email || '-'}</TableCell>
              <TableCell className="text-gray-600">{lead.telefone || '-'}</TableCell>
              <TableCell>
                <Select
                  value={lead.status || 'Novo Lead'}
                  onValueChange={(val) => handleStatusChange(lead.id, val)}
                >
                  <SelectTrigger
                    className={`h-8 text-xs font-semibold border-none ${getStatusColor(lead.status || '')}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs font-medium">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-gray-600 font-normal border-gray-300">
                  {lead.origem || '-'}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-600">
                {(() => {
                  if (!lead.criado_em) return '-'
                  try {
                    const d = new Date(lead.criado_em)
                    return isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy HH:mm')
                  } catch {
                    return '-'
                  }
                })()}
              </TableCell>
              <TableCell className="text-right text-gray-600">
                {consultorNome || 'Não atribuído'}
              </TableCell>
            </TableRow>
          )
        })}
        {safeLeads.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-gray-500 py-8">
              Nenhum lead encontrado no sistema.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
