import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export function LeadsList({ leads }: { leads: any[] }) {
  return (
    <div className="border rounded-md flex-1 flex flex-col overflow-hidden bg-background">
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 z-10 backdrop-blur">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.nome}</TableCell>
                <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                <TableCell>{lead.telefone}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {lead.origem || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{lead.status || 'Novo Lead'}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
