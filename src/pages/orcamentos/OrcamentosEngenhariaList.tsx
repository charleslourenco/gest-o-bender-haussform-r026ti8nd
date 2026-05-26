import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
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
import { Plus, Calculator, ScanText } from 'lucide-react'
import { format } from 'date-fns'

export default function OrcamentosEngenhariaList() {
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrcamentos()
  }, [])

  const fetchOrcamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          id, 
          cliente_id, 
          ambiente, 
          status, 
          valor_total, 
          data_criacao,
          clientes (nome)
        `)
        .order('data_criacao', { ascending: false })

      if (error) throw error
      setOrcamentos(data || [])
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  return (
    <div className="p-6 h-full flex flex-col bg-off-white space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-off-white">Orçamentos</h1>
            <p className="text-pale-cornflower text-sm mt-0.5">
              Gestão de orçamentos e importações
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/orcamentos/upload')}
            variant="secondary"
            className="bg-white text-midnight-navy hover:bg-gray-100"
          >
            <ScanText className="w-4 h-4 mr-2" />
            Importar via OCR
          </Button>
          <Button
            onClick={() => navigate('/orcamentos/novo')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>ID / Cliente</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Carregando orçamentos...
                  </TableCell>
                </TableRow>
              ) : orcamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                orcamentos.map((orc) => (
                  <TableRow key={orc.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium text-midnight-navy">
                        {orc.clientes?.nome || 'Cliente não definido'}
                      </div>
                      <div className="text-xs text-gray-500">ID: {orc.id.substring(0, 8)}</div>
                    </TableCell>
                    <TableCell>{orc.ambiente || '-'}</TableCell>
                    <TableCell className="font-medium text-emerald-600">
                      {formatCurrency(orc.valor_total)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-gray-100">
                        {orc.status || 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {orc.data_criacao ? format(new Date(orc.data_criacao), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/orcamentos/${orc.id}`}>Detalhes</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
