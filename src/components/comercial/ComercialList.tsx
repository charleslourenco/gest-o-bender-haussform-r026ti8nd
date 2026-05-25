import { useState, useEffect } from 'react'
import { fetchLeads } from '@/services/comercial'
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

export function ComercialList() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchLeads()
        setLeads(data || [])
      } catch (error) {
        console.error('Erro ao buscar leads:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

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
        {leads.map((lead) => (
          <TableRow key={lead.id} className="hover:bg-slate-50 transition-colors">
            <TableCell className="font-medium text-midnight-navy">{lead.nome}</TableCell>
            <TableCell className="text-gray-600">{lead.email}</TableCell>
            <TableCell className="text-gray-600">{lead.telefone}</TableCell>
            <TableCell>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}
              >
                {lead.status}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-gray-600 font-normal border-gray-300">
                {lead.origem}
              </Badge>
            </TableCell>
            <TableCell className="text-gray-600">
              {format(new Date(lead.criado_em), 'dd/MM/yyyy HH:mm')}
            </TableCell>
            <TableCell className="text-right text-gray-600">
              {lead.consultor?.nome || 'Não atribuído'}
            </TableCell>
          </TableRow>
        ))}
        {leads.length === 0 && (
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
