export interface DashboardData {
  totalLeads: number
  leadsVendidos: number
  taxaConversaoLead: number
  chartOrigem: { name: string; value: number }[]
  chartConsultores: {
    name: string
    atendimentos: number
    vendas: number
    conversao: number
    valor: number
  }[]
  totalValorVendas: number
  totalAnalise: number
  chartAnalistas: { name: string; value: number }[]
  chartFaseAnalise: { name: string; value: number }[]
  totalProd: number
  chartFaseProd: { name: string; value: number }[]
  totalMont: number
  chartFaseMont: { name: string; value: number }[]
  chartMontadores: { name: string; value: number }[]
}
