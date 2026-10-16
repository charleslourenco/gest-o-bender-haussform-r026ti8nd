import { getFaseFluxo } from '@/lib/pcp-fases'

const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

/**
 * Critério ÚNICO da carteira "Projetos para Agendar" (lista e badges):
 * - visível no PCP, não arquivado e não excluído em nenhuma linha;
 * - sem NENHUM agendamento de produção (semana, dia ou mês);
 * - etapa antes da montagem (análise ou produção); pendência fica fora.
 * Vale igualmente para card pai, pai virtual e subcard.
 */
export function isCardParaAgendar(c: any): boolean {
  if (!c) return false
  if (c.visivel_pcp === false) return false
  if (c.arquivado_analise || c.arquivado_producao || c.arquivado_montagem) return false
  if (c.excluido_analise || c.excluido_producao || c.excluido_montagem) return false
  if (!vazio(c.semana_planejada_producao)) return false
  if (!vazio(c.data_planejada_producao)) return false
  if (!vazio(c.mes_planejado_producao)) return false
  const fase = getFaseFluxo(c.status_analise || 'iniciar')
  if (!fase) return true
  if (fase.etapa === 'montagem' || fase.etapa === 'bloqueio') return false
  return true
}

export function contarCardsParaAgendar(cards: any[] | null | undefined): number {
  if (!Array.isArray(cards)) return 0
  return cards.filter(isCardParaAgendar).length
}
