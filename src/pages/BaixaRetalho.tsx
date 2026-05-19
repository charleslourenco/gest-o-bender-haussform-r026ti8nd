import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Scissors } from 'lucide-react'

export default function BaixaRetalho() {
  const { id } = useParams()
  const [retalho, setRetalho] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [baixaLoading, setBaixaLoading] = useState(false)

  useEffect(() => {
    async function loadRetalho() {
      if (!id) return

      const { data, error } = await supabase
        .from('estoque_sobras' as any)
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error || !data) {
        setError('Retalho não encontrado no sistema.')
      } else {
        setRetalho(data)
      }
      setLoading(false)
    }
    loadRetalho()
  }, [id])

  async function handleBaixa() {
    setBaixaLoading(true)
    const { error } = await supabase
      .from('estoque_sobras' as any)
      .update({ status: 'usado', usado_em: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      setError('Erro ao dar baixa. Tente novamente.')
    } else {
      setSuccess(true)
      setRetalho({ ...retalho, status: 'usado', usado_em: new Date().toISOString() })
    }
    setBaixaLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="animate-pulse flex flex-col items-center">
          <Scissors className="w-10 h-10 text-amber-500 mb-4 animate-bounce" />
          <p className="text-gray-500 font-medium">Buscando informações do retalho...</p>
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
              O retalho <strong>{retalho?.nome}</strong> foi marcado como usado no estoque.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!retalho) return null

  const isUsado = retalho.status === 'usado'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md mb-6 flex justify-center">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Bender Haussform</h1>
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden">
        <div className="bg-amber-500 h-2 w-full"></div>
        <CardHeader className="text-center pb-4 pt-8">
          <div className="mx-auto bg-amber-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 shadow-sm">
            <Scissors className="w-7 h-7 text-amber-600" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Uso de Retalho</CardTitle>
          <CardDescription className="text-gray-500 text-base mt-2">
            Verifique as informações antes de confirmar a baixa no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-8">
          <div className="bg-white border border-gray-100 shadow-sm p-5 rounded-xl space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                Material / Cor
              </p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{retalho.nome}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Marca
                </p>
                <p className="font-medium text-gray-800">{retalho.marca || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Cliente
                </p>
                <p className="font-medium text-gray-800">{retalho.cliente_nome || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 bg-gray-50 -mx-5 px-5 pb-2 mt-2 rounded-b-xl">
              <div>
                <p className="text-xs text-gray-500 mb-1">Largura</p>
                <p className="font-bold text-gray-900">
                  {retalho.largura} <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Altura</p>
                <p className="font-bold text-gray-900">
                  {retalho.altura} <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Espessura</p>
                <p className="font-bold text-gray-900">
                  {retalho.espessura} <span className="text-xs font-normal text-gray-500">mm</span>
                </p>
              </div>
            </div>
          </div>

          {isUsado ? (
            <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-center font-medium shadow-sm flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Este retalho já foi utilizado.
            </div>
          ) : (
            <Button
              onClick={handleBaixa}
              disabled={baixaLoading}
              className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md rounded-xl transition-all active:scale-[0.98]"
            >
              {baixaLoading ? 'Processando...' : 'Confirmar Baixa'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
