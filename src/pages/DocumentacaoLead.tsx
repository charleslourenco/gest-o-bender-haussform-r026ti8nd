import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ComercialForm } from '@/components/comercial/ComercialForm'

export default function DocumentacaoLead() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (!sessionData.session) {
          setHasPermission(false)
          return
        }

        const res = await supabase.functions.invoke('check-permission', {
          body: { action: 'read', modulo: 'Comercial' },
        })

        if (res.data?.allowed && ['Admin', 'Editor'].includes(res.data?.level)) {
          setHasPermission(true)
        } else {
          setHasPermission(false)
        }
      } catch (err) {
        setHasPermission(false)
      }
    }
    init()
  }, [])

  if (hasPermission === null) {
    return (
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
        <header className="bg-midnight-navy p-[24px] shrink-0">
          <div className="max-w-[800px] mx-auto w-full">
            <div className="h-[38px] w-64 bg-pale-cornflower/20 animate-pulse rounded-lg mb-[8px]"></div>
            <div className="h-[20px] w-32 bg-pale-cornflower/20 animate-pulse rounded-lg mb-[24px]"></div>
          </div>
        </header>
        <main className="flex-1 p-[24px] overflow-y-auto">
          <div className="max-w-[800px] mx-auto space-y-4 w-full">
            <div className="h-[44px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
            <div className="h-[44px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
            <div className="h-[44px] bg-pale-cornflower animate-pulse rounded-[8px]"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
        <header className="bg-midnight-navy p-[24px] shrink-0">
          <div className="max-w-[800px] mx-auto w-full">
            <h1 className="text-off-white text-[32px] font-[700]">Formulário Comercial</h1>
          </div>
        </header>
        <main className="flex-1 p-[24px] flex items-center justify-center overflow-y-auto">
          <div className="bg-pale-cornflower p-[24px] rounded-[8px] text-center border-[2px] border-steel-blue w-full max-w-[400px]">
            <p className="text-midnight-navy font-[600] text-[18px]">
              Você não tem permissão para acessar este módulo.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-[16px] bg-dark-denim text-off-white px-[24px] py-[12px] rounded-[8px] hover:opacity-90 transition-all font-bold w-full min-h-[44px]"
            >
              Voltar ao Início
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!id) return null

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white overflow-hidden">
      <ComercialForm leadId={id} onClose={() => navigate('/comercial')} isModal={false} />
    </div>
  )
}
