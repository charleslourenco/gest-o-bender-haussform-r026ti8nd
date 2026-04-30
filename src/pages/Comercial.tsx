import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/comercial/KanbanBoard'
import { supabase } from '@/lib/supabase/client'

export default function Comercial() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
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
    }
    check()
  }, [])

  if (hasPermission === null) {
    return (
      <div className="h-full flex flex-col bg-off-white">
        <div className="bg-midnight-navy p-6 shrink-0">
          <div className="h-10 w-64 bg-pale-cornflower/20 animate-pulse rounded-lg"></div>
        </div>
        <div className="flex-1 flex gap-4 p-6">
          <div className="flex-1 bg-pale-cornflower animate-pulse rounded-lg"></div>
          <div className="flex-1 bg-pale-cornflower animate-pulse rounded-lg hidden md:block"></div>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="h-full flex flex-col bg-off-white">
        <div className="bg-midnight-navy p-6 shrink-0">
          <h1 className="text-off-white font-bold text-[32px]">Kanban Comercial</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="bg-pale-cornflower p-6 rounded-lg text-center border-2 border-steel-blue">
            <p className="text-midnight-navy font-bold text-[18px]">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white">
      <div className="bg-midnight-navy p-6 shrink-0 flex justify-between items-center">
        <h1 className="text-off-white font-bold text-[32px]">Kanban Comercial</h1>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 p-6 pt-6">
        <KanbanBoard />
      </div>
    </div>
  )
}
