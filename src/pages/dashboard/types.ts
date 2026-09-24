export interface StatusAtendimentoItem {
  status: string
  count: number
}

export interface OrigemItem {
  origem: string
  total: number
  convertidos: number
  taxa: number
}

export interface EvolucaoMensalItem {
  mes_iso: string
  mes: string
  leads: number
  vendidos: number
}

export interface DiaSemanaItem {
  dow: number
  dia: string
  total: number
}

export interface LeadsSemOrigemItem {
  total: number
  convertidos: number
}

export interface OrigemTicket {
  origem: string
  qtd_vendas: number
  valor_total: number
  ticket_medio: number
}

export interface CicloOrigem {
  origem: string
  qtd_vendas: number
  ciclo_medio_dias: number
  ciclo_min_dias: number
  ciclo_max_dias: number
}

export interface CicloVendasGeral {
  media_dias: number
  mediana_dias: number
  min_dias: number
  max_dias: number
  qtd_vendas: number
}

export interface CicloVendasMetrics {
  geral: CicloVendasGeral
  por_origem: CicloOrigem[]
}

export interface MotivoPerdaRanking {
  motivo: string
  qtd_perdas: number
}

export interface EtapaPerdaRanking {
  etapa: string
  qtd_perdas: number
}

export interface MotivosPerdaMetrics {
  total_perdas: number
  por_motivo: MotivoPerdaRanking[]
  por_etapa: EtapaPerdaRanking[]
  qtd_outro?: number
}

export interface AtendimentosMetrics {
  total_leads: number
  convertidos: number
  taxa_conversao: number
  media_dia: number
  vendas_com_data_qtd?: number
  vendas_total_para_cobertura?: number
  status_atendimento: StatusAtendimentoItem[]
  origens: OrigemItem[]
  ticket_medio_origens?: OrigemTicket[]
  ciclo_vendas?: CicloVendasMetrics
  motivos_perda?: MotivosPerdaMetrics
  evolucao_mensal: EvolucaoMensalItem[]
  dias_semana: DiaSemanaItem[]
  leads_sem_origem?: LeadsSemOrigemItem
}

export interface RankingConsultorItem {
  consultor: string
  vendas: number
  valor_total: number
  ticket_medio: number
  ticket_mediana?: number
  menor_ticket: number
  maior_ticket: number
}

export interface ClientesMetrics {
  novos_clientes: number
  valor_vendido: number
  valor_vendido_fechado?: number
  ticket_medio: number
  ticket_mediana?: number
  menor_ticket: number
  maior_ticket: number
  total_formularios_valor?: number
  total_formularios_vendidos?: number
  maior_ticket_percentual?: number
  ranking_consultores: RankingConsultorItem[]
}

export interface FaseAmbienteItem {
  fase: string
  count: number
}

export interface TempoFaseItem {
  fase: string
  media_dias: number | null
  transicoes_registradas: number
  is_gargalo: boolean
}

export interface CargaAnalistaItem {
  analista: string
  ambientes: number
  clientes: number
}

export interface CargaMontadorItem {
  montador: string
  telefone?: string
  status?: string
  ambientes_alocados: number
}

export interface PcpMetrics {
  total_ambientes: number
  total_clientes: number
  ambientes_por_cliente: number
  tempo_total_medio_dias: number | null
  taxa_pendencias: number
  fases_ambientes: FaseAmbienteItem[]
  tempo_fases: TempoFaseItem[]
  fase_gargalo?: string | null
  carga_analista: CargaAnalistaItem[]
  carga_montagem: CargaMontadorItem[]
}

export interface ColaboradorCLTItem {
  id: string
  nome_completo: string
  data_admissao?: string
  data_nascimento?: string
  telefone?: string
  email?: string
  municipio?: string
  idade?: number
  meses_empresa?: number
}

export interface ParceiroPJItem {
  id: string
  razao_social: string
  cnpj?: string
  socio_nome?: string
  telefone?: string
  email?: string
  criado_em?: string
  meses_parceria?: number
}

export interface FornecedorItem {
  id: string
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  telefone?: string
  email?: string
  municipio?: string
  criado_em?: string
}

export interface AniversarianteItem {
  nome: string
  tipo: string
  data_nascimento?: string
  dia_mes: string
  dia: number
}

export interface DistribuicaoTempoItem {
  faixa: string
  total: number
}

export interface GestaoPessoasMetrics {
  total_clt: number
  total_pj: number
  total_montadores: number
  total_fornecedores: number
  idade_media_clt: number
  tempo_medio_meses_clt: number
  lista_clt: ColaboradorCLTItem[]
  lista_pj: ParceiroPJItem[]
  lista_fornecedores: FornecedorItem[]
  aniversariantes: AniversarianteItem[]
  distribuicao_tempo_casa: DistribuicaoTempoItem[]
}

export interface FullDashboardMetrics {
  atendimentos: AtendimentosMetrics
  clientes: ClientesMetrics
  pcp: PcpMetrics
  gestao_pessoas: GestaoPessoasMetrics
}
