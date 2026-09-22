import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Printer,
  Eye,
  EyeOff,
  Layers,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { PcpCardItem } from '@/services/pcp-planejamento'
import { formatBRL } from '@/lib/pcp-capacity'
import { safeFormatDatePtBr } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase/client'

export interface PcpOrdemProducaoModalProps {
  open: boolean
  onClose: () => void
  card: PcpCardItem | null
}

interface AmbienteItemFicha {
  cardId: string
  codigoRastreio: string
  nomeAmbiente: string
  descricao: string
  valor: number
  qtd: number
  materialCorBorda?: string
  ferragensAcessorios?: string
  observacoesTecnicas?: string
  itensDetalhados?: Array<{
    itemModulo: string
    qtdDimensoes: string
    materialCorBorda: string
    ferragensAcessorios: string
    observacoesTecnicas: string
  }>
}

/**
 * Normaliza e parseia a descrição técnica de um produto/serviço para preencher as colunas:
 * - Item / Módulo
 * - Qtd / Dimensões
 * - Material / Cor / Borda
 * - Ferragens & Acessórios
 * - Observações Técnicas
 */
function parseDescricaoTecnica(
  nomeAmbiente: string,
  rawDescricao: string | null | undefined,
  qtdPadrao = 1,
) {
  const desc = (rawDescricao || '').trim()
  if (!desc) {
    return [
      {
        itemModulo: nomeAmbiente || 'Ambiente Completo',
        qtdDimensoes: `${qtdPadrao} un`,
        materialCorBorda: 'Conforme Caderno Técnico / Projeto',
        ferragensAcessorios: 'Padrão Hafele / Hettich conforme memorial',
        observacoesTecnicas: 'Seguir especificações do projeto executivo',
      },
    ]
  }

  // Tentar quebrar por linhas ou pontuações se o texto for estruturado
  const linhas = desc
    .split(/\r?\n|•|\.(?=\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2)

  if (linhas.length <= 1) {
    // Tenta identificar padrões como "MDF", "Corrediça", "Dobradiça", "Puxador"
    let matCor = ''
    let ferragens = ''
    let obs = ''

    const parts = desc.split('. ')
    for (const p of parts) {
      const lower = p.toLowerCase()
      if (
        lower.includes('mdf') ||
        lower.includes('tamponamento') ||
        lower.includes('caixaria') ||
        lower.includes('frente') ||
        lower.includes('acabamento') ||
        lower.includes('vidro') ||
        lower.includes('espelho')
      ) {
        matCor += (matCor ? '. ' : '') + p.trim()
      } else if (
        lower.includes('dobradiça') ||
        lower.includes('corrediça') ||
        lower.includes('puxador') ||
        lower.includes('hafele') ||
        lower.includes('hettich') ||
        lower.includes('amortecimento') ||
        lower.includes('ferragem') ||
        lower.includes('perfil') ||
        lower.includes('trilho')
      ) {
        ferragens += (ferragens ? '. ' : '') + p.trim()
      } else {
        obs += (obs ? '. ' : '') + p.trim()
      }
    }

    return [
      {
        itemModulo: nomeAmbiente || 'Módulos do Ambiente',
        qtdDimensoes: `${qtdPadrao} un`,
        materialCorBorda: matCor || 'MDF conforme caderno de corte',
        ferragensAcessorios: ferragens || 'Ferragens conforme caderno técnico',
        observacoesTecnicas: obs || desc,
      },
    ]
  }

  // Múltiplas linhas: agrupa de forma legível
  return linhas.map((linha, idx) => {
    const lower = linha.toLowerCase()
    let mat = '-'
    let ferr = '-'
    let obs = linha

    if (
      lower.includes('mdf') ||
      lower.includes('caixaria') ||
      lower.includes('tamponamento') ||
      lower.includes('frente')
    ) {
      mat = linha
      obs = 'Conforme memorial de corte'
    } else if (
      lower.includes('dobradiça') ||
      lower.includes('corrediça') ||
      lower.includes('puxador') ||
      lower.includes('hettich') ||
      lower.includes('hafele')
    ) {
      ferr = linha
      obs = 'Instalação com amortecimento'
    }

    return {
      itemModulo: `${nomeAmbiente} - Item ${idx + 1}`,
      qtdDimensoes: `${qtdPadrao} un`,
      materialCorBorda: mat !== '-' ? mat : 'MDF 15mm/18mm c/ borda conforme caderno',
      ferragensAcessorios: ferr !== '-' ? ferr : 'Ferragens conforme projeto executivo',
      observacoesTecnicas: obs,
    }
  })
}

export const PcpOrdemProducaoModal: React.FC<PcpOrdemProducaoModalProps> = ({
  open,
  onClose,
  card,
}) => {
  const [ocultarValores, setOcultarValores] = useState(true)
  const [modoEmissao, setModoEmissao] = useState<'consolidada' | 'individual'>('consolidada')
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState<string>('todos')
  const [subcardsDoPai, setSubcardsDoPai] = useState<PcpCardItem[]>([])
  const [carregandoSubcards, setCarregandoSubcards] = useState(false)
  const [empresaDados, setEmpresaDados] = useState<{ nome: string; logo_url: string | null }>({
    nome: 'Bender Haussform',
    logo_url: null,
  })

  const printAreaRef = useRef<HTMLDivElement>(null)

  const isSubcard = Boolean(card?.card_pai_id)

  // Carregar dados da empresa (nome e logo)
  useEffect(() => {
    supabase
      .from('empresa')
      .select('nome, logo_url')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmpresaDados({
            nome: data.nome || 'Bender Haussform',
            logo_url: data.logo_url || null,
          })
        }
      })
      .catch(() => {})
  }, [])

  // Se for card pai, carregar os subcards do banco de dados para garantir lista completa
  useEffect(() => {
    if (!open || !card) {
      setSubcardsDoPai([])
      return
    }

    if (isSubcard) {
      setModoEmissao('individual')
      setAmbienteSelecionadoId(card.id)
      return
    }

    // Card Pai: carregar todos os subcards vinculados
    setCarregandoSubcards(true)
    supabase
      .from('produtos_servicos_projeto')
      .select(
        'id, nome_produto, descricao, qtd, valor_unitario, valor_total, codigo_rastreio, card_pai_id, semana_planejada_producao, data_planejada_producao, data_prometida_montagem, data_obra_montagem',
      )
      .eq('card_pai_id', card.id)
      .eq('excluido_analise', false)
      .eq('excluido_producao', false)
      .order('criado_em', { ascending: true })
      .then(({ data, error }) => {
        if (!error && Array.isArray(data) && data.length > 0) {
          setSubcardsDoPai(data as PcpCardItem[])
        } else {
          setSubcardsDoPai([])
        }
      })
      .finally(() => {
        setCarregandoSubcards(false)
      })
  }, [open, card?.id, isSubcard])

  // Resetar modo ao abrir
  useEffect(() => {
    if (open) {
      if (isSubcard) {
        setModoEmissao('individual')
        setAmbienteSelecionadoId(card?.id || '')
      } else {
        setModoEmissao('consolidada')
        setAmbienteSelecionadoId('todos')
      }
    }
  }, [open, isSubcard, card?.id])

  if (!card) return null

  // Identificação do Cliente
  const clienteNome =
    card.cliente?.nome ||
    card.formulario?.cliente?.nome ||
    card.formulario?.nome_cliente ||
    'Cliente não informado'

  // Empreendimento / Endereço da obra
  const empreendimento =
    (card.formulario as any)?.obra_bairro || (card.formulario as any)?.obra_municipio
      ? [(card.formulario as any)?.obra_bairro, (card.formulario as any)?.obra_municipio]
          .filter(Boolean)
          .join(' - ')
      : card.cliente?.endereco_obra || card.cliente?.cidade || 'Não informado'

  // Data de Início Programada na Fábrica (Semana ISO + Dia)
  const semanaFabrica = card.semana_planejada_producao || 'Não agendada'
  const dataFabricaDia = card.data_planejada_producao
    ? safeFormatDatePtBr(card.data_planejada_producao)
    : 'Dia a definir'
  const programacaoFabricaDisplay = `${semanaFabrica} | ${dataFabricaDia}`

  // Data Prometida de Montagem na Obra
  const dataPrometidaMontagem =
    card.data_prometida_montagem ||
    (card.formulario as any)?.datas?.data_entrega_maxima ||
    (card.formulario as any)?.datas?.data_entrega_minima ||
    (card.formulario as any)?.data_prevista_entrega ||
    card.data_obra_montagem
  const dataMontagemDisplay = safeFormatDatePtBr(dataPrometidaMontagem)

  // Itens que farão parte da OP de acordo com o modo escolhido
  const ambientesParaOP: AmbienteItemFicha[] = useMemo(() => {
    const list: AmbienteItemFicha[] = []

    // Caso 1: OP Individual de um Subcard direto
    if (isSubcard) {
      const itensDetalhados = parseDescricaoTecnica(
        card.nome_produto,
        card.descricao,
        card.qtd || 1,
      )
      list.push({
        cardId: card.id,
        codigoRastreio: card.codigo_rastreio || 'OP-S/N',
        nomeAmbiente: card.nome_produto || 'Ambiente',
        descricao: card.descricao || '',
        valor: Number(card.valor_total) || 0,
        qtd: Number(card.qtd) || 1,
        itensDetalhados,
      })
      return list
    }

    // Caso 2: Card Pai com Subcards
    const temSubs = subcardsDoPai.length > 0
    if (temSubs) {
      if (modoEmissao === 'individual' && ambienteSelecionadoId !== 'todos') {
        const sub = subcardsDoPai.find((s) => s.id === ambienteSelecionadoId)
        if (sub) {
          const itensDetalhados = parseDescricaoTecnica(
            sub.nome_produto,
            sub.descricao,
            sub.qtd || 1,
          )
          list.push({
            cardId: sub.id,
            codigoRastreio: sub.codigo_rastreio || card.codigo_rastreio || 'OP-S/N',
            nomeAmbiente: sub.nome_produto,
            descricao: sub.descricao || '',
            valor: Number(sub.valor_total) || 0,
            qtd: Number(sub.qtd) || 1,
            itensDetalhados,
          })
          return list
        }
      }

      // Consolidada com todos os subcards
      for (const sub of subcardsDoPai) {
        const itensDetalhados = parseDescricaoTecnica(sub.nome_produto, sub.descricao, sub.qtd || 1)
        list.push({
          cardId: sub.id,
          codigoRastreio: sub.codigo_rastreio || card.codigo_rastreio || 'OP-S/N',
          nomeAmbiente: sub.nome_produto,
          descricao: sub.descricao || '',
          valor: Number(sub.valor_total) || 0,
          qtd: Number(sub.qtd) || 1,
          itensDetalhados,
        })
      }
      return list
    }

    // Caso 3: Card Pai isolado (sem subcards cadastrados no banco)
    // Tenta ler produtos_servicos do formulário comercial se existir
    const formPs = card.formulario?.produtos_servicos
    let produtosJson: any[] = []
    if (Array.isArray(formPs)) {
      produtosJson = formPs
    } else if (typeof formPs === 'string') {
      try {
        produtosJson = JSON.parse(formPs)
      } catch {
        produtosJson = []
      }
    }

    if (produtosJson.length > 0) {
      if (modoEmissao === 'individual' && ambienteSelecionadoId !== 'todos') {
        const itemP = produtosJson.find(
          (p: any) => String(p.id || p.nome) === ambienteSelecionadoId,
        )
        if (itemP) {
          const nomeAmb = itemP.nome || 'Ambiente'
          const itensDetalhados = parseDescricaoTecnica(
            nomeAmb,
            itemP.descricao,
            Number(itemP.qtd) || 1,
          )
          list.push({
            cardId: String(itemP.id || card.id),
            codigoRastreio: card.codigo_rastreio || 'OP-S/N',
            nomeAmbiente: nomeAmb,
            descricao: itemP.descricao || '',
            valor: Number(itemP.valor_unitario || itemP.valor_total) || 0,
            qtd: Number(itemP.qtd) || 1,
            itensDetalhados,
          })
          return list
        }
      }

      // Consolidada de todos do JSON
      for (const itemP of produtosJson) {
        const nomeAmb = itemP.nome || 'Ambiente'
        const itensDetalhados = parseDescricaoTecnica(
          nomeAmb,
          itemP.descricao,
          Number(itemP.qtd) || 1,
        )
        list.push({
          cardId: String(itemP.id || card.id),
          codigoRastreio: card.codigo_rastreio || 'OP-S/N',
          nomeAmbiente: nomeAmb,
          descricao: itemP.descricao || '',
          valor: Number(itemP.valor_unitario || itemP.valor_total) || 0,
          qtd: Number(itemP.qtd) || 1,
          itensDetalhados,
        })
      }
      return list
    }

    // Fallback: Card único
    const itensDetalhados = parseDescricaoTecnica(card.nome_produto, card.descricao, card.qtd || 1)
    list.push({
      cardId: card.id,
      codigoRastreio: card.codigo_rastreio || 'OP-S/N',
      nomeAmbiente: card.nome_produto,
      descricao: card.descricao || '',
      valor: Number(card.valor_total) || 0,
      qtd: Number(card.qtd) || 1,
      itensDetalhados,
    })
    return list
  }, [card, isSubcard, subcardsDoPai, modoEmissao, ambienteSelecionadoId])

  // Totalizador de valor
  const valorTotalOP = useMemo(() => {
    return ambientesParaOP.reduce((acc, it) => acc + (it.valor || 0), 0)
  }, [ambientesParaOP])

  // Código de exibição no cabeçalho
  const codigoExibicao =
    modoEmissao === 'individual' && ambientesParaOP.length === 1
      ? ambientesParaOP[0].codigoRastreio
      : card.codigo_rastreio || 'OP-CONSOLIDADA'

  // Título do Ambiente / Projeto
  const ambienteTituloDisplay =
    modoEmissao === 'individual' && ambientesParaOP.length === 1
      ? ambientesParaOP[0].nomeAmbiente.toUpperCase()
      : `CONSOLIDADO: ${card.nome_produto.toUpperCase()} (${ambientesParaOP.length} AMBIENTE${ambientesParaOP.length > 1 ? 'S' : ''})`

  // Disparo de impressão limpa
  const handlePrint = () => {
    window.print()
  }

  // Lista de opções para seleção de ambiente individual (quando for card pai)
  const opcoesAmbientesPai = useMemo(() => {
    if (subcardsDoPai.length > 0) {
      return subcardsDoPai.map((s) => ({
        id: s.id,
        nome: s.nome_produto,
        codigo: s.codigo_rastreio,
      }))
    }
    const formPs = card.formulario?.produtos_servicos
    if (Array.isArray(formPs) && formPs.length > 0) {
      return formPs.map((p: any) => ({
        id: String(p.id || p.nome),
        nome: p.nome,
        codigo: null,
      }))
    }
    return []
  }, [subcardsDoPai, card.formulario?.produtos_servicos])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 h-[92vh] max-h-[92vh] flex flex-col bg-card border-border overflow-hidden">
        {/* CABEÇALHO DO MODAL (NÃO APARECE NO PRINT) */}
        <div className="p-4 border-b border-border bg-card shrink-0 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <DialogHeader className="text-left">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                Ordem de Produção (OP) — Ficha de Fábrica
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Emissão técnica em formato A4 para o chão de fábrica e acompanhamento operacional
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Controles de emissão */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor Consolidada vs Individual (apenas para Card Pai com ambientes) */}
            {!isSubcard && opcoesAmbientesPai.length > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/60">
                <Button
                  type="button"
                  size="sm"
                  variant={modoEmissao === 'consolidada' ? 'default' : 'ghost'}
                  onClick={() => {
                    setModoEmissao('consolidada')
                    setAmbienteSelecionadoId('todos')
                  }}
                  className="h-7 text-xs px-2.5"
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  Consolidada ({opcoesAmbientesPai.length})
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={modoEmissao === 'individual' ? 'default' : 'ghost'}
                  onClick={() => {
                    setModoEmissao('individual')
                    if (ambienteSelecionadoId === 'todos' && opcoesAmbientesPai[0]) {
                      setAmbienteSelecionadoId(opcoesAmbientesPai[0].id)
                    }
                  }}
                  className="h-7 text-xs px-2.5"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Por Ambiente
                </Button>
              </div>
            )}

            {/* Dropdown de escolha do ambiente quando modo individual estiver ativo */}
            {!isSubcard && modoEmissao === 'individual' && opcoesAmbientesPai.length > 0 && (
              <select
                value={ambienteSelecionadoId}
                onChange={(e) => setAmbienteSelecionadoId(e.target.value)}
                className="h-8 text-xs font-semibold px-2 rounded-md bg-background border border-border text-foreground"
              >
                {opcoesAmbientesPai.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.codigo ? `[${opt.codigo}] ` : ''}
                    {opt.nome}
                  </option>
                ))}
              </select>
            )}

            {/* Toggle de Sigilo de Valores */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
              {ocultarValores ? (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-primary" />
              )}
              <Label htmlFor="toggle-sigilo" className="text-xs font-medium cursor-pointer">
                {ocultarValores ? 'Valores Ocultos (Fábrica)' : 'Valores Visíveis'}
              </Label>
              <Switch
                id="toggle-sigilo"
                checked={!ocultarValores}
                onCheckedChange={(checked) => setOcultarValores(!checked)}
              />
            </div>

            {/* Botão Imprimir */}
            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="h-8 px-3 text-xs font-bold gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="w-4 h-4" />
              Imprimir OP (A4)
            </Button>
          </div>
        </div>

        {/* ÁREA DE PRINT PREVIEW SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/20 flex justify-center">
          {/* FOLHA A4 SIMULADA */}
          <div
            ref={printAreaRef}
            id="print-area-op"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl border border-border p-6 sm:p-8 flex flex-col justify-between print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:min-h-0 print:h-auto font-sans"
            style={{
              colorScheme: 'light',
            }}
          >
            {/* SEÇÃO (A) CABEÇALHO DA FÁBRICA */}
            <header className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {empresaDados.logo_url ? (
                    <img
                      src={empresaDados.logo_url}
                      alt={empresaDados.nome}
                      className="h-10 max-w-[140px] object-contain"
                    />
                  ) : (
                    <div className="h-10 px-2 rounded bg-slate-900 text-white flex items-center justify-center font-black text-xs tracking-wider">
                      {empresaDados.nome.toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                      ORDEM DE PRODUÇÃO (OP) - PCP OPERAÇÕES
                    </h1>
                    <p className="text-[10px] text-slate-600 font-medium tracking-wide uppercase mt-1">
                      {empresaDados.nome} • Gestão Industrial e Fabricação Sob Medida
                    </p>
                  </div>
                </div>

                {/* Código único do Subcard/Card Pai em fonte grande/destacada */}
                <div className="text-right shrink-0">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 block">
                    Código de Rastreio OP
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 bg-slate-100 border border-slate-300 px-3 py-1 rounded">
                    {codigoExibicao}
                  </div>
                </div>
              </div>

              {/* Grid de Metadados Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-300 text-xs">
                {/* 1. Nome do Cliente */}
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Nome do Cliente:
                  </span>
                  <strong className="text-sm font-bold text-slate-900 uppercase">
                    {clienteNome}
                  </strong>
                </div>

                {/* 2. Empreendimento / Endereço */}
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Empreendimento / Endereço:
                  </span>
                  <p
                    className="text-xs font-semibold text-slate-800 truncate"
                    title={empreendimento}
                  >
                    {empreendimento}
                  </p>
                </div>

                {/* 3. Nome do Ambiente */}
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Nome do Ambiente:
                  </span>
                  <strong className="text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                    {ambienteTituloDisplay}
                  </strong>
                </div>

                {/* 4. Valor R$ com toggle de sigilo */}
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                    Valor R$ (Contrato / Ambiente):
                  </span>
                  {ocultarValores ? (
                    <span className="text-xs font-semibold text-slate-500 italic">
                      [ OCULTO - SIGILO CHÃO DE FÁBRICA ]
                    </span>
                  ) : (
                    <strong className="text-xs font-bold text-slate-900">
                      {formatBRL(valorTotalOP)}
                    </strong>
                  )}
                </div>

                {/* 5. Data de Início Programada na Fábrica (Semana ISO + Dia) */}
                <div className="sm:col-span-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-600 uppercase block">
                    Início Programado na Fábrica:
                  </span>
                  <strong className="text-xs font-bold text-slate-900">
                    {programacaoFabricaDisplay}
                  </strong>
                </div>

                {/* 6. Data Prometida de Montagem na Obra */}
                <div className="sm:col-span-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-600 uppercase block">
                    Prometida p/ Montagem na Obra:
                  </span>
                  <strong className="text-xs font-bold text-slate-900">
                    {dataMontagemDisplay}
                  </strong>
                </div>
              </div>
            </header>

            {/* SEÇÃO (B) DETALHAMENTO DO AMBIENTE */}
            <main className="flex-1 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-400 pb-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Detalhamento Técnico de Produtos & Serviços
                </h2>
                <span className="text-[10px] text-slate-600 font-medium">
                  {ambientesParaOP.length} ambiente(s) listado(s)
                </span>
              </div>

              {ambientesParaOP.map((amb, ambIdx) => (
                <div
                  key={amb.cardId || ambIdx}
                  className="border border-slate-300 rounded overflow-hidden"
                >
                  {/* Cabeçalho do Ambiente */}
                  <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 uppercase">
                        {amb.nomeAmbiente}
                      </span>
                      {amb.codigoRastreio && (
                        <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-slate-300">
                          {amb.codigoRastreio}
                        </span>
                      )}
                    </div>
                    {!ocultarValores && amb.valor > 0 && (
                      <span className="text-xs font-bold text-slate-900">
                        {formatBRL(amb.valor)}
                      </span>
                    )}
                  </div>

                  {/* Tabela de Itens / Módulos / Ferragens */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-700 border-b border-slate-300">
                        <th className="py-1.5 px-2.5 w-[24%] border-r border-slate-200">
                          Item / Módulo
                        </th>
                        <th className="py-1.5 px-2 w-[12%] text-center border-r border-slate-200">
                          Qtd / Dim.
                        </th>
                        <th className="py-1.5 px-2.5 w-[24%] border-r border-slate-200">
                          Material / Cor / Borda
                        </th>
                        <th className="py-1.5 px-2.5 w-[20%] border-r border-slate-200">
                          Ferragens & Acessórios
                        </th>
                        <th className="py-1.5 px-2.5 w-[20%]">Observações Técnicas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {amb.itensDetalhados && amb.itensDetalhados.length > 0 ? (
                        amb.itensDetalhados.map((it, itIdx) => (
                          <tr key={itIdx} className="align-top">
                            <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-slate-200">
                              {it.itemModulo}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-800 border-r border-slate-200">
                              {it.qtdDimensoes}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-800 border-r border-slate-200">
                              {it.materialCorBorda}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-800 border-r border-slate-200">
                              {it.ferragensAcessorios}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-700 italic">
                              {it.observacoesTecnicas}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-2 px-3 text-center text-slate-500 italic">
                            Nenhuma especificação cadastrada para este ambiente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </main>

            {/* SEÇÃO (C) PROTOCOLO DE ACOMPANHAMENTO DO CHÃO DE FÁBRICA */}
            <footer className="mt-6 pt-3 border-t-2 border-slate-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  Protocolo de Acompanhamento do Chão de Fábrica (Vistos Obrigatórios)
                </h3>
                <span className="text-[9px] text-slate-500 uppercase font-mono">
                  OP Gerada em: {new Date().toLocaleDateString('pt-BR')} às{' '}
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Tabela de Visto/Assinatura Manual conforme especificação exata */}
              <table className="w-full text-left text-xs border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-800 border-b border-slate-400">
                    <th className="py-1 px-3 w-[8%] text-center border-r border-slate-300">
                      Visto
                    </th>
                    <th className="py-1 px-3 w-[32%] border-r border-slate-300">Etapa Produtiva</th>
                    <th className="py-1 px-3 w-[25%] border-r border-slate-300">Data Conclusão</th>
                    <th className="py-1 px-3 w-[35%]">Responsável (Assinatura / Carimbo)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-[11px]">
                  <tr>
                    <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-300">
                      [ &nbsp; ]
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-300">
                      Corte / Router
                    </td>
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-300">
                      Data: &nbsp; ___ / ___ / ______
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      Responsável: _______________________
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-300">
                      [ &nbsp; ]
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-300">
                      Coladeira de Borda
                    </td>
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-300">
                      Data: &nbsp; ___ / ___ / ______
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      Responsável: _______________________
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-300">
                      [ &nbsp; ]
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-300">
                      Usinagem / Furação
                    </td>
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-300">
                      Data: &nbsp; ___ / ___ / ______
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      Responsável: _______________________
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-300">
                      [ &nbsp; ]
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-300">
                      Pre-Montagem / Bancada
                    </td>
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-300">
                      Data: &nbsp; ___ / ___ / ______
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      Responsável: _______________________
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-300">
                      [ &nbsp; ]
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-300">
                      Embalagem / Expedição
                    </td>
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-300">
                      Data: &nbsp; ___ / ___ / ______
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      Responsável: _______________________
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-2 text-[9px] text-slate-500 text-center uppercase tracking-wide">
                * Esta ficha deve acompanhar os volumes em todas as etapas fabris até o embarque na
                expedição.
              </div>
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
