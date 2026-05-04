import { useState, useEffect } from 'react'
import { Search, Calendar, User } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ClientesList({ onSelect }: { onSelect: (id: string) => void }) {
  const [dossies, setDossies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateTerm, setDateTerm] = useState('')
  const [userTerm, setUserTerm] = useState('')

  useEffect(() => {
    async function load() {
      const { data: dossiesData } = await supabase
        .from('dossies')
        .select(`
          id, 
          criado_em, 
          user_id,
          cliente:clientes(id, nome), 
          formulario:formulario_comercial(produtos_servicos, desconto)
        `)
        .order('criado_em', { ascending: false })

      const { data: usersData } = await supabase.from('users').select('id, nome')
      const usersMap = new Map((usersData || []).map((u) => [u.id, u.nome]))

      if (dossiesData) {
        const mapped = dossiesData.map((d: any) => {
          const prods =
            typeof d.formulario?.produtos_servicos === 'string'
              ? JSON.parse(d.formulario?.produtos_servicos || '[]')
              : d.formulario?.produtos_servicos || []

          const desc = Number(d.formulario?.desconto) || 0

          let valor = 0
          if (Array.isArray(prods)) {
            valor =
              prods.reduce(
                (acc, p) => acc + (Number(p.valor_unitario) || 0) * (Number(p.qtd) || 1),
                0,
              ) - desc
          }

          return {
            id: d.id,
            cliente_nome: d.cliente
              ? Array.isArray(d.cliente)
                ? d.cliente[0]?.nome
                : d.cliente.nome
              : 'Sem Nome',
            data_venda: d.criado_em.split('T')[0],
            valor: valor,
            vendedor: usersMap.get(d.user_id) || '-',
          }
        })
        setDossies(mapped)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = dossies.filter((d) => {
    const matchName = d.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchUser = d.vendedor?.toLowerCase().includes(userTerm.toLowerCase())
    const matchDate = dateTerm ? d.data_venda === dateTerm : true
    return matchName && matchUser && matchDate
  })

  return (
    <div className="p-4 md:p-6 space-y-6 flex-1 overflow-auto animate-in fade-in duration-300 bg-background">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-card p-6 rounded-xl text-card-foreground gap-4 shadow-sm border border-border">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie o histórico e dossiês dos clientes</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do cliente..."
            className="pl-9 bg-background text-foreground border-border focus-visible:ring-2 focus-visible:ring-primary placeholder:text-muted-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            className="pl-9 bg-background text-foreground border-border focus-visible:ring-2 focus-visible:ring-primary"
            value={dateTerm}
            onChange={(e) => setDateTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Usuário/Consultor"
            className="pl-9 bg-background text-foreground border-border focus-visible:ring-2 focus-visible:ring-primary placeholder:text-muted-foreground"
            value={userTerm}
            onChange={(e) => setUserTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto shadow-sm">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-foreground font-bold">Nome do cliente</TableHead>
              <TableHead className="text-foreground font-bold">Data da venda</TableHead>
              <TableHead className="text-foreground font-bold">Valor da venda</TableHead>
              <TableHead className="text-foreground font-bold">Vendedor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer bg-card text-card-foreground border-border hover:bg-muted group transition-colors"
                  onClick={() => onSelect(d.id)}
                >
                  <TableCell className="font-medium group-hover:text-primary">
                    {d.cliente_nome}
                  </TableCell>
                  <TableCell>
                    {d.data_venda ? new Date(d.data_venda).toLocaleDateString('pt-BR') : '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {d.valor > 0
                      ? new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(d.valor)
                      : '-'}
                  </TableCell>
                  <TableCell>{d.vendedor}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
