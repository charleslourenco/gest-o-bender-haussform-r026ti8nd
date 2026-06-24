// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      acompanhamentos: {
        Row: {
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
            foreignKeyName: 'acompanhamentos_responsavel_id_fkey'
            columns: ['responsavel_id']
            isOneToOne: false
            referencedRelation: 'responsaveis_acompanhamentos'
            referencedColumns: ['id']
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
            foreignKeyName: 'acompanhamentos_historico_acompanhamento_id_fkey'
            columns: ['acompanhamento_id']
            isOneToOne: false
            referencedRelation: 'acompanhamentos'
            referencedColumns: ['id']
          },
        ]
      }
      alocacao_montagem: {
        Row: {
          card_id: string
          criado_em: string
          id: string
          montador_id: string
        }
        Insert: {
          card_id: string
          criado_em?: string
          id?: string
          montador_id: string
        }
        Update: {
          card_id?: string
          criado_em?: string
          id?: string
          montador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'alocacao_montagem_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'produtos_servicos_projeto'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'alocacao_montagem_montador_id_fkey'
            columns: ['montador_id']
            isOneToOne: false
            referencedRelation: 'montadores'
            referencedColumns: ['id']
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
            foreignKeyName: 'ambientes_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
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
            foreignKeyName: 'assinantes_envelope_id_fkey'
            columns: ['envelope_id']
            isOneToOne: false
            referencedRelation: 'envelopes_assinatura'
            referencedColumns: ['id']
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
            foreignKeyName: 'assinaturas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assinaturas_clt_id_fkey'
            columns: ['clt_id']
            isOneToOne: false
            referencedRelation: 'equipe_clt'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assinaturas_pj_id_fkey'
            columns: ['pj_id']
            isOneToOne: false
            referencedRelation: 'parceiros_pj'
            referencedColumns: ['id']
          },
        ]
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
          data_nascimento: string | null
          email: string
          endereco_obra: string | null
          estado: string | null
          id: string
          lead_id: string | null
          metragem_total: number | null
          nome: string
          numero: string | null
          profissao: string | null
          referencia_bancaria: string | null
          renda: number | null
          status: string
          telefone: string
          tipo_imovel: string | null
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
          data_nascimento?: string | null
          email: string
          endereco_obra?: string | null
          estado?: string | null
          id?: string
          lead_id?: string | null
          metragem_total?: number | null
          nome: string
          numero?: string | null
          profissao?: string | null
          referencia_bancaria?: string | null
          renda?: number | null
          status?: string
          telefone: string
          tipo_imovel?: string | null
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
          data_nascimento?: string | null
          email?: string
          endereco_obra?: string | null
          estado?: string | null
          id?: string
          lead_id?: string | null
          metragem_total?: number | null
          nome?: string
          numero?: string | null
          profissao?: string | null
          referencia_bancaria?: string | null
          renda?: number | null
          status?: string
          telefone?: string
          tipo_imovel?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clientes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
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
      contas_pagar: {
        Row: {
          antecipado: boolean | null
          atualizado_em: string
          categoria: string | null
          codigo_barras: string | null
          comprovante_url: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          fornecedor: string
          id: string
          meio_pagamento: string | null
          status_pagamento: string
          user_id: string | null
          valor: number
        }
        Insert: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          codigo_barras?: string | null
          comprovante_url?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          fornecedor: string
          id?: string
          meio_pagamento?: string | null
          status_pagamento?: string
          user_id?: string | null
          valor: number
        }
        Update: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          codigo_barras?: string | null
          comprovante_url?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          fornecedor?: string
          id?: string
          meio_pagamento?: string | null
          status_pagamento?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: []
      }
      contas_receber: {
        Row: {
          antecipado: boolean | null
          atualizado_em: string
          categoria: string | null
          cliente_id: string | null
          comprovante_url: string | null
          criado_em: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string | null
          formulario_comercial_id: string | null
          id: string
          meio_pagamento: string | null
          numero_parcela: string
          status_pagamento: string
          user_id: string | null
          valor: number
        }
        Insert: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao?: string | null
          formulario_comercial_id?: string | null
          id?: string
          meio_pagamento?: string | null
          numero_parcela: string
          status_pagamento?: string
          user_id?: string | null
          valor: number
        }
        Update: {
          antecipado?: boolean | null
          atualizado_em?: string
          categoria?: string | null
          cliente_id?: string | null
          comprovante_url?: string | null
          criado_em?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string | null
          formulario_comercial_id?: string | null
          id?: string
          meio_pagamento?: string | null
          numero_parcela?: string
          status_pagamento?: string
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'contas_receber_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contas_receber_formulario_comercial_id_fkey'
            columns: ['formulario_comercial_id']
            isOneToOne: false
            referencedRelation: 'formulario_comercial'
            referencedColumns: ['id']
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
          id: string
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
          id?: string
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
          id?: string
          projeto_id?: string | null
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_cliente_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_cliente_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_cliente_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      documentos_equipe: {
        Row: {
          arquivo_url: string
          clt_id: string | null
          criado_em: string | null
          id: string
          nome: string
          pj_id: string | null
          tipo: string | null
        }
        Insert: {
          arquivo_url: string
          clt_id?: string | null
          criado_em?: string | null
          id?: string
          nome: string
          pj_id?: string | null
          tipo?: string | null
        }
        Update: {
          arquivo_url?: string
          clt_id?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
          pj_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_equipe_clt_id_fkey'
            columns: ['clt_id']
            isOneToOne: false
            referencedRelation: 'equipe_clt'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_equipe_pj_id_fkey'
            columns: ['pj_id']
            isOneToOne: false
            referencedRelation: 'parceiros_pj'
            referencedColumns: ['id']
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
            foreignKeyName: 'documentos_gerados_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
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
            foreignKeyName: 'dossies_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'dossies_formulario_comercial_id_fkey'
            columns: ['formulario_comercial_id']
            isOneToOne: false
            referencedRelation: 'formulario_comercial'
            referencedColumns: ['id']
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
          concluido_em: string | null
          criado_em: string | null
          criado_por: string | null
          documento_id: string
          id: string
          nome_documento: string
          pj_id: string | null
          status: string | null
        }
        Insert: {
          cliente_id?: string | null
          clt_id?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          documento_id: string
          id?: string
          nome_documento: string
          pj_id?: string | null
          status?: string | null
        }
        Update: {
          cliente_id?: string | null
          clt_id?: string | null
          concluido_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          documento_id?: string
          id?: string
          nome_documento?: string
          pj_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'envelopes_assinatura_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'envelopes_assinatura_clt_id_fkey'
            columns: ['clt_id']
            isOneToOne: false
            referencedRelation: 'equipe_clt'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'envelopes_assinatura_pj_id_fkey'
            columns: ['pj_id']
            isOneToOne: false
            referencedRelation: 'parceiros_pj'
            referencedColumns: ['id']
          },
        ]
      }
      equipe_clt: {
        Row: {
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
        Relationships: []
      }
      estoque_alocacoes: {
        Row: {
          cliente_nome: string
          criado_em: string
          id: string
          item_id: string
          quantidade: number
        }
        Insert: {
          cliente_nome: string
          criado_em?: string
          id?: string
          item_id: string
          quantidade: number
        }
        Update: {
          cliente_nome?: string
          criado_em?: string
          id?: string
          item_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: 'estoque_alocacoes_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'estoque_itens'
            referencedColumns: ['id']
          },
        ]
      }
      estoque_caixas: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          criado_em: string
          id: string
          nome: string
          projeto_id: string | null
          status: string
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          criado_em?: string
          id?: string
          nome: string
          projeto_id?: string | null
          status?: string
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          criado_em?: string
          id?: string
          nome?: string
          projeto_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estoque_caixas_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estoque_caixas_projeto_id_fkey'
            columns: ['projeto_id']
            isOneToOne: false
            referencedRelation: 'formulario_comercial'
            referencedColumns: ['id']
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
            foreignKeyName: 'estoque_caixas_itens_caixa_id_fkey'
            columns: ['caixa_id']
            isOneToOne: false
            referencedRelation: 'estoque_caixas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estoque_caixas_itens_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'estoque_itens'
            referencedColumns: ['id']
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
          cliente_nome: string
          entregue_em: string | null
          id: string
          produto: string
          recebido_em: string
          responsavel_entrega: string | null
          status: string | null
          usuario_id: string | null
        }
        Insert: {
          cliente_nome: string
          entregue_em?: string | null
          id?: string
          produto: string
          recebido_em?: string
          responsavel_entrega?: string | null
          status?: string | null
          usuario_id?: string | null
        }
        Update: {
          cliente_nome?: string
          entregue_em?: string | null
          id?: string
          produto?: string
          recebido_em?: string
          responsavel_entrega?: string | null
          status?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_estoque_itens_cliente_users'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
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
            foreignKeyName: 'estoque_movimentacoes_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'estoque_itens'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estoque_movimentacoes_nota_fiscal_id_fkey'
            columns: ['nota_fiscal_id']
            isOneToOne: false
            referencedRelation: 'notas_fiscais'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estoque_movimentacoes_pedido_id_fkey'
            columns: ['pedido_id']
            isOneToOne: false
            referencedRelation: 'pedidos_compra'
            referencedColumns: ['id']
          },
        ]
      }
      estoque_sobras: {
        Row: {
          altura: number
          area: number
          cliente_nome: string | null
          criado_em: string
          espessura: number | null
          id: string
          largura: number
          marca: string | null
          nome: string
          status: string
          usado_em: string | null
        }
        Insert: {
          altura: number
          area: number
          cliente_nome?: string | null
          criado_em?: string
          espessura?: number | null
          id?: string
          largura: number
          marca?: string | null
          nome: string
          status?: string
          usado_em?: string | null
        }
        Update: {
          altura?: number
          area?: number
          cliente_nome?: string | null
          criado_em?: string
          espessura?: number | null
          id?: string
          largura?: number
          marca?: string | null
          nome?: string
          status?: string
          usado_em?: string | null
        }
        Relationships: []
      }
      formulario_comercial: {
        Row: {
          ambientes: Json | null
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cliente_id: string | null
          complemento: string | null
          cpf: string | null
          criado_em: string
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
          itens: Json | null
          lead_id: string
          metodo_pagamento: string | null
          municipio: string | null
          nome_cliente: string | null
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
          user_id: string
          valor_total: number | null
        }
        Insert: {
          ambientes?: Json | null
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cliente_id?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string
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
          itens?: Json | null
          lead_id: string
          metodo_pagamento?: string | null
          municipio?: string | null
          nome_cliente?: string | null
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
          user_id?: string
          valor_total?: number | null
        }
        Update: {
          ambientes?: Json | null
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cliente_id?: string | null
          complemento?: string | null
          cpf?: string | null
          criado_em?: string
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
          itens?: Json | null
          lead_id?: string
          metodo_pagamento?: string | null
          municipio?: string | null
          nome_cliente?: string | null
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
          user_id?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'formulario_comercial_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'formulario_comercial_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads'
            referencedColumns: ['id']
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
            foreignKeyName: 'kanban_historico_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'produtos_servicos_projeto'
            referencedColumns: ['id']
          },
        ]
      }
      leads: {
        Row: {
          atualizado_em: string
          categoria: string
          consultor_id: string | null
          criado_em: string
          criado_por_nome: string | null
          data_venda: string | null
          email: string
          id: string
          kanban_ativo: boolean
          nome: string
          notas: string | null
          notas_pessoais: string | null
          ordem: number
          origem: string
          status: string
          status_atendimento: string | null
          telefone: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string
          consultor_id?: string | null
          criado_em?: string
          criado_por_nome?: string | null
          data_venda?: string | null
          email: string
          id?: string
          kanban_ativo?: boolean
          nome: string
          notas?: string | null
          notas_pessoais?: string | null
          ordem?: number
          origem: string
          status?: string
          status_atendimento?: string | null
          telefone: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          consultor_id?: string | null
          criado_em?: string
          criado_por_nome?: string | null
          data_venda?: string | null
          email?: string
          id?: string
          kanban_ativo?: boolean
          nome?: string
          notas?: string | null
          notas_pessoais?: string | null
          ordem?: number
          origem?: string
          status?: string
          status_atendimento?: string | null
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_consultor_id_fkey'
            columns: ['consultor_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
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
            foreignKeyName: 'matriz_permissoes_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
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
          criado_em: string
          id: string
          nome_completo: string
          status: string
          telefone: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome_completo: string
          status?: string
          telefone?: string | null
        }
        Update: {
          atualizado_em?: string
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
          criado_em: string
          dados_ocr: Json | null
          data_emissao: string | null
          fornecedor: string
          id: string
          numero_nota: string | null
          pedido_id: string | null
          status_reconciliacao: string
          valor_total: number
        }
        Insert: {
          arquivo_url?: string | null
          criado_em?: string
          dados_ocr?: Json | null
          data_emissao?: string | null
          fornecedor: string
          id?: string
          numero_nota?: string | null
          pedido_id?: string | null
          status_reconciliacao?: string
          valor_total: number
        }
        Update: {
          arquivo_url?: string | null
          criado_em?: string
          dados_ocr?: Json | null
          data_emissao?: string | null
          fornecedor?: string
          id?: string
          numero_nota?: string | null
          pedido_id?: string | null
          status_reconciliacao?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'notas_fiscais_pedido_id_fkey'
            columns: ['pedido_id']
            isOneToOne: false
            referencedRelation: 'pedidos_compra'
            referencedColumns: ['id']
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
            foreignKeyName: 'pagamentos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagamentos_formulario_id_fkey'
            columns: ['formulario_id']
            isOneToOne: false
            referencedRelation: 'formulario_comercial'
            referencedColumns: ['id']
          },
        ]
      }
      parceiros_pj: {
        Row: {
          ajuda_custo: number | null
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
        Relationships: []
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
            foreignKeyName: 'parcelas_pagamento_id_fkey'
            columns: ['pagamento_id']
            isOneToOne: false
            referencedRelation: 'pagamentos'
            referencedColumns: ['id']
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
            foreignKeyName: 'pedidos_compra_itens_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'estoque_itens'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pedidos_compra_itens_pedido_id_fkey'
            columns: ['pedido_id']
            isOneToOne: false
            referencedRelation: 'pedidos_compra'
            referencedColumns: ['id']
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
            foreignKeyName: 'produtos_servicos_ambiente_id_fkey'
            columns: ['ambiente_id']
            isOneToOne: false
            referencedRelation: 'ambientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'produtos_servicos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      produtos_servicos_projeto: {
        Row: {
          analista_id: string | null
          atualizado_em: string
          cliente_id: string | null
          codigo_rastreio: string | null
          criado_em: string
          data_manual: string | null
          descricao: string | null
          formulario_comercial_id: string | null
          id: string
          is_outsourced: boolean
          nome_produto: string
          outsourced_checked: boolean
          qtd: number
          status_analise: string
          terceirizado_validado: boolean
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          analista_id?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          data_manual?: string | null
          descricao?: string | null
          formulario_comercial_id?: string | null
          id?: string
          is_outsourced?: boolean
          nome_produto: string
          outsourced_checked?: boolean
          qtd: number
          status_analise?: string
          terceirizado_validado?: boolean
          valor_total: number
          valor_unitario: number
        }
        Update: {
          analista_id?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          data_manual?: string | null
          descricao?: string | null
          formulario_comercial_id?: string | null
          id?: string
          is_outsourced?: boolean
          nome_produto?: string
          outsourced_checked?: boolean
          qtd?: number
          status_analise?: string
          terceirizado_validado?: boolean
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: 'produtos_servicos_projeto_analista_id_fkey'
            columns: ['analista_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'produtos_servicos_projeto_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'produtos_servicos_projeto_formulario_comercial_id_fkey'
            columns: ['formulario_comercial_id']
            isOneToOne: false
            referencedRelation: 'formulario_comercial'
            referencedColumns: ['id']
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
      solicitacoes_compra: {
        Row: {
          atualizado_em: string
          cliente_id: string | null
          cor: string | null
          criado_em: string
          data_entrega_prevista: string | null
          fornecedor: string | null
          id: string
          link: string | null
          modelo: string | null
          motivo: string | null
          nome_item: string
          quantidade: number
          status: string
          tamanho: string | null
          unidade: string
          urgencia: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          cliente_id?: string | null
          cor?: string | null
          criado_em?: string
          data_entrega_prevista?: string | null
          fornecedor?: string | null
          id?: string
          link?: string | null
          modelo?: string | null
          motivo?: string | null
          nome_item: string
          quantidade: number
          status?: string
          tamanho?: string | null
          unidade: string
          urgencia?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          cliente_id?: string | null
          cor?: string | null
          criado_em?: string
          data_entrega_prevista?: string | null
          fornecedor?: string | null
          id?: string
          link?: string | null
          modelo?: string | null
          motivo?: string | null
          nome_item?: string
          quantidade?: number
          status?: string
          tamanho?: string | null
          unidade?: string
          urgencia?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'solicitacoes_compra_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'solicitacoes_compra_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
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
          icone: string | null
          id: string
          usuario_nome: string
        }
        Insert: {
          acao: string
          cliente_id?: string | null
          criado_em?: string
          icone?: string | null
          id?: string
          usuario_nome: string
        }
        Update: {
          acao?: string
          cliente_id?: string | null
          criado_em?: string
          icone?: string | null
          id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: 'timeline_eventos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
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
          email: string
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
          email?: string
          foto_perfil?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          status?: boolean
          telefone?: string | null
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
            foreignKeyName: 'whatsapp_messages_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
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
            foreignKeyName: 'whatsapp_sessions_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_timeline_eventos: {
        Args: { p_cliente_id: string }
        Returns: {
          acao: string
          cliente_id: string
          criado_em: string
          icone: string
          id: string
          nome_exibicao: string
          usuario_nome: string
        }[]
      }
      has_module_access: {
        Args: { mod: string; user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      project_item_names: {
        Args: {
          psp: Database['public']['Tables']['produtos_servicos_projeto']['Row']
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
