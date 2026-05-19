import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Calculator } from 'lucide-react'
import { format } from 'date-fns'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('orcamentos_engenharia')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false })
      .then(({ data }) => setOrcamentos(data || []))
  }, [])

  const handleCreate = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .insert({ nome: 'Novo Orçamento' })
      .select()
      .single()
    if (data) window.location.href = `/orcamentos/${data.id}`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" /> Orçamentos e Materiais por Projeto
        </h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {orcamentos.map((orc) => (
          <Link
            key={orc.id}
            to={`/orcamentos/${orc.id}`}
            className="block p-4 border rounded-xl hover:border-primary transition-colors bg-card shadow-sm"
          >
            <h3 className="font-semibold text-lg">{orc.nome}</h3>
            <p className="text-sm text-muted-foreground">
              {orc.clientes?.nome || 'Sem cliente vinculado'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Criado em: {format(new Date(orc.criado_em), 'dd/MM/yyyy')}
            </p>
          </Link>
        ))}
        {orcamentos.length === 0 && (
          <div className="col-span-3 p-12 text-center border-2 border-dashed rounded-xl text-muted-foreground">
            Nenhum orçamento encontrado. Crie o primeiro!
          </div>
        )}
      </div>
    </div>
  )
}
