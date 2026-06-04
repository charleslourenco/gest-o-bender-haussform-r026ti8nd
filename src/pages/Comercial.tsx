import { useState, useEffect, useRef } from 'react'
import { KanbanBoard } from '@/components/comercial/KanbanBoard'
import { ComercialList } from '@/components/comercial/ComercialList'
import { ComercialIndicators } from '@/components/comercial/ComercialIndicators'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, LayoutDashboard, List as ListIcon, BarChart3 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function Comercial() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState('kanban')
  const [toolbarNode, setToolbarNode] = useState<HTMLDivElement | null>(null)

  // Refs for dual scrollbar sync
  const topScrollRef = useRef<HTMLDivElement>(null)
  const kanbanWrapperRef = useRef<HTMLDivElement>(null)
  const [scrollInfo, setScrollInfo] = useState({ scrollWidth: 0, clientWidth: 0 })

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

  useEffect(() => {
    if (!hasPermission || !kanbanWrapperRef.current || !topScrollRef.current) return

    let targetScrollEl: HTMLElement | null = null
    let isSyncingTop = false
    let isSyncingBottom = false
    let resizeObs: ResizeObserver | null = null
    let findTimeout: ReturnType<typeof setTimeout>

    const updateScrollInfo = (el: HTMLElement) => {
      setScrollInfo((prev) => {
        if (prev.scrollWidth !== el.scrollWidth || prev.clientWidth !== el.clientWidth) {
          return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
        }
        return prev
      })
    }

    const findScrollable = () => {
      if (!kanbanWrapperRef.current) return

      const elements = Array.from(kanbanWrapperRef.current.querySelectorAll('*')) as HTMLElement[]
      let bestEl: HTMLElement | null = null
      let maxScroll = 0

      for (const el of elements) {
        const style = window.getComputedStyle(el)
        if (
          el.scrollWidth > el.clientWidth &&
          (style.overflowX === 'auto' ||
            style.overflowX === 'scroll' ||
            style.overflowX === 'overlay')
        ) {
          if (el.scrollWidth > maxScroll) {
            maxScroll = el.scrollWidth
            bestEl = el
          }
        }
      }

      if (bestEl && bestEl !== targetScrollEl) {
        targetScrollEl = bestEl
        updateScrollInfo(bestEl)

        if (resizeObs) resizeObs.disconnect()
        resizeObs = new ResizeObserver(() => {
          if (targetScrollEl) updateScrollInfo(targetScrollEl)
        })
        resizeObs.observe(bestEl)
        Array.from(bestEl.children).forEach((child) => resizeObs?.observe(child))
      } else if (targetScrollEl) {
        updateScrollInfo(targetScrollEl)
      }
    }

    const onBottomScroll = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.scrollWidth > target.clientWidth) {
        if (target !== targetScrollEl) {
          targetScrollEl = target
          updateScrollInfo(target)
        }

        if (!isSyncingTop && topScrollRef.current) {
          isSyncingBottom = true
          topScrollRef.current.scrollLeft = target.scrollLeft
          requestAnimationFrame(() => {
            isSyncingBottom = false
          })
        }
      }
    }

    const onTopScroll = () => {
      if (!isSyncingBottom && targetScrollEl && topScrollRef.current) {
        isSyncingTop = true
        targetScrollEl.scrollLeft = topScrollRef.current.scrollLeft
        requestAnimationFrame(() => {
          isSyncingTop = false
        })
      }
    }

    kanbanWrapperRef.current.addEventListener('scroll', onBottomScroll, true)
    topScrollRef.current.addEventListener('scroll', onTopScroll, { passive: true })

    const observer = new MutationObserver(() => {
      clearTimeout(findTimeout)
      findTimeout = setTimeout(findScrollable, 200)
    })
    observer.observe(kanbanWrapperRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    setTimeout(findScrollable, 100)
    setTimeout(findScrollable, 500)
    setTimeout(findScrollable, 1500)

    return () => {
      clearTimeout(findTimeout)
      kanbanWrapperRef.current?.removeEventListener('scroll', onBottomScroll, true)
      topScrollRef.current?.removeEventListener('scroll', onTopScroll)
      observer.disconnect()
      if (resizeObs) resizeObs.disconnect()
    }
  }, [hasPermission])

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
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 pt-0 space-y-4"
    >
      <div className="flex flex-row items-center justify-between w-full bg-[#0A1931] text-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 scrollbar-hide">
        <div className="flex flex-row items-center gap-4 shrink-0 whitespace-nowrap">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400 hidden sm:block" />
            Comercial
          </h1>
          <TabsList className="bg-transparent border-none p-0 flex gap-2 h-auto">
            <TabsTrigger
              value="kanban"
              onClick={() => setActiveTab('kanban')}
              className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 py-1.5 px-3 rounded-md transition-colors data-[state=active]:shadow-none"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger
              value="lista"
              onClick={() => setActiveTab('lista')}
              className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 py-1.5 px-3 rounded-md transition-colors data-[state=active]:shadow-none"
            >
              <ListIcon className="w-4 h-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger
              value="indicadores"
              onClick={() => setActiveTab('indicadores')}
              className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 py-1.5 px-3 rounded-md transition-colors data-[state=active]:shadow-none"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Indicadores
            </TabsTrigger>
          </TabsList>
        </div>
        <div
          ref={setToolbarNode}
          className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap [&_input]:!w-28 lg:[&_input]:!w-40 [&_button[role='combobox']]:!w-28 lg:[&_button[role='combobox']]:!w-40"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <TabsContent
          value="kanban"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative"
        >
          <div
            ref={topScrollRef}
            className={cn(
              'overflow-x-auto overflow-y-hidden shrink-0',
              '[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 transition-colors',
              scrollInfo.scrollWidth > scrollInfo.clientWidth + 2 ? 'block mb-2' : 'hidden',
            )}
          >
            <div style={{ width: scrollInfo.scrollWidth, height: '1px' }} />
          </div>

          <div ref={kanbanWrapperRef} className="flex-1 overflow-hidden flex flex-col min-h-0">
            <KanbanBoard toolbarPortal={toolbarNode} isActive={activeTab === 'kanban'} />
          </div>
        </TabsContent>

        <TabsContent
          value="lista"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <ComercialList />
          </div>
        </TabsContent>

        <TabsContent
          value="indicadores"
          className="flex-1 overflow-y-auto min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <ComercialIndicators />
        </TabsContent>
      </div>
    </Tabs>
  )
}
