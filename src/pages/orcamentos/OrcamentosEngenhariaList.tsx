import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Search, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchOrcamentos()
  }, [])

  async function fetchOrcamentos() {
    setLoading(true)
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .select('*, cliente:clientes(nome)')
      .order('criado_em', { ascending: false })

    if (data) {
      setOrcamentos(data)
    }
    setLoading(false)
  }

  const filtered = orcamentos.filter((o) => {
    const term = search.toLowerCase()
    const name = (o.nome || '').toLowerCase()
    const clientName = (o.cliente_nome_manual || o.cliente?.nome || '').toLowerCase()
    return name.includes(term) || clientName.includes(term)
  })

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos de Engenharia</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os orçamentos e listas de materiais</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por orçamento ou cliente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500">Nenhum orçamento encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((o) => (
              <Card key={o.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        <Link to={`/orcamentos/${o.id}`} className="hover:underline">
                          {o.nome}
                        </Link>
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Cliente/Projeto:{' '}
                        <span className="font-medium text-gray-700">
                          {o.cliente_nome_manual || o.cliente?.nome || 'Não informado'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={o.status === 'Rascunho' ? 'secondary' : 'default'}>
                      {o.status}
                    </Badge>
                    <div className="text-sm text-gray-400">
                      {new Date(o.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
