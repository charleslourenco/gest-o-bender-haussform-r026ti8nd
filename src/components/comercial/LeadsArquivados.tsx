import { useState, useEffect } from 'react'
import { fetchLeadsArquivados, desarquivarLead } from '@/services/arquivamento'
import { parseLeadMetadados, ATENDIMENTO_ABAS } from '@/components/comercial/constants'
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

  const handleUnarchive = async (id: string, isSomenteExclusao: boolean) => {
    try {
      await desarquivarLead(id)
      if (isSomenteExclusao) {
        toast.success('Lead restaurado na aba!')
      } else {
        toast.success('Lead desarquivado com sucesso!')
      }
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
        {Array.isArray(leads) &&
          leads.filter(Boolean).map((lead) => (
            <TableRow
              key={lead?.id || Math.random()}
              className="hover:bg-slate-50 transition-colors"
            >
              <TableCell className="font-medium text-midnight-navy">{lead?.nome || '-'}</TableCell>
              <TableCell className="text-gray-600">{lead?.email || '-'}</TableCell>
              <TableCell className="text-gray-600">{lead?.telefone || '-'}</TableCell>
              <TableCell>
                <Badge variant="secondary">{lead?.status || '-'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-gray-600 font-normal border-gray-300">
                  {lead?.origem || '-'}
                </Badge>
              </TableCell>
              {(() => {
                const { meta } = parseLeadMetadados(lead?.notas_pessoais)
                const arquivamentos = Array.isArray(meta?.arquivamentos) ? meta.arquivamentos : []
                const exclusoes = Array.isArray(meta?.exclusoes) ? meta.exclusoes : []
                const hasArquivamentos = arquivamentos.length > 0
                const hasExclusoes = exclusoes.length > 0
                const isSomenteExclusao =
                  hasExclusoes && !lead?.arquivado_comercial && !hasArquivamentos

                let formattedDate = '-'
                let textoAbasArquivadas = ''
                let textoAbasExcluidas = ''

                if (hasArquivamentos || hasExclusoes) {
                  const todosItens = [...arquivamentos, ...exclusoes]
                  let maxTime = -Infinity
                  let maxDateStr: string | null = null

                  for (const item of todosItens) {
                    if (item?.data) {
                      const t = new Date(item.data).getTime()
                      if (!isNaN(t) && t > maxTime) {
                        maxTime = t
                        maxDateStr = item.data
                      }
                    }
                  }

                  if (maxDateStr) {
                    try {
                      const d = new Date(maxDateStr)
                      if (!isNaN(d.getTime())) {
                        formattedDate = format(d, 'dd/MM/yyyy HH:mm')
                      }
                    } catch {
                      formattedDate = '-'
                    }
                  }

                  if (hasArquivamentos) {
                    const titulos = arquivamentos
                      .map((item) => {
                        const abaConfig = ATENDIMENTO_ABAS.find((a) => a.id === item.aba)
                        return abaConfig ? abaConfig.titulo : item.aba || '-'
                      })
                      .filter(Boolean)
                    textoAbasArquivadas = titulos.join(', ')
                  }

                  if (hasExclusoes) {
                    const titulos = exclusoes
                      .map((item) => {
                        const abaConfig = ATENDIMENTO_ABAS.find((a) => a.id === item.aba)
                        return abaConfig ? abaConfig.titulo : item.aba || '-'
                      })
                      .filter(Boolean)
                    textoAbasExcluidas = titulos.join(', ')
                  }
                } else {
                  const dt = lead?.atualizado_em || lead?.criado_em
                  if (dt) {
                    try {
                      const d = new Date(dt)
                      formattedDate = isNaN(d.getTime()) ? '-' : format(d, 'dd/MM/yyyy HH:mm')
                    } catch {
                      formattedDate = '-'
                    }
                  }
                }

                return (
                  <>
                    <TableCell className="text-gray-600">
                      <div className="flex flex-col">
                        <span>{formattedDate}</span>
                        {textoAbasArquivadas && (
                          <span className="text-xs text-gray-500">
                            Arquivado da aba {textoAbasArquivadas}
                          </span>
                        )}
                        {textoAbasExcluidas && (
                          <span className="text-xs text-gray-500">
                            Tirado da aba {textoAbasExcluidas} pela lixeira
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {lead?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnarchive(lead.id, isSomenteExclusao)}
                          className="text-steel-blue hover:text-steel-blue/80 hover:bg-steel-blue/5"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          {isSomenteExclusao ? 'Restaurar' : 'Desarquivar'}
                        </Button>
                      )}
                    </TableCell>
                  </>
                )
              })()}
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
