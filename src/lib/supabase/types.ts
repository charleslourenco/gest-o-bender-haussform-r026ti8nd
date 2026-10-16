// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acompanhamentos: {
        Row: {
          arquivado_acompanhamento: boolean
          codigo_projeto: string | null
          data_atualizacao: string
          data_criacao: string
          data_manual: string | null
          id: string
          nome_cliente: string | null
          observacoes: string | null
          quantidade_itens: number | null
          responsavel_id: string | null
          status_atual: string | null
          tipo_acompanhamento: string | null
        }
        Insert: {
          arquivado_acompanhamento?: boolean
          codigo_projeto?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_manual?: string | null
          id?: string
          nome_cliente?: string | null
          observacoes?: string | null
          quantidade_itens?: number | null
          responsavel_id?: string | null
          status_atual?: string | null
          tipo_acompanhamento?: string | null
        }
        Update: {
          arquivado_acompanhamento?: boolean
          codigo_projeto?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_manual?: string | null
          id?: string
          nome_cliente?: string | null
          observacoes?: string | null
          quantidade_itens?: number | null
          responsavel_id?: string | null
          status_atual?: string | null
          tipo_acompanhamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis_acompanhamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      acompanhamentos_historico: {
        Row: {
          acompanhamento_id: string | null
          data_mudanca: string
          id: string
          responsavel_mudanca: string | null
          status_anterior: string | null
          status_novo: string | null
        }
        Insert: {
          acompanhamento_id?: string | null
          data_mudanca?: string
          id?: string
          responsavel_mudanca?: string | null
          status_anterior?: string | null
          status_novo?: string | null
        }
        Update: {
          acompanhamento_id?: string | null
          data_mudanca?: string
          id?: string
          responsavel_mudanca?: string | null
          status_anterior?: string | null
          status_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acompanhamentos_historico_acompanhamento_id_fkey"
            columns: ["acompanhamento_id"]
            isOneToOne: false
            referencedRelation: "acompanhamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      aliquotas_fiscais: {
        Row: {
          aliquota_percentual: number
          ativo: boolean
          atualizado_em: string
          base_calculo_percentual: number | null
          criado_em: string
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          descricao: string | null
          id: string
          nome_imposto: string
          regime_tributario: string
        }
        Insert: {
          aliquota_percentual: number
          ativo?: boolean
          atualizado_em?: string
          base_calculo_percentual?: number | null
          criado_em?: string
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          descricao?: string | null
          id?: string
          nome_imposto: string
          regime_tributario: string
        }
        Update: {
          aliquota_percentual?: number
          ativo?: boolean
          atualizado_em?: string
          base_calculo_percentual?: number | null
          criado_em?: string
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          descricao?: string | null
          id?: string
          nome_imposto?: string
          regime_tributario?: string
        }
        Relationships: []
      }
      alocacao_montagem: {
        Row: {
          card_id: string
          criado_em: string
          id: string
          montador_id: string | null
          pessoa_id: string | null
          pessoa_nome: string | null
          tipo_origem: string | null
        }
        Insert: {
          card_id: string
          criado_em?: string
          id?: string
          montador_id?: string | null
          pessoa_id?: string | null
          pessoa_nome?: string | null
          tipo_origem?: string | null
        }
        Update: {
          card_id?: string
          criado_em?: string
          id?: string
          montador_id?: string | null
          pessoa_id?: string | null
          pessoa_nome?: string | null
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alocacao_montagem_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos_projeto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacao_montagem_montador_id_fkey"
            columns: ["montador_id"]
            isOneToOne: false
            referencedRelation: "montadores"
            referencedColumns: ["id"]
          },
        ]
      }
      ambientes: {
        Row: {
          cliente_id: string | null
          criado_em: string
          descricao: string | null
          id: string
          metragem: number | null
          nome: string
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          metragem?: number | null
          nome: string
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          metragem?: number | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      assinantes: {
        Row: {
          assinado_em: string | null
          assinatura_base64: string | null
          codigo_expira_em: string | null
          codigo_verificacao: string | null
          cpf: string | null
          data_nascimento: string | null
          email: string | null
          envelope_id: string | null
          id: string
          ip_address: string | null
          nome_completo: string
          papel: string
          papel_descricao: string | null
          status: string | null
          tipo_assinatura: string | null
          token_acesso: string | null
        }
        Insert: {
          assinado_em?: string | null
          assinatura_base64?: string | null
          codigo_expira_em?: string | null
          codigo_verificacao?: string | null
          cpf?: string | null
          data_nascimento?: string | null
          email?: string | null
          envelope_id?: string | null
          id?: string
          ip_address?: string | null
          nome_completo: string
          papel: string
          papel_descricao?: string | null
          status?: string | null
          tipo_assinatura?: string | null
          token_acesso?: string | null
        }
        Update: {
          assinado_em?: string | null
          assinatura_base64?: string | null
          codigo_expira_em?: string | null
          codigo_verificacao?: string | null
          cpf?: string | null
          data_nascimento?: string | null
          email?: string | null
          envelope_id?: string | null
          id?: string
          ip_address?: string | null
          nome_completo?: string
          papel?: string
          papel_descricao?: string | null
          status?: string | null
          tipo_assinatura?: string | null
          token_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinantes_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes_assinatura"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          assinatura_imagem: string | null
          cliente_id: string | null
          clt_id: string | null
          codigo_confirmacao: string
          criado_em: string
          data_assinatura: string | null
          documento_id: string
          documento_nome: string
          expira_em: string
          id: string
          ip_assinatura: string | null
          pj_id: string | null
          signatario_cpf: string | null
          signatario_data_nascimento: string | null
          signatario_email: string | null
          signatario_nome: string
          signatario_telefone: string | null
          signatario_tipo: string
          status: string
        }
        Insert: {
          assinatura_imagem?: string | null
          cliente_id?: string | null
          clt_id?: string | null
          codigo_confirmacao: string
          criado_em?: string
          data_assinatura?: string | null
          documento_id: string
          documento_nome: string
          expira_em: string
          id?: string
          ip_assinatura?: string | null
          pj_id?: string | null
          signatario_cpf?: string | null
          signatario_data_nascimento?: string | null
          signatario_email?: string | null
          signatario_nome: string
          signatario_telefone?: string | null
          signatario_tipo: string
          status?: string
        }
        Update: {
          assinatura_imagem?: string | null
          cliente_id?: string | null
          clt_id?: string | null
          codigo_confirmacao?: string
          criado_em?: string
          data_assinatura?: string | null
          documento_id?: string
          documento_nome?: string
          expira_em?: string
          id?: string
          ip_assinatura?: string | null
          pj_id?: string | null
          signatario_cpf?: string | null
          signatario_data_nascimento?: string | null
          signatario_email?: string | null
          signatario_nome?: string
          signatario_telefone?: string | null
          signatario_tipo?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_clt_id_fkey"
            columns: ["clt_id"]
            isOneToOne: false
            referencedRelation: "equipe_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "parceiros_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_leads_data_venda_20261013: {
        Row: {
          copiado_em: string | null
          data_venda: string | null
          id: string | null
          status: string | null
        }
        Insert: {
          copiado_em?: string | null
          data_venda?: string | null
          id?: string | null
          status?: string | null
        }
        Update: {
          copiado_em?: string | null
          data_venda?: string | null
          id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      backup_leads_gemeos_20261013: {
        Row: {
          arquivado_comercial: boolean | null
          atualizado_em: string | null
          backup_em: string | null
          categoria: string | null
          consultor_id: string | null
          consultor_id_secundario: string | null
          criado_em: string | null
          criado_por_nome: string | null
          data_venda: string | null
          email: string | null
          etapa_perda: string | null
          excluido: boolean | null
          id: string | null
          kanban_ativo: boolean | null
          motivo_perda: string | null
          nome: string | null
          notas: string | null
          notas_pessoais: string | null
          ordem: number | null
          origem: string | null
          origem_pessoa: string | null
          status: string | null
          status_atendimento: string | null
          telefone: string | null
        }
        Insert: {
          arquivado_comercial?: boolean | null
          atualizado_em?: string | null
          backup_em?: string | null
          categoria?: string | null
          consultor_id?: string | null
          consultor_id_secundario?: string | null
          criado_em?: string | null
          criado_por_nome?: string | null
          data_venda?: string | null
          email?: string | null
          etapa_perda?: string | null
          excluido?: boolean | null
          id?: string | null
          kanban_ativo?: boolean | null
          motivo_perda?: string | null
          nome?: string | null
          notas?: string | null
          notas_pessoais?: string | null
          ordem?: number | null
          origem?: string | null
          origem_pessoa?: string | null
          status?: string | null
          status_atendimento?: string | null
          telefone?: string | null
        }
        Update: {
          arquivado_comercial?: boolean | null
          atualizado_em?: string | null
          backup_em?: string | null
          categoria?: string | null
          consultor_id?: string | null
          consultor_id_secundario?: string | null
          criado_em?: string | null
          criado_por_nome?: string | null
          data_venda?: string | null
          email?: string | null
          etapa_perda?: string | null
          excluido?: boolean | null
          id?: string | null
          kanban_ativo?: boolean | null
          motivo_perda?: string | null
          nome?: string | null
          notas?: string | null
          notas_pessoais?: string | null
          ordem?: number | null
          origem?: string | null
          origem_pessoa?: string | null
          status?: string | null
          status_atendimento?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      backup_leads_gemeos_msgs_sess_20261013: {
        Row: {
          lead_id: string | null
          reg_id: string | null
          tabela: string | null
        }
        Insert: {
          lead_id?: string | null
          reg_id?: string | null
          tabela?: string | null
        }
        Update: {
          lead_id?: string | null
          reg_id?: string | null
          tabela?: string | null
        }
        Relationships: []
      }
      backup_psp_semana_label_20261015: {
        Row: {
          atualizado_em: string | null
          backup_em: string | null
          id: string | null
          semana_analise_inicio: string | null
          semana_montagem_inicio: string | null
          semana_planejada_analise: string | null
          semana_planejada_montagem: string | null
          semana_planejada_producao: string | null
          semana_producao_inicio: string | null
        }
        Insert: {
          atualizado_em?: string | null
          backup_em?: string | null
          id?: string | null
          semana_analise_inicio?: string | null
          semana_montagem_inicio?: string | null
          semana_planejada_analise?: string | null
          semana_planejada_montagem?: string | null
          semana_planejada_producao?: string | null
          semana_producao_inicio?: string | null
        }
        Update: {
          atualizado_em?: string | null
          backup_em?: string | null
          id?: string | null
          semana_analise_inicio?: string | null
          semana_montagem_inicio?: string | null
          semana_planejada_analise?: string | null
          semana_planejada_montagem?: string | null
          semana_planejada_producao?: string | null
          semana_producao_inicio?: string | null
        }
        Relationships: []
      }
      backup_psp_status_pcp_20261016: {
        Row: {
          backup_em: string | null
          id: string | null
          status_analise: string | null
          status_pcp: string | null
        }
        Insert: {
          backup_em?: string | null
          id?: string | null
          status_analise?: string | null
          status_pcp?: string | null
        }
        Update: {
          backup_em?: string | null
          id?: string | null
          status_analise?: string | null
          status_pcp?: string | null
        }
        Relationships: []
      }
      backup_psp_terceirizado_validado_20261015: {
        Row: {
          atualizado_em: string | null
          backup_em: string | null
          id: string | null
          is_outsourced: boolean | null
          nome_produto: string | null
          outsourced_checked: boolean | null
          status_analise: string | null
          terceirizado_validado: boolean | null
        }
        Insert: {
          atualizado_em?: string | null
          backup_em?: string | null
          id?: string | null
          is_outsourced?: boolean | null
          nome_produto?: string | null
          outsourced_checked?: boolean | null
          status_analise?: string | null
          terceirizado_validado?: boolean | null
        }
        Update: {
          atualizado_em?: string | null
          backup_em?: string | null
          id?: string | null
          is_outsourced?: boolean | null
          nome_produto?: string | null
          outsourced_checked?: boolean | null
          status_analise?: string | null
          terceirizado_validado?: boolean | null
        }
        Relationships: []
      }
      backup_whatsapp_messages_lid_20261013: {
        Row: {
          backup_em: string | null
          content: string | null
          created_at: string | null
          direction: string | null
          external_id: string | null
          id: string | null
          lead_id: string | null
          metadata: Json | null
          phone: string | null
          sender_name: string | null
          sender_type: string | null
        }
        Insert: {
          backup_em?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string | null
          external_id?: string | null
          id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          phone?: string | null
          sender_name?: string | null
          sender_type?: string | null
        }
        Update: {
          backup_em?: string | null
          content?: string | null
          created_at?: string | null
          direction?: string | null
          external_id?: string | null
          id?: string | null
          lead_id?: string | null
          metadata?: Json | null
          phone?: string | null
          sender_name?: string | null
          sender_type?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          criado_em: string
          data_abertura: string | null
          data_nascimento: string | null
          email: string
          endereco_obra: string | null
          estado: string | null
          excluido: boolean
          id: string
          inscricao_estadual: string | null
          lead_id: string | null
          metragem_total: number | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          profissao: string | null
          referencia_bancaria: string | null
          renda: number | null
          status: string
          telefone: string
          telefone_digitos: string | null
          tipo_imovel: string | null
          tipo_pessoa: string | null
          usuario_id: string | null
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string
          data_abertura?: string | null
          data_nascimento?: string | null
          email: string
          endereco_obra?: string | null
          estado?: string | null
          excluido?: boolean
          id?: string
          inscricao_estadual?: string | null
          lead_id?: string | null
          metragem_total?: number | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          profissao?: string | null
          referencia_bancaria?: string | null
          renda?: number | null
          status?: string
          telefone: string
          telefone_digitos?: string | null
          tipo_imovel?: string | null
          tipo_pessoa?: string | null
          usuario_id?: string | null
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string
          data_abertura?: string | null
          data_nascimento?: string | null
          email?: string
          endereco_obra?: string | null
          estado?: string | null
          excluido?: boolean
          id?: string
          inscricao_estadual?: string | null
          lead_id?: string | null
          metragem_total?: number | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          profissao?: string | null
          referencia_bancaria?: string | null
          renda?: number | null
          status?: string
          telefone?: string
          telefone_digitos?: string | null
          tipo_imovel?: string | null
          tipo_pessoa?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_fiscais: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          id: string
          observacoes: string | null
          regime_tributario: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          id?: string
          observacoes?: string | null
          regime_tributario: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          id?: string
          observacoes?: string | null
          regime_tributario?: string
        }
        Relationships: []
      }
      configuracoes_sistema: {
        Row: {
          atualizado_em: string
          id: string
          markup_prazo: number
          markup_vista: number
        }
        Insert: {
          atualizado_em?: string
          id?: string
          markup_prazo?: number
          markup_vista?: number
        }
        Update: {
          atualizado_em?: string
          id?: string
          markup_prazo?: number
          markup_vista?: number
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          agencia: string | null
          atualizado_em: string
          banco: string | null
          criado_em: string
          id: string
          nome_exibicao: string
          numero_conta: string | null
          saldo_atual: number
          saldo_inicial: number
          status: boolean
        }
        Insert: {
          agencia?: string | null
          atualizado_em?: string
          banco?: string | null
          criado_em?: string
          id?: string
          nome_exibicao: string
          numero_conta?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          status?: boolean
        }
        Update: {
          agencia?: string | null
          atualizado_em?: string
          banco?: string | null
          criado_em?: string
          id?: string
          nome_exibicao?: string
          numero_conta?: string | null
          saldo_atual?: number
          saldo_inicial?: number
          status?: boolean
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          antecipado: boolean | null
          atualizado_em: string
          categoria: string | null
          categoria_id: string | null
          cliente_id: string | null
          codigo_barras: string | null
          comprovante_url: string | null
          conta_bancaria_id: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string | null
          formulario_comercial_id: string | null
          fornecedor: string
          grupo_id: string | null
          id: string
          meio_pagamento: string | null
          natureza: string | null
          nota_fiscal_id: string | null
          observacoes: string | null
          status_pagamento: string
          user_id: string | null
          valor: number
        }
        Insert: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          codigo_barras?: string | null
          comprovante_url?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          formulario_comercial_id?: string | null
          fornecedor: string
          grupo_id?: string | null
          id?: string
          meio_pagamento?: string | null
          natureza?: string | null
          nota_fiscal_id?: string | null
          observacoes?: string | null
          status_pagamento?: string
          user_id?: string | null
          valor: number
        }
        Update: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          codigo_barras?: string | null
          comprovante_url?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          formulario_comercial_id?: string | null
          fornecedor?: string
          grupo_id?: string | null
          id?: string
          meio_pagamento?: string | null
          natureza?: string | null
          nota_fiscal_id?: string | null
          observacoes?: string | null
          status_pagamento?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_formulario_comercial_id_fkey"
            columns: ["formulario_comercial_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_notas_fiscais"
            referencedColumns: ["nota_id"]
          },
          {
            foreignKeyName: "contas_pagar_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_notas_fiscais_conferencia"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar_divisoes: {
        Row: {
          conta_pagar_id: string
          criado_em: string
          descricao: string
          id: string
          valor: number
        }
        Insert: {
          conta_pagar_id: string
          criado_em?: string
          descricao: string
          id?: string
          valor: number
        }
        Update: {
          conta_pagar_id?: string
          criado_em?: string
          descricao?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_divisoes_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          antecipado: boolean | null
          atualizado_em: string
          categoria: string | null
          categoria_id: string | null
          cliente_id: string | null
          comprovante_url: string | null
          conta_bancaria_id: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          formulario_comercial_id: string | null
          grupo_id: string | null
          id: string
          meio_pagamento: string | null
          natureza: string | null
          numero_parcela: string
          observacoes: string | null
          status_pagamento: string
          user_id: string | null
          valor: number
        }
        Insert: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          formulario_comercial_id?: string | null
          grupo_id?: string | null
          id?: string
          meio_pagamento?: string | null
          natureza?: string | null
          numero_parcela: string
          observacoes?: string | null
          status_pagamento?: string
          user_id?: string | null
          valor: number
        }
        Update: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          conta_bancaria_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          formulario_comercial_id?: string | null
          grupo_id?: string | null
          id?: string
          meio_pagamento?: string | null
          natureza?: string | null
          numero_parcela?: string
          observacoes?: string | null
          status_pagamento?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_formulario_comercial_id_fkey"
            columns: ["formulario_comercial_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_cliente: {
        Row: {
          arquivo_assinado_url: string | null
          arquivo_url: string | null
          atualizado_em: string | null
          cliente_id: string | null
          conteudo_preenchido: string | null
          criado_em: string
          envelope_id: string | null
          id: string
          is_digital: boolean | null
          projeto_id: string | null
          status: string
          template_id: string | null
          template_nome: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          arquivo_assinado_url?: string | null
          arquivo_url?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          conteudo_preenchido?: string | null
          criado_em?: string
          envelope_id?: string | null
          id?: string
          is_digital?: boolean | null
          projeto_id?: string | null
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          arquivo_assinado_url?: string | null
          arquivo_url?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          conteudo_preenchido?: string | null
          criado_em?: string
          envelope_id?: string | null
          id?: string
          is_digital?: boolean | null
          projeto_id?: string | null
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_cliente_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes_assinatura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_cliente_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_cliente_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_equipe: {
        Row: {
          arquivo_assinado_url: string | null
          arquivo_url: string
          clt_id: string | null
          criado_em: string | null
          envelope_id: string | null
          id: string
          nome: string
          pj_id: string | null
          tipo: string | null
        }
        Insert: {
          arquivo_assinado_url?: string | null
          arquivo_url: string
          clt_id?: string | null
          criado_em?: string | null
          envelope_id?: string | null
          id?: string
          nome: string
          pj_id?: string | null
          tipo?: string | null
        }
        Update: {
          arquivo_assinado_url?: string | null
          arquivo_url?: string
          clt_id?: string | null
          criado_em?: string | null
          envelope_id?: string | null
          id?: string
          nome?: string
          pj_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_equipe_clt_id_fkey"
            columns: ["clt_id"]
            isOneToOne: false
            referencedRelation: "equipe_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_equipe_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "envelopes_assinatura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_equipe_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "parceiros_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_gerados: {
        Row: {
          cliente_id: string | null
          criado_em: string
          id: string
          nome: string
          path: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          id?: string
          nome: string
          path: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          id?: string
          nome?: string
          path?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_gerados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      dossies: {
        Row: {
          arquivo_projeto_url: string | null
          ata_reuniao_url: string | null
          atualizado_em: string
          caderno_tecnico_url: string | null
          cliente_id: string | null
          contrato_url: string | null
          criado_em: string
          drafts_medida_url: string | null
          formulario_comercial_id: string | null
          id: string
          renders_url: string | null
          status: string
          termo_conclusao_url: string | null
          termo_garantia_url: string | null
          user_id: string | null
        }
        Insert: {
          arquivo_projeto_url?: string | null
          ata_reuniao_url?: string | null
          atualizado_em?: string
          caderno_tecnico_url?: string | null
          cliente_id?: string | null
          contrato_url?: string | null
          criado_em?: string
          drafts_medida_url?: string | null
          formulario_comercial_id?: string | null
          id?: string
          renders_url?: string | null
          status?: string
          termo_conclusao_url?: string | null
          termo_garantia_url?: string | null
          user_id?: string | null
        }
        Update: {
          arquivo_projeto_url?: string | null
          ata_reuniao_url?: string | null
          atualizado_em?: string
          caderno_tecnico_url?: string | null
          cliente_id?: string | null
          contrato_url?: string | null
          criado_em?: string
          drafts_medida_url?: string | null
          formulario_comercial_id?: string | null
          id?: string
          renders_url?: string | null
          status?: string
          termo_conclusao_url?: string | null
          termo_garantia_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossies_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossies_formulario_comercial_id_fkey"
            columns: ["formulario_comercial_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      envelopes_assinatura: {
        Row: {
          cliente_id: string | null
          clt_id: string | null
          codigo_verificacao: string | null
          concluido_em: string | null
          criado_em: string | null
          criado_por: string | null
          documento_id: string
          id: string
          nome_documento: string
          pj_id: string | null
          signatario_cpf: string | null
          signatario_email: string | null
          signatario_nome: string | null
          status: string | null
          token_acesso: string | null
        }
        Insert: {
          cliente_id?: string | null
          clt_id?: string | null
          codigo_verificacao?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          documento_id: string
          id?: string
          nome_documento: string
          pj_id?: string | null
          signatario_cpf?: string | null
          signatario_email?: string | null
          signatario_nome?: string | null
          status?: string | null
          token_acesso?: string | null
        }
        Update: {
          cliente_id?: string | null
          clt_id?: string | null
          codigo_verificacao?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          documento_id?: string
          id?: string
          nome_documento?: string
          pj_id?: string | null
          signatario_cpf?: string | null
          signatario_email?: string | null
          signatario_nome?: string | null
          status?: string | null
          token_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envelopes_assinatura_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envelopes_assinatura_clt_id_fkey"
            columns: ["clt_id"]
            isOneToOne: false
            referencedRelation: "equipe_clt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envelopes_assinatura_pj_id_fkey"
            columns: ["pj_id"]
            isOneToOne: false
            referencedRelation: "parceiros_pj"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_clt: {
        Row: {
          areas_atuacao: string[] | null
          atualizado_em: string | null
          bairro: string | null
          cep: string | null
          cnh: string | null
          cnh_categoria: string | null
          complemento: string | null
          cpf: string | null
          criado_em: string | null
          ctps: string | null
          data_admissao: string | null
          data_nascimento: string | null
          email: string | null
          estado: string | null
          ferias_adiantadas_dias: number | null
          id: string
          montador_id: string | null
          municipio: string | null
          nome_completo: string
          numero: string | null
          observacoes: string | null
          pis: string | null
          rg: string | null
          rua: string | null
          salario_base: number | null
          telefone: string | null
        }
        Insert: {
          areas_atuacao?: string[] | null
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cnh?: string | null
          cnh_categoria?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string | null
          ctps?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          ferias_adiantadas_dias?: number | null
          id?: string
          montador_id?: string | null
          municipio?: string | null
          nome_completo: string
          numero?: string | null
          observacoes?: string | null
          pis?: string | null
          rg?: string | null
          rua?: string | null
          salario_base?: number | null
          telefone?: string | null
        }
        Update: {
          areas_atuacao?: string[] | null
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cnh?: string | null
          cnh_categoria?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string | null
          ctps?: string | null
          data_admissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          ferias_adiantadas_dias?: number | null
          id?: string
          montador_id?: string | null
          municipio?: string | null
          nome_completo?: string
          numero?: string | null
          observacoes?: string | null
          pis?: string | null
          rg?: string | null
          rua?: string | null
          salario_base?: number | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_clt_montador_id_fkey"
            columns: ["montador_id"]
            isOneToOne: false
            referencedRelation: "montadores"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_alocacoes: {
        Row: {
          baixado_em: string | null
          baixado_por: string | null
          cliente_id: string | null
          cliente_nome: string
          criado_em: string
          destino: string | null
          id: string
          item_id: string
          quantidade: number
          status: string
          valor_total_congelado: number | null
          valor_unitario_congelado: number | null
        }
        Insert: {
          baixado_em?: string | null
          baixado_por?: string | null
          cliente_id?: string | null
          cliente_nome: string
          criado_em?: string
          destino?: string | null
          id?: string
          item_id: string
          quantidade: number
          status?: string
          valor_total_congelado?: number | null
          valor_unitario_congelado?: number | null
        }
        Update: {
          baixado_em?: string | null
          baixado_por?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          criado_em?: string
          destino?: string | null
          id?: string
          item_id?: string
          quantidade?: number
          status?: string
          valor_total_congelado?: number | null
          valor_unitario_congelado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_alocacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_alocacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_caixas: {
        Row: {
          assinado_em: string | null
          atualizado_em: string
          cliente_id: string | null
          comprovante_url: string | null
          criado_em: string
          destino: string
          id: string
          nome: string
          projeto_id: string | null
          recebedor_cpf: string | null
          recebedor_nome: string | null
          status: string
        }
        Insert: {
          assinado_em?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          comprovante_url?: string | null
          criado_em?: string
          destino?: string
          id?: string
          nome: string
          projeto_id?: string | null
          recebedor_cpf?: string | null
          recebedor_nome?: string | null
          status?: string
        }
        Update: {
          assinado_em?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          comprovante_url?: string | null
          criado_em?: string
          destino?: string
          id?: string
          nome?: string
          projeto_id?: string | null
          recebedor_cpf?: string | null
          recebedor_nome?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_caixas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_caixas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_caixas_itens: {
        Row: {
          caixa_id: string | null
          criado_em: string
          id: string
          item_id: string | null
          quantidade: number
          status: string
        }
        Insert: {
          caixa_id?: string | null
          criado_em?: string
          id?: string
          item_id?: string | null
          quantidade: number
          status?: string
        }
        Update: {
          caixa_id?: string | null
          criado_em?: string
          id?: string
          item_id?: string | null
          quantidade?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_caixas_itens_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "estoque_caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_caixas_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_item_aliases: {
        Row: {
          criado_em: string
          descricao_normalizada: string | null
          descricao_nota: string
          id: string
          item_id: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          descricao_normalizada?: string | null
          descricao_nota: string
          id?: string
          item_id: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          descricao_normalizada?: string | null
          descricao_nota?: string
          id?: string
          item_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_item_aliases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_item_aliases_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_itens: {
        Row: {
          atualizado_em: string
          categoria: string | null
          classe: string | null
          comprimento_m: number | null
          cor: string | null
          criado_em: string
          espessura_mm: number | null
          estoque_minimo: number
          fornecedor: string | null
          grupo: string | null
          id: string
          largura_mm: number | null
          marca: string | null
          metadados_normalizados: Json | null
          nome: string
          quantidade: number
          terceirizado: boolean | null
          unidade: string
          valor_unitario: number
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          classe?: string | null
          comprimento_m?: number | null
          cor?: string | null
          criado_em?: string
          espessura_mm?: number | null
          estoque_minimo?: number
          fornecedor?: string | null
          grupo?: string | null
          id?: string
          largura_mm?: number | null
          marca?: string | null
          metadados_normalizados?: Json | null
          nome: string
          quantidade?: number
          terceirizado?: boolean | null
          unidade?: string
          valor_unitario?: number
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          classe?: string | null
          comprimento_m?: number | null
          cor?: string | null
          criado_em?: string
          espessura_mm?: number | null
          estoque_minimo?: number
          fornecedor?: string | null
          grupo?: string | null
          id?: string
          largura_mm?: number | null
          marca?: string | null
          metadados_normalizados?: Json | null
          nome?: string
          quantidade?: number
          terceirizado?: boolean | null
          unidade?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      estoque_itens_cliente: {
        Row: {
          assinado_em: string | null
          cliente_nome: string
          comprovante_url: string | null
          entregue_em: string | null
          id: string
          produto: string
          recebedor_cpf: string | null
          recebedor_nome: string | null
          recebido_em: string
          responsavel_entrega: string | null
          status: string | null
          usuario_id: string | null
        }
        Insert: {
          assinado_em?: string | null
          cliente_nome: string
          comprovante_url?: string | null
          entregue_em?: string | null
          id?: string
          produto: string
          recebedor_cpf?: string | null
          recebedor_nome?: string | null
          recebido_em?: string
          responsavel_entrega?: string | null
          status?: string | null
          usuario_id?: string | null
        }
        Update: {
          assinado_em?: string | null
          cliente_nome?: string
          comprovante_url?: string | null
          entregue_em?: string | null
          id?: string
          produto?: string
          recebedor_cpf?: string | null
          recebedor_nome?: string | null
          recebido_em?: string
          responsavel_entrega?: string | null
          status?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_estoque_itens_cliente_users"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          criado_em: string
          id: string
          item_id: string
          nota_fiscal_id: string | null
          pedido_id: string | null
          quantidade: number
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          id?: string
          item_id: string
          nota_fiscal_id?: string | null
          pedido_id?: string | null
          quantidade: number
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          id?: string
          item_id?: string
          nota_fiscal_id?: string | null
          pedido_id?: string | null
          quantidade?: number
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_notas_fiscais"
            referencedColumns: ["nota_id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_notas_fiscais_conferencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_sobras: {
        Row: {
          altura: number
          area: number
          baixado_por: string | null
          canal_baixa: string | null
          cliente_nome: string | null
          comprimento: number | null
          criado_em: string
          espessura: number | null
          id: string
          item_id: string | null
          largura: number
          marca: string | null
          nome: string
          restaurado_em: string | null
          restaurado_por: string | null
          status: string
          tipo: string | null
          usado_em: string | null
        }
        Insert: {
          altura: number
          area: number
          baixado_por?: string | null
          canal_baixa?: string | null
          cliente_nome?: string | null
          comprimento?: number | null
          criado_em?: string
          espessura?: number | null
          id?: string
          item_id?: string | null
          largura: number
          marca?: string | null
          nome: string
          restaurado_em?: string | null
          restaurado_por?: string | null
          status?: string
          tipo?: string | null
          usado_em?: string | null
        }
        Update: {
          altura?: number
          area?: number
          baixado_por?: string | null
          canal_baixa?: string | null
          cliente_nome?: string | null
          comprimento?: number | null
          criado_em?: string
          espessura?: number | null
          id?: string
          item_id?: string | null
          largura?: number
          marca?: string | null
          nome?: string
          restaurado_em?: string | null
          restaurado_por?: string | null
          status?: string
          tipo?: string | null
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_sobras_baixado_por_fkey"
            columns: ["baixado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_sobras_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_sobras_restaurado_por_fkey"
            columns: ["restaurado_por"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_comercial: {
        Row: {
          ambientes: Json | null
          arquivado: boolean | null
          arquivado_analise: boolean
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cliente_id: string | null
          complemento: string | null
          cpf: string | null
          criado_em: string
          data_abertura: string | null
          data_nascimento: string | null
          data_pagamento: string | null
          data_prevista_entrega: string | null
          datas: Json | null
          desconto: number | null
          especificacoes: string | null
          estado: string | null
          estado_civil: string | null
          etapa_atual: number | null
          id: string
          inscricao_estadual: string | null
          itens: Json | null
          lead_id: string
          metodo_pagamento: string | null
          municipio: string | null
          nome_cliente: string | null
          nome_fantasia: string | null
          numero: string | null
          obra_bairro: string | null
          obra_cep: string | null
          obra_complemento: string | null
          obra_estado: string | null
          obra_municipio: string | null
          obra_numero: string | null
          obra_rua: string | null
          pagamentos: Json | null
          parcelas: Json | null
          produtos_servicos: Json | null
          profissao: string | null
          rua: string | null
          status_analise_projeto: string | null
          tipo_pessoa: string | null
          user_id: string
          valor_total: number | null
        }
        Insert: {
          ambientes?: Json | null
          arquivado?: boolean | null
          arquivado_analise?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cliente_id?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string
          data_abertura?: string | null
          data_nascimento?: string | null
          data_pagamento?: string | null
          data_prevista_entrega?: string | null
          datas?: Json | null
          desconto?: number | null
          especificacoes?: string | null
          estado?: string | null
          estado_civil?: string | null
          etapa_atual?: number | null
          id?: string
          inscricao_estadual?: string | null
          itens?: Json | null
          lead_id: string
          metodo_pagamento?: string | null
          municipio?: string | null
          nome_cliente?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          obra_bairro?: string | null
          obra_cep?: string | null
          obra_complemento?: string | null
          obra_estado?: string | null
          obra_municipio?: string | null
          obra_numero?: string | null
          obra_rua?: string | null
          pagamentos?: Json | null
          parcelas?: Json | null
          produtos_servicos?: Json | null
          profissao?: string | null
          rua?: string | null
          status_analise_projeto?: string | null
          tipo_pessoa?: string | null
          user_id?: string
          valor_total?: number | null
        }
        Update: {
          ambientes?: Json | null
          arquivado?: boolean | null
          arquivado_analise?: boolean
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cliente_id?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string
          data_abertura?: string | null
          data_nascimento?: string | null
          data_pagamento?: string | null
          data_prevista_entrega?: string | null
          datas?: Json | null
          desconto?: number | null
          especificacoes?: string | null
          estado?: string | null
          estado_civil?: string | null
          etapa_atual?: number | null
          id?: string
          inscricao_estadual?: string | null
          itens?: Json | null
          lead_id?: string
          metodo_pagamento?: string | null
          municipio?: string | null
          nome_cliente?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          obra_bairro?: string | null
          obra_cep?: string | null
          obra_complemento?: string | null
          obra_estado?: string | null
          obra_municipio?: string | null
          obra_numero?: string | null
          obra_rua?: string | null
          pagamentos?: Json | null
          parcelas?: Json | null
          produtos_servicos?: Json | null
          profissao?: string | null
          rua?: string | null
          status_analise_projeto?: string | null
          tipo_pessoa?: string | null
          user_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "formulario_comercial_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulario_comercial_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cnpj: string
          complemento: string | null
          criado_em: string
          data_abertura: string | null
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          municipio: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cnpj: string
          complemento?: string | null
          criado_em?: string
          data_abertura?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cnpj?: string
          complemento?: string | null
          criado_em?: string
          data_abertura?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          telefone?: string | null
        }
        Relationships: []
      }
      historico_alocacao_montagem: {
        Row: {
          acao: string
          card_id: string
          criado_em: string
          id: string
          montador_id: string | null
          pessoa_id: string | null
          pessoa_nome: string | null
          tipo_origem: string | null
        }
        Insert: {
          acao: string
          card_id: string
          criado_em?: string
          id?: string
          montador_id?: string | null
          pessoa_id?: string | null
          pessoa_nome?: string | null
          tipo_origem?: string | null
        }
        Update: {
          acao?: string
          card_id?: string
          criado_em?: string
          id?: string
          montador_id?: string | null
          pessoa_id?: string | null
          pessoa_nome?: string | null
          tipo_origem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_alocacao_montagem_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos_projeto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_alocacao_montagem_montador_id_fkey"
            columns: ["montador_id"]
            isOneToOne: false
            referencedRelation: "montadores"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_nota_fiscal: {
        Row: {
          created_at: string
          id: string
          nome_produto: string
          nota_fiscal_id: string | null
          produto_id: string | null
          quantidade: number
          unidade: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome_produto: string
          nota_fiscal_id?: string | null
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          id?: string
          nome_produto?: string
          nota_fiscal_id?: string | null
          produto_id?: string | null
          quantidade?: number
          unidade?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_nota_fiscal_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_nota_fiscal_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_alertas_notas_fiscais"
            referencedColumns: ["nota_id"]
          },
          {
            foreignKeyName: "itens_nota_fiscal_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "vw_notas_fiscais_conferencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_nota_fiscal_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_historico: {
        Row: {
          card_id: string | null
          criado_em: string
          id: string
          status_anterior: string | null
          status_novo: string
          usuario_id: string | null
        }
        Insert: {
          card_id?: string | null
          criado_em?: string
          id?: string
          status_anterior?: string | null
          status_novo: string
          usuario_id?: string | null
        }
        Update: {
          card_id?: string | null
          criado_em?: string
          id?: string
          status_anterior?: string | null
          status_novo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kanban_historico_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos_projeto"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_eventos: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          criado_em: string
          de: string | null
          id: number
          lead_id: string
          para: string | null
          tipo: string
          via: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          criado_em?: string
          de?: string | null
          id?: never
          lead_id: string
          para?: string | null
          tipo: string
          via?: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          criado_em?: string
          de?: string | null
          id?: never
          lead_id?: string
          para?: string | null
          tipo?: string
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_eventos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_eventos_erros: {
        Row: {
          criado_em: string
          erro: string | null
          id: number
          lead_id: string | null
          origem: string | null
        }
        Insert: {
          criado_em?: string
          erro?: string | null
          id?: never
          lead_id?: string | null
          origem?: string | null
        }
        Update: {
          criado_em?: string
          erro?: string | null
          id?: never
          lead_id?: string | null
          origem?: string | null
        }
        Relationships: []
      }
      lead_fatos: {
        Row: {
          atualizado_em: string
          despachado_em: string | null
          despacho_destino: string | null
          despacho_fonte: string | null
          entrou_pela_triagem: boolean | null
          fase_atual: string | null
          fora_do_funil: boolean
          fora_do_funil_motivo: string | null
          lead_id: string
          perda_fase: string | null
          perda_fonte: string | null
          perda_motivo: string | null
          perdido_em: string | null
          porta_entrada: string | null
          sdr_id: string | null
          situacao: string | null
          situacao_em: string | null
          tem_formulario: boolean
          ultima_movimentacao_em: string | null
          ultima_movimentacao_fonte: string | null
          venda: boolean
          venda_data: string | null
          venda_desconsiderada: boolean
          venda_valor: number | null
        }
        Insert: {
          atualizado_em?: string
          despachado_em?: string | null
          despacho_destino?: string | null
          despacho_fonte?: string | null
          entrou_pela_triagem?: boolean | null
          fase_atual?: string | null
          fora_do_funil?: boolean
          fora_do_funil_motivo?: string | null
          lead_id: string
          perda_fase?: string | null
          perda_fonte?: string | null
          perda_motivo?: string | null
          perdido_em?: string | null
          porta_entrada?: string | null
          sdr_id?: string | null
          situacao?: string | null
          situacao_em?: string | null
          tem_formulario?: boolean
          ultima_movimentacao_em?: string | null
          ultima_movimentacao_fonte?: string | null
          venda?: boolean
          venda_data?: string | null
          venda_desconsiderada?: boolean
          venda_valor?: number | null
        }
        Update: {
          atualizado_em?: string
          despachado_em?: string | null
          despacho_destino?: string | null
          despacho_fonte?: string | null
          entrou_pela_triagem?: boolean | null
          fase_atual?: string | null
          fora_do_funil?: boolean
          fora_do_funil_motivo?: string | null
          lead_id?: string
          perda_fase?: string | null
          perda_fonte?: string | null
          perda_motivo?: string | null
          perdido_em?: string | null
          porta_entrada?: string | null
          sdr_id?: string | null
          situacao?: string | null
          situacao_em?: string | null
          tem_formulario?: boolean
          ultima_movimentacao_em?: string | null
          ultima_movimentacao_fonte?: string | null
          venda?: boolean
          venda_data?: string | null
          venda_desconsiderada?: boolean
          venda_valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_fatos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pendencias_tratadas: {
        Row: {
          acao: string
          ate: string | null
          autor_id: string | null
          autor_nome: string | null
          chave: string
          criado_em: string
          id: number
          lead_id: string
        }
        Insert: {
          acao: string
          ate?: string | null
          autor_id?: string | null
          autor_nome?: string | null
          chave: string
          criado_em?: string
          id?: never
          lead_id: string
        }
        Update: {
          acao?: string
          ate?: string | null
          autor_id?: string | null
          autor_nome?: string | null
          chave?: string
          criado_em?: string
          id?: never
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pendencias_tratadas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          arquivado_comercial: boolean
          atualizado_em: string
          categoria: string
          consultor_id: string | null
          consultor_id_secundario: string | null
          criado_em: string
          criado_por_nome: string | null
          data_venda: string | null
          email: string | null
          etapa_perda: string | null
          excluido: boolean
          id: string
          kanban_ativo: boolean
          motivo_perda: string | null
          nome: string
          notas: string | null
          notas_pessoais: string | null
          ordem: number
          origem: string
          origem_pessoa: string | null
          status: string
          status_atendimento: string | null
          status_desde: string | null
          telefone: string
          telefone_digitos: string | null
        }
        Insert: {
          arquivado_comercial?: boolean
          atualizado_em?: string
          categoria?: string
          consultor_id?: string | null
          consultor_id_secundario?: string | null
          criado_em?: string
          criado_por_nome?: string | null
          data_venda?: string | null
          email?: string | null
          etapa_perda?: string | null
          excluido?: boolean
          id?: string
          kanban_ativo?: boolean
          motivo_perda?: string | null
          nome: string
          notas?: string | null
          notas_pessoais?: string | null
          ordem?: number
          origem: string
          origem_pessoa?: string | null
          status?: string
          status_atendimento?: string | null
          status_desde?: string | null
          telefone: string
          telefone_digitos?: string | null
        }
        Update: {
          arquivado_comercial?: boolean
          atualizado_em?: string
          categoria?: string
          consultor_id?: string | null
          consultor_id_secundario?: string | null
          criado_em?: string
          criado_por_nome?: string | null
          data_venda?: string | null
          email?: string | null
          etapa_perda?: string | null
          excluido?: boolean
          id?: string
          kanban_ativo?: boolean
          motivo_perda?: string | null
          nome?: string
          notas?: string | null
          notas_pessoais?: string | null
          ordem?: number
          origem?: string
          origem_pessoa?: string | null
          status?: string
          status_atendimento?: string | null
          status_desde?: string | null
          telefone?: string
          telefone_digitos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_consultor_id_secundario_fkey"
            columns: ["consultor_id_secundario"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_status_historico: {
        Row: {
          criado_em: string | null
          id: string
          lead_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          criado_em?: string | null
          id?: string
          lead_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          criado_em?: string | null
          id?: string
          lead_id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_status_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_ia: {
        Row: {
          acao: string
          criado_em: string
          detalhes: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      matriz_permissoes: {
        Row: {
          criado_em: string
          id: string
          modulo: string
          nivel_acesso: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          modulo: string
          nivel_acesso: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          modulo?: string
          nivel_acesso?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriz_permissoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_arquivos_estaticos: {
        Row: {
          arquivo_url: string
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          arquivo_url: string
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          arquivo_url?: string
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      montadores: {
        Row: {
          atualizado_em: string
          comissao_percentual: number | null
          criado_em: string
          id: string
          nome_completo: string
          status: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          comissao_percentual?: number | null
          criado_em?: string
          id?: string
          nome_completo: string
          status?: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          comissao_percentual?: number | null
          criado_em?: string
          id?: string
          nome_completo?: string
          status?: string
          telefone?: string | null
        }
        Relationships: []
      }
      notas_fiscais: {
        Row: {
          arquivo_url: string | null
          conferida_em: string | null
          conferida_por: string | null
          criado_em: string
          dados_ocr: Json | null
          dados_ocr_original: Json | null
          data_emissao: string | null
          fornecedor: string
          id: string
          numero_nota: string | null
          observacao_conferencia: string | null
          pedido_id: string | null
          status_reconciliacao: string
          valor_desconto: number
          valor_frete: number
          valor_ipi: number
          valor_outras_despesas: number
          valor_produtos: number | null
          valor_seguro: number
          valor_st: number
          valor_total: number
        }
        Insert: {
          arquivo_url?: string | null
          conferida_em?: string | null
          conferida_por?: string | null
          criado_em?: string
          dados_ocr?: Json | null
          dados_ocr_original?: Json | null
          data_emissao?: string | null
          fornecedor: string
          id?: string
          numero_nota?: string | null
          observacao_conferencia?: string | null
          pedido_id?: string | null
          status_reconciliacao?: string
          valor_desconto?: number
          valor_frete?: number
          valor_ipi?: number
          valor_outras_despesas?: number
          valor_produtos?: number | null
          valor_seguro?: number
          valor_st?: number
          valor_total: number
        }
        Update: {
          arquivo_url?: string | null
          conferida_em?: string | null
          conferida_por?: string | null
          criado_em?: string
          dados_ocr?: Json | null
          dados_ocr_original?: Json | null
          data_emissao?: string | null
          fornecedor?: string
          id?: string
          numero_nota?: string | null
          observacao_conferencia?: string | null
          pedido_id?: string | null
          status_reconciliacao?: string
          valor_desconto?: number
          valor_frete?: number
          valor_ipi?: number
          valor_outras_despesas?: number
          valor_produtos?: number | null
          valor_seguro?: number
          valor_st?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          titulo: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          atualizado_em: string | null
          cliente_id: string | null
          criado_em: string
          data_pagamento: string | null
          data_primeira_parcela: string | null
          forma_pagamento: string
          formulario_id: string | null
          id: string
          meio_pagamento: string | null
          numero_parcelas: number | null
          tipo_pagamento: string | null
          valor_total: number
        }
        Insert: {
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_primeira_parcela?: string | null
          forma_pagamento: string
          formulario_id?: string | null
          id?: string
          meio_pagamento?: string | null
          numero_parcelas?: number | null
          tipo_pagamento?: string | null
          valor_total: number
        }
        Update: {
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_primeira_parcela?: string | null
          forma_pagamento?: string
          formulario_id?: string | null
          id?: string
          meio_pagamento?: string | null
          numero_parcelas?: number | null
          tipo_pagamento?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros_pj: {
        Row: {
          ajuda_custo: number | null
          areas_atuacao: string[] | null
          atualizado_em: string | null
          bairro: string | null
          cep: string | null
          cnpj: string | null
          comissoes: number | null
          complemento: string | null
          criado_em: string | null
          email: string | null
          estado: string | null
          id: string
          montador_id: string | null
          municipio: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          rua: string | null
          socio_cpf: string | null
          socio_data_nascimento: string | null
          socio_nome: string | null
          socio_rg: string | null
          telefone: string | null
        }
        Insert: {
          ajuda_custo?: number | null
          areas_atuacao?: string[] | null
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          comissoes?: number | null
          complemento?: string | null
          criado_em?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          montador_id?: string | null
          municipio?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          rua?: string | null
          socio_cpf?: string | null
          socio_data_nascimento?: string | null
          socio_nome?: string | null
          socio_rg?: string | null
          telefone?: string | null
        }
        Update: {
          ajuda_custo?: number | null
          areas_atuacao?: string[] | null
          atualizado_em?: string | null
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          comissoes?: number | null
          complemento?: string | null
          criado_em?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          montador_id?: string | null
          municipio?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          rua?: string | null
          socio_cpf?: string | null
          socio_data_nascimento?: string | null
          socio_nome?: string | null
          socio_rg?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parceiros_pj_montador_id_fkey"
            columns: ["montador_id"]
            isOneToOne: false
            referencedRelation: "montadores"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          atualizado_em: string | null
          criado_em: string
          data_vencimento: string
          id: string
          meio_pagamento: string | null
          numero: number
          numero_parcela: number | null
          pagamento_id: string | null
          status: string
          valor: number
          valor_parcela: number | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string
          data_vencimento: string
          id?: string
          meio_pagamento?: string | null
          numero: number
          numero_parcela?: number | null
          pagamento_id?: string | null
          status?: string
          valor: number
          valor_parcela?: number | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string
          data_vencimento?: string
          id?: string
          meio_pagamento?: string | null
          numero?: number
          numero_parcela?: number | null
          pagamento_id?: string | null
          status?: string
          valor?: number
          valor_parcela?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      pcp_reprogramacao_historico: {
        Row: {
          card_id: string
          criado_em: string
          data_anterior: string | null
          data_nova: string | null
          id: string
          linha_operacao: string
          mes_anterior: string | null
          mes_novo: string | null
          motivo: string | null
          semana_anterior: string | null
          semana_nova: string | null
          tipo_planejamento: string | null
          usuario_id: string | null
        }
        Insert: {
          card_id: string
          criado_em?: string
          data_anterior?: string | null
          data_nova?: string | null
          id?: string
          linha_operacao: string
          mes_anterior?: string | null
          mes_novo?: string | null
          motivo?: string | null
          semana_anterior?: string | null
          semana_nova?: string | null
          tipo_planejamento?: string | null
          usuario_id?: string | null
        }
        Update: {
          card_id?: string
          criado_em?: string
          data_anterior?: string | null
          data_nova?: string | null
          id?: string
          linha_operacao?: string
          mes_anterior?: string | null
          mes_novo?: string | null
          motivo?: string | null
          semana_anterior?: string | null
          semana_nova?: string | null
          tipo_planejamento?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pcp_reprogramacao_historico_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos_projeto"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_compra: {
        Row: {
          atualizado_em: string
          criado_em: string
          data_pedido: string
          fornecedor: string
          id: string
          notas: string | null
          status: string
          valor_total: number
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          data_pedido: string
          fornecedor: string
          id?: string
          notas?: string | null
          status?: string
          valor_total?: number
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          data_pedido?: string
          fornecedor?: string
          id?: string
          notas?: string | null
          status?: string
          valor_total?: number
        }
        Relationships: []
      }
      pedidos_compra_itens: {
        Row: {
          id: string
          item_id: string
          pedido_id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          id?: string
          item_id: string
          pedido_id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          id?: string
          item_id?: string
          pedido_id?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "estoque_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      placeholders: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          id: string
          origem: string
          placeholder: string
          user_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao: string
          id?: string
          origem: string
          placeholder: string
          user_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          id?: string
          origem?: string
          placeholder?: string
          user_id?: string
        }
        Relationships: []
      }
      plano_contas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          codigo: string | null
          criado_em: string
          descricao: string | null
          id: string
          natureza: string
          nome: string
          ordem: number
          padrao: boolean
          pai_id: string | null
          tipo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          natureza: string
          nome: string
          ordem?: number
          padrao?: boolean
          pai_id?: string | null
          tipo?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          codigo?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          natureza?: string
          nome?: string
          ordem?: number
          padrao?: boolean
          pai_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_pai_id_fkey"
            columns: ["pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_servicos: {
        Row: {
          ambiente_id: string | null
          cliente_id: string | null
          criado_em: string
          id: string
          nome: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          ambiente_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          id?: string
          nome: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          ambiente_id?: string | null
          cliente_id?: string | null
          criado_em?: string
          id?: string
          nome?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_servicos_ambiente_id_fkey"
            columns: ["ambiente_id"]
            isOneToOne: false
            referencedRelation: "ambientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_servicos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_servicos_projeto: {
        Row: {
          analista_id: string | null
          arquivado_analise: boolean
          arquivado_montagem: boolean
          arquivado_producao: boolean
          atualizado_em: string
          card_pai_id: string | null
          cliente_id: string | null
          codigo_rastreio: string | null
          cor_vinculo: string | null
          criado_em: string
          data_limite_analise: string | null
          data_manual: string | null
          data_obra_montagem: string | null
          data_planejada_analise: string | null
          data_planejada_montagem: string | null
          data_planejada_producao: string | null
          data_prometida_montagem: string | null
          desconto_percentual: number
          descricao: string | null
          excluido_analise: boolean
          excluido_montagem: boolean
          excluido_producao: boolean
          formulario_comercial_id: string | null
          id: string
          is_outsourced: boolean
          item_comercial_id: string | null
          mes_planejado_analise: string | null
          mes_planejado_montagem: string | null
          mes_planejado_producao: string | null
          nome_produto: string
          outsourced_checked: boolean
          qtd: number
          semana_analise_inicio: string | null
          semana_montagem_inicio: string | null
          semana_planejada_analise: string | null
          semana_planejada_montagem: string | null
          semana_planejada_producao: string | null
          semana_producao_inicio: string | null
          status_analise: string
          status_pcp: string
          terceirizado_validado: boolean
          tipo: string | null
          valor_comissao: number | null
          valor_total: number
          valor_unitario: number
          visivel_pcp: boolean
        }
        Insert: {
          analista_id?: string | null
          arquivado_analise?: boolean
          arquivado_montagem?: boolean
          arquivado_producao?: boolean
          atualizado_em?: string
          card_pai_id?: string | null
          cliente_id?: string | null
          codigo_rastreio?: string | null
          cor_vinculo?: string | null
          criado_em?: string
          data_limite_analise?: string | null
          data_manual?: string | null
          data_obra_montagem?: string | null
          data_planejada_analise?: string | null
          data_planejada_montagem?: string | null
          data_planejada_producao?: string | null
          data_prometida_montagem?: string | null
          desconto_percentual?: number
          descricao?: string | null
          excluido_analise?: boolean
          excluido_montagem?: boolean
          excluido_producao?: boolean
          formulario_comercial_id?: string | null
          id?: string
          is_outsourced?: boolean
          item_comercial_id?: string | null
          mes_planejado_analise?: string | null
          mes_planejado_montagem?: string | null
          mes_planejado_producao?: string | null
          nome_produto: string
          outsourced_checked?: boolean
          qtd: number
          semana_analise_inicio?: string | null
          semana_montagem_inicio?: string | null
          semana_planejada_analise?: string | null
          semana_planejada_montagem?: string | null
          semana_planejada_producao?: string | null
          semana_producao_inicio?: string | null
          status_analise?: string
          status_pcp?: string
          terceirizado_validado?: boolean
          tipo?: string | null
          valor_comissao?: number | null
          valor_total: number
          valor_unitario: number
          visivel_pcp?: boolean
        }
        Update: {
          analista_id?: string | null
          arquivado_analise?: boolean
          arquivado_montagem?: boolean
          arquivado_producao?: boolean
          atualizado_em?: string
          card_pai_id?: string | null
          cliente_id?: string | null
          codigo_rastreio?: string | null
          cor_vinculo?: string | null
          criado_em?: string
          data_limite_analise?: string | null
          data_manual?: string | null
          data_obra_montagem?: string | null
          data_planejada_analise?: string | null
          data_planejada_montagem?: string | null
          data_planejada_producao?: string | null
          data_prometida_montagem?: string | null
          desconto_percentual?: number
          descricao?: string | null
          excluido_analise?: boolean
          excluido_montagem?: boolean
          excluido_producao?: boolean
          formulario_comercial_id?: string | null
          id?: string
          is_outsourced?: boolean
          item_comercial_id?: string | null
          mes_planejado_analise?: string | null
          mes_planejado_montagem?: string | null
          mes_planejado_producao?: string | null
          nome_produto?: string
          outsourced_checked?: boolean
          qtd?: number
          semana_analise_inicio?: string | null
          semana_montagem_inicio?: string | null
          semana_planejada_analise?: string | null
          semana_planejada_montagem?: string | null
          semana_planejada_producao?: string | null
          semana_producao_inicio?: string | null
          status_analise?: string
          status_pcp?: string
          terceirizado_validado?: boolean
          tipo?: string | null
          valor_comissao?: number | null
          valor_total?: number
          valor_unitario?: number
          visivel_pcp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "produtos_servicos_projeto_analista_id_fkey"
            columns: ["analista_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_servicos_projeto_card_pai_id_fkey"
            columns: ["card_pai_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos_projeto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_servicos_projeto_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_servicos_projeto_formulario_comercial_id_fkey"
            columns: ["formulario_comercial_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
        ]
      }
      responsaveis_acompanhamentos: {
        Row: {
          alocacao_atual: string | null
          data_criacao: string
          id: string
          nome: string
          status: string | null
          telefone: string | null
        }
        Insert: {
          alocacao_atual?: string | null
          data_criacao?: string
          id?: string
          nome: string
          status?: string | null
          telefone?: string | null
        }
        Update: {
          alocacao_atual?: string | null
          data_criacao?: string
          id?: string
          nome?: string
          status?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      sobras_historico: {
        Row: {
          acao: string
          canal: string | null
          criado_em: string
          id: string
          observacao: string | null
          sobra_id: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          canal?: string | null
          criado_em?: string
          id?: string
          observacao?: string | null
          sobra_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          canal?: string | null
          criado_em?: string
          id?: string
          observacao?: string | null
          sobra_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sobras_historico_sobra_id_fkey"
            columns: ["sobra_id"]
            isOneToOne: false
            referencedRelation: "estoque_sobras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sobras_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_compra: {
        Row: {
          arquivado: boolean
          atualizado_em: string
          cliente_id: string | null
          cor: string | null
          criado_em: string
          data_entrega_prevista: string | null
          editado_em: string | null
          editado_por: string | null
          fornecedor: string | null
          id: string
          item_id: string | null
          link: string | null
          modelo: string | null
          motivo: string | null
          nome_item: string
          quantidade: number
          status: string
          tamanho: string | null
          tipo_solicitacao: string
          unidade: string
          urgencia: string
          usuario_id: string
        }
        Insert: {
          arquivado?: boolean
          atualizado_em?: string
          cliente_id?: string | null
          cor?: string | null
          criado_em?: string
          data_entrega_prevista?: string | null
          editado_em?: string | null
          editado_por?: string | null
          fornecedor?: string | null
          id?: string
          item_id?: string | null
          link?: string | null
          modelo?: string | null
          motivo?: string | null
          nome_item: string
          quantidade: number
          status?: string
          tamanho?: string | null
          tipo_solicitacao?: string
          unidade: string
          urgencia?: string
          usuario_id: string
        }
        Update: {
          arquivado?: boolean
          atualizado_em?: string
          cliente_id?: string | null
          cor?: string | null
          criado_em?: string
          data_entrega_prevista?: string | null
          editado_em?: string | null
          editado_por?: string | null
          fornecedor?: string | null
          id?: string
          item_id?: string | null
          link?: string | null
          modelo?: string | null
          motivo?: string | null
          nome_item?: string
          quantidade?: number
          status?: string
          tamanho?: string | null
          tipo_solicitacao?: string
          unidade?: string
          urgencia?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compra_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "produtos_servicos_projeto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          arquivo_url: string
          atualizado_em: string
          criado_em: string
          descricao: string | null
          external_template_id: string | null
          id: string
          nome: string
          placeholders_customizados: Json | null
          status: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          arquivo_url: string
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          external_template_id?: string | null
          id?: string
          nome: string
          placeholders_customizados?: Json | null
          status?: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          arquivo_url?: string
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          external_template_id?: string | null
          id?: string
          nome?: string
          placeholders_customizados?: Json | null
          status?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      timeline_eventos: {
        Row: {
          acao: string
          cliente_id: string | null
          criado_em: string
          formulario_id: string | null
          icone: string | null
          id: string
          usuario_nome: string
        }
        Insert: {
          acao: string
          cliente_id?: string | null
          criado_em?: string
          formulario_id?: string | null
          icone?: string | null
          id?: string
          usuario_nome: string
        }
        Update: {
          acao?: string
          cliente_id?: string | null
          criado_em?: string
          formulario_id?: string | null
          icone?: string | null
          id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_eventos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_eventos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formulario_comercial"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_bancarias: {
        Row: {
          conta_destino_id: string | null
          conta_origem_id: string | null
          criado_em: string
          data_transferencia: string
          descricao: string | null
          id: string
          usuario_id: string | null
          valor: number
        }
        Insert: {
          conta_destino_id?: string | null
          conta_origem_id?: string | null
          criado_em?: string
          data_transferencia: string
          descricao?: string | null
          id?: string
          usuario_id?: string | null
          valor: number
        }
        Update: {
          conta_destino_id?: string | null
          conta_origem_id?: string | null
          criado_em?: string
          data_transferencia?: string
          descricao?: string | null
          id?: string
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_bancarias_conta_destino_id_fkey"
            columns: ["conta_destino_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_bancarias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          atualizado_em: string
          criado_em: string
          eh_consultor: boolean | null
          email: string
          ex_colaborador: boolean | null
          foto_perfil: string | null
          funcao: string | null
          id: string
          nome: string
          status: boolean
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          eh_consultor?: boolean | null
          email: string
          ex_colaborador?: boolean | null
          foto_perfil?: string | null
          funcao?: string | null
          id: string
          nome: string
          status?: boolean
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          eh_consultor?: boolean | null
          email?: string
          ex_colaborador?: boolean | null
          foto_perfil?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          status?: boolean
          telefone?: string | null
        }
        Relationships: []
      }
      whatsapp_lid_map: {
        Row: {
          atualizado_em: string
          criado_em: string
          lid: string
          phone: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          lid: string
          phone: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          lid?: string
          phone?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          content: string
          created_at: string
          direction: string | null
          external_id: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          phone: string
          sender_name: string | null
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          direction?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          phone: string
          sender_name?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string
          direction?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          phone?: string
          sender_name?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          last_human_interaction_at: string | null
          lead_id: string | null
          phone: string
          step: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_human_interaction_at?: string | null
          lead_id?: string | null
          phone: string
          step?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_human_interaction_at?: string | null
          lead_id?: string | null
          phone?: string
          step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_alertas_notas_fiscais: {
        Row: {
          acao_sugerida: string | null
          acrescimos: number | null
          criado_em: string | null
          data_emissao: string | null
          diferenca: number | null
          entradas_estoque: number | null
          fornecedor: string | null
          gravidade: string | null
          mensagem: string | null
          nota_id: string | null
          numero_nota: string | null
          qtd_itens: number | null
          soma_itens: number | null
          tipo_alerta: string | null
          valor_produtos: number | null
          valor_total: number | null
        }
        Relationships: []
      }
      vw_notas_fiscais_conferencia: {
        Row: {
          criado_em: string | null
          data_emissao: string | null
          diferenca: number | null
          fornecedor: string | null
          id: string | null
          movimentacoes_estoque: number | null
          numero_nota: string | null
          qtd_itens: number | null
          situacao: string | null
          soma_itens: number | null
          total_lido_ia: number | null
          valor_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      atualizar_notas_lead: {
        Args: {
          p_alterar_texto?: boolean
          p_lead_id: string
          p_set?: Json
          p_texto?: string
          p_unset?: string[]
        }
        Returns: string
      }
      baixar_alocacao: {
        Args: { p_alocacao_id: string; p_baixado_por?: string }
        Returns: Json
      }
      classificar_diferenca_nota: {
        Args: {
          p_desconto?: number
          p_frete?: number
          p_ipi?: number
          p_nota_id: string
          p_outras?: number
          p_st?: number
          p_usuario_id?: string
        }
        Returns: Json
      }
      converter_lead_em_venda: { Args: { p_lead_id: string }; Returns: Json }
      criar_lead_whatsapp: {
        Args: { p_nome: string; p_telefone: string }
        Returns: {
          arquivado_comercial: boolean
          atualizado_em: string
          categoria: string
          consultor_id: string | null
          consultor_id_secundario: string | null
          criado_em: string
          criado_por_nome: string | null
          data_venda: string | null
          email: string | null
          etapa_perda: string | null
          excluido: boolean
          id: string
          kanban_ativo: boolean
          motivo_perda: string | null
          nome: string
          notas: string | null
          notas_pessoais: string | null
          ordem: number
          origem: string
          origem_pessoa: string | null
          status: string
          status_atendimento: string | null
          status_desde: string | null
          telefone: string
          telefone_digitos: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      deduct_estoque_alocacao: {
        Args: { p_item_id: string; p_quantidade: number }
        Returns: number
      }
      excluir_nota_fiscal: { Args: { p_nota_id: string }; Returns: Json }
      fechar_caixa: {
        Args: { p_baixado_por?: string; p_caixa_id: string; p_destino?: string }
        Returns: Json
      }
      gerar_codigo_acompanhamento: { Args: { p_nome: string }; Returns: string }
      get_dashboard_metrics: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_edge_auth_headers: { Args: never; Returns: Json }
      get_origens_despacho_perda: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_origens_despacho_perda_consultor: {
        Args: {
          p_consultor_id?: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: Json
      }
      get_timeline_eventos: {
        Args: {
          p_cliente_id: string
          p_formulario_id?: string
          p_sale_created_at?: string
        }
        Returns: {
          acao: string
          cliente_id: string
          criado_em: string
          formulario_id: string
          icone: string
          id: string
          nome_exibicao: string
          usuario_nome: string
        }[]
      }
      get_vendas_periodo: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      group_contas_pagar: {
        Args: {
          p_conta_bancaria_id?: string
          p_data_primeiro_vencimento: string
          p_ids: string[]
          p_meio_pagamento: string
          p_num_parcelas: number
          p_user_id: string
        }
        Returns: Json
      }
      has_module_access: {
        Args: { mod: string; user_id: string }
        Returns: boolean
      }
      insert_conta_pagar_with_divisoes: {
        Args: {
          p_categoria: string
          p_categoria_id?: string
          p_cliente_id?: string
          p_conta_bancaria_id: string
          p_data_vencimento: string
          p_descricao: string
          p_divisoes: Json
          p_formulario_comercial_id?: string
          p_fornecedor: string
          p_grupo_id?: string
          p_meses: number
          p_natureza?: string
          p_observacoes?: string
          p_user_id: string
          p_valor: number
        }
        Returns: Json
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_signature_completed: { Args: { p_status: string }; Returns: boolean }
      jsonb_compacto: { Args: { p: Json }; Returns: string }
      lead_data_segura: { Args: { p: string }; Returns: string }
      lead_fase: {
        Args: { p_categoria: string; p_meta: Json; p_status: string }
        Returns: string
      }
      lead_meta: { Args: { p_notas: string }; Returns: Json }
      lead_meta_marcar_aba: {
        Args: {
          p_aba: string
          p_chave: string
          p_notas: string
          p_quando: string
        }
        Returns: string
      }
      lead_notas_com_meta: {
        Args: { p_meta: Json; p_notas: string }
        Returns: string
      }
      lead_situacao: {
        Args: {
          p_arquivado: boolean
          p_excluido: boolean
          p_fase: string
          p_meta: Json
        }
        Returns: string
      }
      lead_status_perdido: { Args: { p_status: string }; Returns: boolean }
      lead_ts_seguro: { Args: { p: string }; Returns: string }
      marcar_nota_conferida: {
        Args: {
          p_nota_id: string
          p_observacao?: string
          p_usuario_id?: string
        }
        Returns: undefined
      }
      painel_funil_real: {
        Args: { p_fim: string; p_inicio: string }
        Returns: Json
      }
      painel_pendencias_listas: { Args: never; Returns: Json }
      pcp_ratear_valor_subcards: { Args: { p_pai_id: string }; Returns: Json }
      pcp_reprogramar_cards: {
        Args: {
          p_campos: Json
          p_card_ids: string[]
          p_linha: string
          p_motivo?: string
        }
        Returns: Json
      }
      pcp_semana_inicio: {
        Args: { p_data?: string; p_label: string; p_ref?: string }
        Returns: string
      }
      pcp_semana_label: { Args: { p_inicio: string }; Returns: string }
      pcp_status_pcp_por_fase: {
        Args: { p_status_analise: string }
        Returns: string
      }
      pendencia_resolver: {
        Args: {
          p_acao: string
          p_chave: string
          p_dados?: Json
          p_lead_id: string
        }
        Returns: Json
      }
      project_item_names: {
        Args: {
          psp: Database["public"]["Tables"]["produtos_servicos_projeto"]["Row"]
        }
        Returns: string
      }
      reprocess_missing_signed_documents: {
        Args: never
        Returns: {
          cliente_id: string
          documento_id: string
          documentos_cliente_id: string
          envelope_id: string
          erro: string
          estado: string
          http_req_id: number
        }[]
      }
      resolver_projeto_estoque_por_nota: {
        Args: { p_nota_fiscal_id: string }
        Returns: {
          r_cliente_id: string
          r_formulario_comercial_id: string
        }[]
      }
      salvar_itens_nota: {
        Args: { p_itens: Json; p_nota_id: string }
        Returns: {
          created_at: string
          id: string
          nome_produto: string
          nota_fiscal_id: string | null
          produto_id: string | null
          quantidade: number
          unidade: string
          valor_unitario: number
        }[]
        SetofOptions: {
          from: "*"
          to: "itens_nota_fiscal"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      salvar_parcelas_venda: {
        Args: { p_formulario_id: string; p_parcelas: Json }
        Returns: Json
      }
      sincronizar_estoque_nota: {
        Args: { p_nota_id: string; p_usuario_id?: string }
        Returns: {
          item_id: string
          nome: string
          quantidade_anterior: number
          quantidade_nova: number
        }[]
      }
      solicitar_compra_item: {
        Args: { p_item_id: string; p_motivo?: string }
        Returns: Json
      }
      telefone_variantes_busca: {
        Args: { p_telefone: string }
        Returns: string[]
      }
      try_finalize_signature: {
        Args: {
          p_cliente_id?: string
          p_documento_id: string
          p_envelope_id?: string
          p_manual?: boolean
        }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

