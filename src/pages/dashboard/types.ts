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
  qtd_vendas_com_standby?: number
  ciclo_medio_com_standby?: number | null
  ciclo_min_com_standby?: number | null
  ciclo_max_com_standby?: number | null
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
  geral_com_standby?: CicloVendasGeral
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

export interface StatusContagemItem {
  status: string
  qtd: number
}

export interface OrigemContagemItem {
  origem: string
  qtd: number
}

export interface OrigemDespachoPerdaItem {
  origem: string
  total_leads: number
  despachados: number
  taxa_despacho: number
  perdidos: number
  taxa_perda: number
}

export interface OrigemDespachoPerdaComparativoItem extends OrigemDespachoPerdaItem {
  // Dados do período anterior equivalente
  prev_total_leads?: number
  prev_despachados?: number
  prev_taxa_despacho?: number
  prev_perdidos?: number
  prev_taxa_perda?: number
  // Variações absolutas e percentuais
  delta_total_leads?: number
  delta_despachados?: number
  delta_taxa_despacho?: number // pp (pontos percentuais)
  delta_perdidos?: number
  delta_taxa_perda?: number // pp (pontos percentuais)
}

export interface NovoContatoMetrics {
  total: number
  criados_no_periodo: number
  despachados_real?: number
  por_status: StatusContagemItem[]
  por_origem: OrigemContagemItem[]
  taxa_despacho: number
  origens_despacho_perda?: OrigemDespachoPerdaItem[]
}

export interface ConsultoriaMetrics {
  total: number
  por_status: StatusContagemItem[]
  por_origem: OrigemContagemItem[]
  vendidos: number
  taxa_conversao: number
  ticket_medio_consultoria: number
  ciclo_medio_dias: number | null
}

export interface OrcamentosMetrics {
  total: number
  por_status: StatusContagemItem[]
  por_origem: OrigemContagemItem[]
  convertidos: number
  taxa_conversao: number
  ticket_medio_orcamentos: number
  ciclo_medio_dias: number | null
}

export interface TempoColunaItem {
  coluna: string
  qtd_cards: number
  tempo_medio_dias: number
  tempo_max_dias: number
}

export interface TempoColunasMetrics {
  novo_contato: TempoColunaItem[]
  consultoria: TempoColunaItem[]
  orcamentos: TempoColunaItem[]
}

export interface ReguaCoorteItem {
  safra_iso?: string
  safra?: string
  total_chegados?: number
  fechados_ate_hoje?: number
  taxa_conversao?: number
  perdidos?: number
  ainda_em_aberto?: number
  meses_atras?: number
  rotulo_mes?: string
  mes_iso?: string
  total_leads_coorte?: number
  convertidos_ate_hoje?: number
  taxa_conversao_coorte?: number
}

export interface TopEstagnadoItem {
  id: string
  nome: string
  status: string
  esteira: string
  dias_parado: number
}

export interface RaioXAtualMetrics {
  total_ativos: number
  media_dias_parado: number
  mais_90_dias: number
  entre_60_90_dias: number
  entre_30_60_dias: number
  menos_30_dias: number
  top_estagnados: TopEstagnadoItem[]
}

export interface PerformancePeriodoMetrics {
  vendas_concluidas: number
  vendas_com_data: number
  leads_chegados: number
  consultorias_iniciadas: number
  perdas_periodo: number
  ticket_medio_periodo: number
  valor_total_vendas: number
  taxa_conversao_periodo: number
  status_taxa: 'em_construcao' | string
}

export interface RaioXEstagnados {
  parados_mais_30d: number
  parados_mais_60d: number
  parados_mais_90d: number
  total_ativos: number
}

export interface AtendimentosMetrics {
  total_leads: number
  convertidos: number
  taxa_conversao: number
  media_dia: number
  vendas_com_data_qtd?: number
  vendas_total_para_cobertura?: number
  vendas_periodo_qtd?: number
  vendas_periodo_valor?: number
  vendas_periodo_ticket_medio?: number
  consultorias_iniciadas_periodo?: number
  performance_periodo?: PerformancePeriodoMetrics
  raio_x_atual?: RaioXAtualMetrics
  regua_coortes?: ReguaCoorteItem[]
  raio_x_estagnados?: RaioXEstagnados
  status_atendimento?: StatusAtendimentoItem[]
  origens?: OrigemItem[]
  ticket_medio_origens?: OrigemTicket[]
  ciclo_vendas?: CicloVendasMetrics
  motivos_perda?: MotivosPerdaMetrics
  evolucao_mensal?: EvolucaoMensalItem[]
  dias_semana?: DiaSemanaItem[]
  leads_sem_origem?: LeadsSemOrigemItem
  leads_sem_consultor_consultoria?: LeadsSemOrigemItem
  novo_contato?: NovoContatoMetrics
  consultoria?: ConsultoriaMetrics
  orcamentos?: OrcamentosMetrics
  tempo_colunas?: TempoColunasMetrics
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

export interface ConsultorDesempenho {
  consultor: string
  total_leads: number
  vendidos: number
  taxa_conversao: number
  ciclo_medio_dias: number | null
  ciclo_medio_com_standby?: number | null
  valor_total: number
  ticket_medio: number
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
  por_consultor?: ConsultorDesempenho[]
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
