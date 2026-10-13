import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PackageSearch, Info, X, AlertTriangle, ArrowRight } from 'lucide-react'
import { EstoqueOverview } from '@/components/estoque/EstoqueOverview'
import { EstoqueLista } from '@/components/estoque/EstoqueLista'
import { ComprasOCR } from '@/components/estoque/ComprasOCR'
import { ConciliacaoListas } from '@/components/estoque/ConciliacaoListas'
import { SolicitacoesCompra } from '@/components/estoque/SolicitacoesCompra'
import { ItensCliente } from '@/components/estoque/ItensCliente'
import { CaixasVirtuais } from '@/components/estoque/CaixasVirtuais'
import { GestaoSobras } from '@/components/estoque/GestaoSobras'
import { ListasMateriais } from '@/components/estoque/ListasMateriais'
import { RelatorioConsumoInterno } from '@/components/estoque/RelatorioConsumoInterno'
import { NotasPendenciasTab } from '@/components/estoque/NotasPendenciasTab'
import { useAlertasNotasFiscais } from '@/hooks/use-alertas-notas-fiscais'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export default function EstoqueCompras() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || 'overview')
  const [activeDocumentosSubTab, setActiveDocumentosSubTab] = useState<string>('pendencias')

  const {
    alertas,
    resumo: resumoAlertas,
    loading: loadingAlertas,
    reload: reloadAlertas,
  } = useAlertasNotasFiscais()

  const [unreadListas, setUnreadListas] = useState(0)
  const [pendingSolicitacoes, setPendingSolicitacoes] = useState(0)
  const [bannerDismissedSession, setBannerDismissedSession] = useState(false)
  const [bannerDismissedPermanent, setBannerDismissedPermanent] = useState(() => {
    try {
      return localStorage.getItem('bender_aviso_leitor_notas_dismissed') === 'true'
    } catch {
      return false
    }
  })

  // Sincronizar activeTab quando o parâmetro ?tab= mudar na URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      if (tab === 'pendencias') {
        setActiveTab('documentos')
        setActiveDocumentosSubTab('pendencias')
      } else {
        setActiveTab(tab)
        const sub = searchParams.get('subtab')
        if (sub) {
          setActiveDocumentosSubTab(sub)
        }
      }
    }
  }, [searchParams])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', val)
      return next
    })
  }

  const handleGoToPendencias = () => {
    setActiveTab('documentos')
    setActiveDocumentosSubTab('pendencias')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'documentos')
      next.set('subtab', 'pendencias')
      return next
    })
  }

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('documentos_cliente')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'lista_materiais')
        .or('status.eq.Pendente,status.is.null')

      setUnreadListas(count || 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('documentos_changes_unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_cliente',
          filter: 'tipo=eq.lista_materiais',
        },
        () => fetchUnread(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPendingSolicitacoes = useCallback(async () => {
    const { count } = await supabase
      .from('solicitacoes_compra')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pendente')
      .eq('arquivado', false)

    setPendingSolicitacoes(count || 0)
  }, [])

  useEffect(() => {
    fetchPendingSolicitacoes()

    const channel = supabase
      .channel('solicitacoes_compra_pending_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitacoes_compra',
        },
        () => fetchPendingSolicitacoes(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPendingSolicitacoes])

  return (
    <div className="pt-0 pb-6 px-6 animate-in fade-in duration-300 h-full flex flex-col">
      {/* BANNER FIXO NO TOPO: Se total = 0, o banner não aparece */}
      {resumoAlertas.total > 0 && (
        <aside
          aria-label="Alerta de pendências em notas fiscais"
          className="mb-4 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-linear-to-r from-amber-50 via-amber-100/70 to-orange-50 dark:from-amber-950/60 dark:via-amber-900/40 dark:to-orange-950/40 p-3 sm:p-4 shadow-xs text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                {resumoAlertas.total === 1
                  ? '1 nota fiscal precisa de atenção'
                  : `${resumoAlertas.total} notas fiscais precisam de atenção`}
              </span>

              {/* Contadores por gravidade: alta em vermelho, média em amarelo, baixa em cinza */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {resumoAlertas.alta > 0 && (
                  <span
                    title={`${resumoAlertas.alta} nota(s) com pendência de alta gravidade`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {resumoAlertas.alta} {resumoAlertas.alta === 1 ? 'alta' : 'altas'}
                  </span>
                )}
                {resumoAlertas.media > 0 && (
                  <span
                    title={`${resumoAlertas.media} nota(s) com pendência de média gravidade`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {resumoAlertas.media} {resumoAlertas.media === 1 ? 'média' : 'médias'}
                  </span>
                )}
                {resumoAlertas.baixa > 0 && (
                  <span
                    title={`${resumoAlertas.baixa} nota(s) com pendência de baixa gravidade`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                  >
                    {resumoAlertas.baixa} {resumoAlertas.baixa === 1 ? 'baixa' : 'baixas'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoToPendencias}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-midnight-navy hover:bg-midnight-navy/90 text-off-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <span>Ver pendências</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 w-full mt-0"
      >
        <div className="flex flex-row items-center justify-between w-full bg-midnight-navy text-off-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 mr-2">
              <PackageSearch className="w-5 h-5 text-off-white" />
              <h2 className="text-lg font-bold text-off-white">Estoque & Compras</h2>
            </div>
            <TabsList className="bg-off-white/10 border-none h-9">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="solicitacoes"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60 relative"
              >
                Solicitações
                {pendingSolicitacoes > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-off-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse">
                    {pendingSolicitacoes}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="estoque"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Itens em Estoque
              </TabsTrigger>
              <TabsTrigger
                value="listas-materiais"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60 relative"
              >
                Listas de Materiais
                {unreadListas > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-off-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse">
                    {unreadListas}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="documentos"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60 relative"
              >
                Notas Fiscais
                {resumoAlertas.total > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold shadow-sm animate-pulse"
                    title={`${resumoAlertas.total} nota(s) com pendência`}
                  >
                    {resumoAlertas.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="itens-cliente"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Itens de Cliente
              </TabsTrigger>
              <TabsTrigger
                value="separacao"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Separação
              </TabsTrigger>
              <TabsTrigger
                value="sobras"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Sobras
              </TabsTrigger>
              <TabsTrigger
                value="consumo-interno"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Consumo Interno
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap"></div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 w-full relative">
          <TabsContent
            value="overview"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <EstoqueOverview />
          </TabsContent>
          <TabsContent
            value="solicitacoes"
            className="m-0 border-none outline-none h-full flex flex-col overflow-hidden"
          >
            <SolicitacoesCompra onDataChange={fetchPendingSolicitacoes} />
          </TabsContent>
          <TabsContent
            value="estoque"
            className="m-0 border-none outline-none h-full flex flex-col overflow-hidden"
          >
            <EstoqueLista />
          </TabsContent>
          <TabsContent
            value="listas-materiais"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <ListasMateriais />
          </TabsContent>
          <TabsContent
            value="documentos"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20 space-y-6"
          >
            {/* Sub-abas dentro de Notas Fiscais: Leitor de Notas, Pendências e Lista por Projeto */}
            <Tabs
              value={activeDocumentosSubTab}
              onValueChange={setActiveDocumentosSubTab}
              className="w-full"
            >
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <TabsList className="bg-muted p-1">
                  <TabsTrigger
                    value="pendencias"
                    className="text-xs font-semibold relative gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pendências</span>
                    {resumoAlertas.total > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white">
                        {resumoAlertas.total}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="leitor" className="text-xs font-semibold">
                    Entrada de Mercadorias (Leitor)
                  </TabsTrigger>
                  <TabsTrigger value="conciliacao" className="text-xs font-semibold">
                    Lista de Materiais por Projeto
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pendencias" className="m-0 border-none outline-none">
                <NotasPendenciasTab
                  alertas={alertas}
                  loading={loadingAlertas}
                  onReload={reloadAlertas}
                />
              </TabsContent>

              <TabsContent value="leitor" className="m-0 border-none outline-none space-y-6">
                {!bannerDismissedPermanent && !bannerDismissedSession && (
                  <div
                    role="status"
                    className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-4 flex items-start gap-3 shadow-xs text-blue-900 dark:text-blue-100 animate-in fade-in duration-200"
                  >
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm leading-relaxed">
                      <p>
                        Sistema atualizado! Agora você pode subir o XML da nota fiscal, que garante
                        100% de precisão na leitura. Também melhoramos a leitura de fotos e PDFs
                        (inclusive escaneados) e agora é possível editar cada item da nota caso não
                        tenha sido lido corretamente.
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              localStorage.setItem('bender_aviso_leitor_notas_dismissed', 'true')
                            } catch (e) {
                              console.error(e)
                            }
                            setBannerDismissedPermanent(true)
                          }}
                          className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline cursor-pointer"
                        >
                          Não mostrar novamente
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBannerDismissedSession(true)}
                      aria-label="Fechar aviso"
                      title="Fechar"
                      className="text-blue-500 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 p-1 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <section>
                  <h2 className="text-xl font-bold text-midnight-navy dark:text-slate-100 mb-4">
                    Entrada de Mercadorias (Leitor de Notas Fiscais)
                  </h2>
                  <ComprasOCR />
                </section>
              </TabsContent>

              <TabsContent value="conciliacao" className="m-0 border-none outline-none">
                <section>
                  <h2 className="text-xl font-bold text-midnight-navy dark:text-slate-100 mb-4">
                    Lista de Materiais por projeto
                  </h2>
                  <ConciliacaoListas />
                </section>
              </TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent
            value="itens-cliente"
            className="m-0 border-none outline-none h-full flex flex-col overflow-hidden"
          >
            <ItensCliente />
          </TabsContent>
          <TabsContent
            value="separacao"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <CaixasVirtuais />
          </TabsContent>
          <TabsContent
            value="sobras"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <GestaoSobras />
          </TabsContent>
          <TabsContent
            value="consumo-interno"
            className="m-0 border-none outline-none h-full overflow-y-auto pb-20"
          >
            <RelatorioConsumoInterno />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
