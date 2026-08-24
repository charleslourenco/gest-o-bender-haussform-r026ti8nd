import { useState, useEffect } from 'react'
import { fetchLeadsArquivados, desarquivarLead } from '@/services/arquivamento'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function LeadsArquivados() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchLeadsArquivados()
      setLeads(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar leads arquivados: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUnarchive = async (id: string) => {
    try {
      await desarquivarLead(id)
      toast.success('Lead desarquivado com sucesso!')
      loadData()
    } catch (e: any) {
      toast.error('Erro ao desarquivar: ' + e.message)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
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
          <TableHead>Data de Arquivamento</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id} className="hover:bg-slate-50 transition-colors">
            <TableCell className="font-medium text-midnight-navy">{lead.nome}</TableCell>
            <TableCell className="text-gray-600">{lead.email}</TableCell>
            <TableCell className="text-gray-600">{lead.telefone}</TableCell>
            <TableCell>
              <Badge variant="secondary">{lead.status}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-gray-600 font-normal border-gray-300">
                {lead.origem}
              </Badge>
            </TableCell>
            <TableCell className="text-gray-600">
              {(() => {
                const dt = lead.atualizado_em || lead.criado_em
                if (!dt) return '-'
                try {
                  const d = new Date(dt)
                  return isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy HH:mm')
                } catch {
                  return '-'
                }
              })()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnarchive(lead.id)}
                className="text-steel-blue hover:text-steel-blue/80 hover:bg-steel-blue/5"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Desarquivar
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {leads.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-gray-500 py-8">
              Nenhum lead arquivado.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
