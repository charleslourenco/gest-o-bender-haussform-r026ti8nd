import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Boxes } from 'lucide-react'

interface AlocacaoData {
  id: string
  item_id: string
  cliente_nome: string
  quantidade: number
  criado_em: string
  status: string | null
  baixado_em: string | null
  baixado_por: string | null
  item: {
    id: string
    nome: string
    marca: string | null
    cor: string | null
    espessura_mm: number | null
    largura_mm: number | null
    comprimento_m: number | null
    unidade: string
    quantidade: number
  } | null
}

export default function BaixaAlocacao() {
  const { id } = useParams()
  const [alocacao, setAlocacao] = useState<AlocacaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [baixaLoading, setBaixaLoading] = useState(false)

  useEffect(() => {
    async function loadAlocacao() {
      if (!id) {
        setError('Link inválido.')
        setLoading(false)
        return
      }

      const { data, error: err } = await supabase
        .from('estoque_alocacoes')
        .select('*, item:estoque_itens(*)')
        .eq('id', id)
        .maybeSingle()

      if (err || !data) {
        setError('Alocação não encontrada no sistema.')
      } else {
        setAlocacao(data as AlocacaoData)
      }
      setLoading(false)
    }
    loadAlocacao()
  }, [id])

  async function handleBaixa() {
    if (!alocacao) return
    setBaixaLoading(true)
    setError('')

    try {
      const nowIso = new Date().toISOString()

      const { error: updateErr } = await supabase
        .from('estoque_alocacoes')
        .update({ status: 'baixado', baixado_em: nowIso })
        .eq('id', alocacao.id)

      if (updateErr) throw updateErr

      if (alocacao.item_id) {
        const { error: estoqueErr } = await supabase.rpc('deduct_estoque_alocacao', {
          p_item_id: alocacao.item_id,
          p_quantidade: alocacao.quantidade,
        })

        if (estoqueErr) {
          // Fallback: direct update if rpc not available
          const { error: directErr } = await supabase
            .from('estoque_itens')
            .update({
              quantidade: Math.max(0, (alocacao.item?.quantidade ?? 0) - alocacao.quantidade),
              atualizado_em: nowIso,
            })
            .eq('id', alocacao.item_id)
          if (directErr) throw directErr
        }

        await supabase.from('estoque_movimentacoes').insert({
          item_id: alocacao.item_id,
          tipo: 'saida',
          quantidade: alocacao.quantidade,
        })
      }

      setSuccess(true)
      setAlocacao({ ...alocacao, status: 'baixado', baixado_em: nowIso })
    } catch (e: any) {
      setError('Erro ao dar baixa. Tente novamente. ' + (e?.message || ''))
    } finally {
      setBaixaLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-pulse flex flex-col items-center">
          <Boxes className="w-10 h-10 text-blue-500 mb-4 animate-bounce" />
          <p className="text-gray-500 font-medium">Buscando informações da alocação...</p>
        </div>
      </div>
    )
  }

  if (error && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-md border-0">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="bg-red-100 p-3 rounded-full mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="mb-2 text-xl">Erro ao acessar</CardTitle>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-md border-0">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
            <div className="bg-emerald-100 p-4 rounded-full mb-5">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <CardTitle className="mb-2 text-2xl text-emerald-800">Baixa Realizada!</CardTitle>
            <p className="text-gray-600 mt-2">
              A alocação de <strong>{alocacao?.quantidade}</strong> unidade(s) de{' '}
              <strong>{alocacao?.item?.nome || 'item'}</strong> foi dada como baixada no estoque.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!alocacao) return null

  const isBaixado = alocacao.status === 'baixado'
  const item = alocacao.item

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md mb-6 flex justify-center">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Bender Haussform</h1>
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden">
        <div className="bg-blue-600 h-2 w-full"></div>
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 shadow-sm">
            <Boxes className="w-7 h-7 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Baixa de Alocação</CardTitle>
          <CardDescription className="text-gray-500 text-base mt-2">
            Verifique as informações antes de confirmar a baixa no estoque.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-8">
          <div className="bg-white border border-gray-100 shadow-sm p-5 rounded-xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                Item
              </p>
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {item?.nome || 'Item não encontrado'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Marca
                </p>
                <p className="font-medium text-gray-800">{item?.marca || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Cliente
                </p>
                <p className="font-medium text-gray-800">{alocacao.cliente_nome || '-'}</p>
              </div>
            </div>

            {item?.cor && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                    Cor
                  </p>
                  <p className="font-medium text-gray-800">{item.cor}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                    Unidade
                  </p>
                  <p className="font-medium text-gray-800">{item.unidade || '-'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 bg-gray-50 -mx-5 px-5 pb-2 mt-2 rounded-b-xl">
              <div>
                <p className="text-xs text-gray-500 mb-1">Quantidade</p>
                <p className="font-bold text-blue-700 text-lg">
                  {alocacao.quantidade}
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    {item?.unidade || 'un'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Espessura</p>
                <p className="font-bold text-gray-900">
                  {item?.espessura_mm ?? '-'}{' '}
                  <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Largura</p>
                <p className="font-bold text-gray-900">
                  {item?.largura_mm ?? '-'}{' '}
                  <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
              </div>
            </div>
          </div>

          {isBaixado ? (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-center font-medium shadow-sm flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>
                  Esta alocação já foi baixada
                  {alocacao.baixado_em
                    ? ` em ${new Date(alocacao.baixado_em).toLocaleString('pt-BR')}`
                    : ''}
                  .
                </span>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleBaixa}
              disabled={baixaLoading}
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-xl transition-all active:scale-[0.98]"
            >
              {baixaLoading ? 'Processando...' : 'Confirmar Baixa de Estoque'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
