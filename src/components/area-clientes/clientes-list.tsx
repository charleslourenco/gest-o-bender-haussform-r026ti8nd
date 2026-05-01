import { useState, useEffect } from 'react'
import { Search, Plus, Calendar, User } from 'lucide-react'
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

export function ClientesList({ onSelect }: { onSelect: (id: string) => void }) {
  const [forms, setForms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateTerm, setDateTerm] = useState('')
  const [userTerm, setUserTerm] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: formsData }, { data: usersData }] = await Promise.all([
        supabase
          .from('formulario_comercial')
          .select('id, datas, produtos_servicos, cliente_id, clientes(id, nome), usuario_id')
          .order('criado_em', { ascending: false }),
        supabase.from('users').select('id, nome'),
      ])

      if (formsData) {
        const usersMap = new Map((usersData || []).map((u) => [u.id, u.nome]))
        const mapped = formsData.map((f) => {
          const valor = Array.isArray(f.produtos_servicos)
            ? f.produtos_servicos.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0)
            : 0
          return {
            id: f.id,
            cliente_nome: f.clientes
              ? Array.isArray(f.clientes)
                ? f.clientes[0]?.nome
                : f.clientes.nome
              : 'Sem Nome',
            data_venda: f.datas?.data_venda || '-',
            valor: valor,
            vendedor: usersMap.get(f.usuario_id) || '-',
          }
        })
        setForms(mapped)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filteredForms = forms.filter((f) => {
    const matchName = f.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchUser = f.vendedor?.toLowerCase().includes(userTerm.toLowerCase())
    const matchDate = dateTerm ? f.data_venda === dateTerm : true
    return matchName && matchUser && matchDate
  })

  return (
    <div className="p-4 md:p-6 space-y-6 flex-1 overflow-auto animate-in fade-in duration-300 bg-midnight-navy">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-dark-denim p-6 rounded-xl text-off-white gap-4 shadow-sm border border-pale-cornflower">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-off-white/80">Gerencie seus projetos e clientes</p>
        </div>
        <Button className="bg-steel-blue hover:bg-midnight-navy hover:border hover:border-steel-blue text-off-white border-none w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-navy" />
          <Input
            placeholder="Buscar por nome do cliente..."
            className="pl-9 bg-pale-cornflower text-midnight-navy border border-steel-blue focus-visible:border-2 focus-visible:border-steel-blue placeholder:text-midnight-navy/60"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-navy" />
          <Input
            type="date"
            className="pl-9 bg-pale-cornflower text-midnight-navy border border-steel-blue focus-visible:border-2 focus-visible:border-steel-blue"
            value={dateTerm}
            onChange={(e) => setDateTerm(e.target.value)}
          />
        </div>
        <div className="flex-1 relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-navy" />
          <Input
            placeholder="Usuário/Consultor"
            className="pl-9 bg-pale-cornflower text-midnight-navy border border-steel-blue focus-visible:border-2 focus-visible:border-steel-blue placeholder:text-midnight-navy/60"
            value={userTerm}
            onChange={(e) => setUserTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-dark-denim rounded-xl border border-pale-cornflower overflow-x-auto shadow-sm">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-midnight-navy border-b border-pale-cornflower">
            <TableRow className="hover:bg-transparent border-pale-cornflower">
              <TableHead className="text-off-white font-bold">Número</TableHead>
              <TableHead className="text-off-white font-bold">Nome do cliente</TableHead>
              <TableHead className="text-off-white font-bold">Data da venda</TableHead>
              <TableHead className="text-off-white font-bold">Valor da venda</TableHead>
              <TableHead className="text-off-white font-bold">Vendedor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-pale-cornflower hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-8 text-off-white/70">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredForms.length === 0 ? (
              <TableRow className="border-pale-cornflower hover:bg-transparent">
                <TableCell colSpan={5} className="text-center py-8 text-off-white/70">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredForms.map((f, i) => (
                <TableRow
                  key={f.id}
                  className="cursor-pointer bg-dark-denim text-off-white border-pale-cornflower hover:bg-pale-cornflower hover:text-midnight-navy group"
                  onClick={() => onSelect(f.id)}
                >
                  <TableCell className="font-medium group-hover:text-midnight-navy">
                    #{String(forms.length - i).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="group-hover:text-midnight-navy">{f.cliente_nome}</TableCell>
                  <TableCell className="group-hover:text-midnight-navy">
                    {f.data_venda !== '-'
                      ? new Date(f.data_venda).toLocaleDateString('pt-BR')
                      : '-'}
                  </TableCell>
                  <TableCell className="font-medium group-hover:text-midnight-navy">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      f.valor,
                    )}
                  </TableCell>
                  <TableCell className="group-hover:text-midnight-navy">{f.vendedor}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
