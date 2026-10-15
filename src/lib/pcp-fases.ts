export type EtapaFluxo = 'analise' | 'producao' | 'montagem' | 'bloqueio'
export interface FaseFluxo {
  ordem: number
  pct: number
  etapa: EtapaFluxo
  label: string
}
export const FASES_FLUXO: Record<string, FaseFluxo> = {
  iniciar: { ordem: 0, pct: 0, etapa: 'analise', label: 'Iniciar' },
  aguardando_liberacao: { ordem: 1, pct: 15, etapa: 'analise', label: 'Aguardando liberação' },
  medida_fina: { ordem: 2, pct: 35, etapa: 'analise', label: 'Medida fina' },
  reuniao_analise: { ordem: 3, pct: 50, etapa: 'analise', label: 'Reunião de análise' },
  caderno_tecnico: { ordem: 4, pct: 65, etapa: 'analise', label: 'Caderno técnico' },
  alteracao_projeto: { ordem: 5, pct: 75, etapa: 'analise', label: 'Alteração de projeto' },
  lista_materiais: { ordem: 6, pct: 90, etapa: 'analise', label: 'Lista de materiais' },
  aguardando_plano_corte: {
    ordem: 7,
    pct: 100,
    etapa: 'producao',
    label: 'Aguardando plano de corte',
  },
  router: { ordem: 8, pct: 100, etapa: 'producao', label: 'Router' },
  coladeira: { ordem: 9, pct: 100, etapa: 'producao', label: 'Coladeira' },
  bancada: { ordem: 10, pct: 100, etapa: 'producao', label: 'Bancada' },
  embalagem: { ordem: 11, pct: 100, etapa: 'producao', label: 'Embalagem' },
  expedicao: { ordem: 12, pct: 100, etapa: 'producao', label: 'Expedição' },
  aguardando_agenda: { ordem: 13, pct: 100, etapa: 'montagem', label: 'Aguardando agenda' },
  transporte: { ordem: 14, pct: 100, etapa: 'montagem', label: 'Transporte' },
  inicio_montagem: { ordem: 15, pct: 100, etapa: 'montagem', label: 'Início de montagem' },
  montagem: { ordem: 16, pct: 100, etapa: 'montagem', label: 'Em montagem' },
  item_terceirizado: { ordem: 16, pct: 100, etapa: 'montagem', label: 'Item terceirizado' },
  assistencia: { ordem: 17, pct: 100, etapa: 'montagem', label: 'Assistência' },
  concluido: { ordem: 18, pct: 100, etapa: 'montagem', label: 'Concluído' },
  pendencia: { ordem: -1, pct: 0, etapa: 'bloqueio', label: 'Pendência' },
}
export function getFaseFluxo(status?: string | null): FaseFluxo | null {
  const s = (status || '').trim().toLowerCase()
  return FASES_FLUXO[s] || null
}
// Análise técnica concluída = fase com pct 100 (de aguardando_plano_corte em diante)
export function isAnaliseConcluidaPorFase(status?: string | null): boolean {
  const f = getFaseFluxo(status)
  return !!f && f.pct === 100
}
// Percentual de prontidão técnica de um card (regra única)
export function getProntidaoPercentual(card: {
  status_analise?: string | null
  is_outsourced?: boolean | null
  terceirizado_validado?: boolean | null
}): { pct: number; label: string } {
  const f = getFaseFluxo(card.status_analise || 'iniciar')
  if (f && f.etapa === 'bloqueio') return { pct: 0, label: 'Pendência (0%)' }
  if (card.is_outsourced && !card.terceirizado_validado)
    return { pct: 25, label: 'Terceirizado (25%)' }
  if (!f) return { pct: 0, label: 'Etapa desconhecida (0%)' }
  return { pct: f.pct, label: f.pct === 100 ? '100% (Pronto)' : `${f.pct}%` }
}
