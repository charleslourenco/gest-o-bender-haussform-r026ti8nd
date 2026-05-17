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
      document_templates: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          conteudo: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          conteudo: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          conteudo?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      documentos_cliente: {
        Row: {
          arquivo_assinado_url: string | null
          arquivo_url: string | null
          cliente_id: string | null
          conteudo_preenchido: string | null
          criado_em: string
          id: string
          projeto_id: string | null
          status: string
          template_id: string | null
          template_nome: string | null
          tipo: string
        }
        Insert: {
          arquivo_assinado_url?: string | null
          arquivo_url?: string | null
          cliente_id?: string | null
          conteudo_preenchido?: string | null
          criado_em?: string
          id?: string
          projeto_id?: string | null
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tipo: string
        }
        Update: {
          arquivo_assinado_url?: string | null
          arquivo_url?: string | null
          cliente_id?: string | null
          conteudo_preenchido?: string | null
          criado_em?: string
          id?: string
          projeto_id?: string | null
          status?: string
          template_id?: string | null
          template_nome?: string | null
          tipo?: string
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
          criado_em: string
          estoque_minimo: number
          fornecedor: string | null
          id: string
          nome: string
          quantidade: number
          terceirizado: boolean | null
          unidade: string
          valor_unitario: number
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
          nome: string
          quantidade?: number
          terceirizado?: boolean | null
          unidade?: string
          valor_unitario?: number
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          criado_em?: string
          estoque_minimo?: number
          fornecedor?: string | null
          id?: string
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
          usuario_id: string | null
        }
        Insert: {
          cliente_nome: string
          entregue_em?: string | null
          id?: string
          produto: string
          recebido_em?: string
          responsavel_entrega?: string | null
          usuario_id?: string | null
        }
        Update: {
          cliente_nome?: string
          entregue_em?: string | null
          id?: string
          produto?: string
          recebido_em?: string
          responsavel_entrega?: string | null
          usuario_id?: string | null
        }
        Relationships: []
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
          criado_em: string
          id: string
          largura: number
          nome: string
          status: string
        }
        Insert: {
          altura: number
          area: number
          criado_em?: string
          id?: string
          largura: number
          nome: string
          status?: string
        }
        Update: {
          altura?: number
          area?: number
          criado_em?: string
          id?: string
          largura?: number
          nome?: string
          status?: string
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
      listas_materiais: {
        Row: {
          arquivo_url: string | null
          atualizado_em: string | null
          cliente_id: string | null
          criado_em: string | null
          id: string
          itens: Json | null
          status: string | null
        }
        Insert: {
          arquivo_url?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          id?: string
          itens?: Json | null
          status?: string | null
        }
        Update: {
          arquivo_url?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          id?: string
          itens?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'listas_materiais_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
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
          descricao: string | null
          formulario_comercial_id: string | null
          id: string
          nome_produto: string
          qtd: number
          status_analise: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          analista_id?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          descricao?: string | null
          formulario_comercial_id?: string | null
          id?: string
          nome_produto: string
          qtd: number
          status_analise?: string
          valor_total: number
          valor_unitario: number
        }
        Update: {
          analista_id?: string | null
          atualizado_em?: string
          cliente_id?: string | null
          codigo_rastreio?: string | null
          criado_em?: string
          descricao?: string | null
          formulario_comercial_id?: string | null
          id?: string
          nome_produto?: string
          qtd?: number
          status_analise?: string
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
      solicitacoes_compra: {
        Row: {
          atualizado_em: string
          cor: string | null
          criado_em: string
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
          cor?: string | null
          criado_em?: string
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
          cor?: string | null
          criado_em?: string
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
      whatsapp_sessions: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          phone: string
          step: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          phone: string
          step?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
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

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: alocacao_montagem
//   id: uuid (not null, default: gen_random_uuid())
//   montador_id: uuid (not null)
//   card_id: uuid (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: ambientes
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   nome: text (not null)
//   metragem: numeric (nullable)
//   descricao: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: assinantes
//   id: uuid (not null, default: gen_random_uuid())
//   envelope_id: uuid (nullable)
//   nome_completo: text (not null)
//   email: text (nullable)
//   papel: text (not null)
//   papel_descricao: text (nullable)
//   tipo_assinatura: text (nullable, default: 'link'::text)
//   cpf: text (nullable)
//   data_nascimento: date (nullable)
//   codigo_verificacao: text (nullable)
//   codigo_expira_em: timestamp with time zone (nullable)
//   assinatura_base64: text (nullable)
//   status: text (nullable, default: 'pendente'::text)
//   token_acesso: text (nullable)
//   assinado_em: timestamp with time zone (nullable)
//   ip_address: text (nullable)
// Table: assinaturas
//   id: uuid (not null, default: gen_random_uuid())
//   documento_id: text (not null)
//   documento_nome: text (not null)
//   cliente_id: uuid (nullable)
//   signatario_tipo: text (not null)
//   signatario_nome: text (not null)
//   signatario_cpf: text (nullable)
//   signatario_email: text (nullable)
//   signatario_telefone: text (nullable)
//   codigo_confirmacao: text (not null)
//   status: text (not null, default: 'pendente'::text)
//   data_assinatura: timestamp with time zone (nullable)
//   expira_em: timestamp with time zone (not null)
//   criado_em: timestamp with time zone (not null, default: now())
//   ip_assinatura: text (nullable)
//   signatario_data_nascimento: date (nullable)
//   assinatura_imagem: text (nullable)
//   clt_id: uuid (nullable)
//   pj_id: uuid (nullable)
// Table: clientes
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   email: text (not null)
//   telefone: text (not null)
//   status: text (not null, default: 'Ativo'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   lead_id: uuid (nullable)
//   cpf: text (nullable)
//   endereco_obra: text (nullable)
//   numero: text (nullable)
//   complemento: text (nullable)
//   bairro: text (nullable)
//   cidade: text (nullable)
//   estado: text (nullable)
//   cep: text (nullable)
//   tipo_imovel: text (nullable)
//   metragem_total: numeric (nullable)
//   usuario_id: uuid (nullable)
//   data_nascimento: date (nullable)
//   profissao: text (nullable)
//   renda: numeric (nullable)
//   referencia_bancaria: text (nullable)
// Table: contas_pagar
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   fornecedor: text (not null)
//   descricao: text (nullable)
//   categoria: text (nullable)
//   valor: numeric (not null)
//   data_vencimento: date (not null)
//   data_pagamento: date (nullable)
//   status_pagamento: text (not null, default: 'aguardando'::text)
//   codigo_barras: text (nullable)
//   comprovante_url: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   meio_pagamento: text (nullable)
//   antecipado: boolean (nullable, default: false)
// Table: contas_receber
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   cliente_id: uuid (nullable)
//   formulario_comercial_id: uuid (nullable)
//   numero_parcela: text (not null)
//   data_vencimento: date (not null)
//   valor: numeric (not null)
//   status_pagamento: text (not null, default: 'aguardando'::text)
//   data_pagamento: date (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   meio_pagamento: text (nullable)
//   antecipado: boolean (nullable, default: false)
//   comprovante_url: text (nullable)
//   descricao: text (nullable)
//   categoria: text (nullable)
// Table: document_templates
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   conteudo: text (not null)
//   ativo: boolean (nullable, default: true)
//   atualizado_em: timestamp without time zone (nullable, default: now())
// Table: documentos_cliente
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   tipo: text (not null)
//   template_id: uuid (nullable)
//   status: text (not null, default: 'Pendente'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   projeto_id: uuid (nullable)
//   arquivo_url: text (nullable)
//   template_nome: text (nullable)
//   arquivo_assinado_url: text (nullable)
//   conteudo_preenchido: text (nullable)
// Table: documentos_equipe
//   id: uuid (not null, default: gen_random_uuid())
//   clt_id: uuid (nullable)
//   pj_id: uuid (nullable)
//   nome: text (not null)
//   arquivo_url: text (not null)
//   tipo: text (nullable)
//   criado_em: timestamp with time zone (nullable, default: now())
// Table: documentos_gerados
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   user_id: uuid (nullable)
//   nome: text (not null)
//   path: text (not null)
//   tipo: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: dossies
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   cliente_id: uuid (nullable)
//   formulario_comercial_id: uuid (nullable)
//   contrato_url: text (nullable)
//   termo_conclusao_url: text (nullable)
//   termo_garantia_url: text (nullable)
//   ata_reuniao_url: text (nullable)
//   caderno_tecnico_url: text (nullable)
//   renders_url: text (nullable)
//   arquivo_projeto_url: text (nullable)
//   drafts_medida_url: text (nullable)
//   status: text (not null, default: 'em_documentacao'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: empresa
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   logo_url: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: envelopes_assinatura
//   id: uuid (not null, default: gen_random_uuid())
//   documento_id: text (not null)
//   cliente_id: uuid (nullable)
//   nome_documento: text (not null)
//   status: text (nullable, default: 'aguardando'::text)
//   criado_por: uuid (nullable)
//   criado_em: timestamp with time zone (nullable, default: now())
//   concluido_em: timestamp with time zone (nullable)
//   clt_id: uuid (nullable)
//   pj_id: uuid (nullable)
// Table: equipe_clt
//   id: uuid (not null, default: gen_random_uuid())
//   nome_completo: text (not null)
//   rg: text (nullable)
//   cpf: text (nullable)
//   data_nascimento: date (nullable)
//   data_admissao: date (nullable)
//   ctps: text (nullable)
//   pis: text (nullable)
//   cnh: text (nullable)
//   cnh_categoria: text (nullable)
//   telefone: text (nullable)
//   email: text (nullable)
//   cep: text (nullable)
//   rua: text (nullable)
//   numero: text (nullable)
//   complemento: text (nullable)
//   bairro: text (nullable)
//   municipio: text (nullable)
//   estado: text (nullable)
//   salario_base: numeric (nullable)
//   ferias_adiantadas_dias: integer (nullable, default: 0)
//   criado_em: timestamp with time zone (nullable, default: now())
//   atualizado_em: timestamp with time zone (nullable, default: now())
//   observacoes: text (nullable)
// Table: estoque_caixas
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   projeto_id: uuid (nullable)
//   nome: text (not null)
//   status: text (not null, default: 'separacao'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: estoque_caixas_itens
//   id: uuid (not null, default: gen_random_uuid())
//   caixa_id: uuid (nullable)
//   item_id: uuid (nullable)
//   quantidade: numeric (not null)
//   status: text (not null, default: 'reservado'::text)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: estoque_itens
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   categoria: text (nullable)
//   quantidade: numeric (not null, default: 0)
//   unidade: text (not null, default: 'un'::text)
//   estoque_minimo: numeric (not null, default: 0)
//   valor_unitario: numeric (not null, default: 0)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   fornecedor: text (nullable)
//   terceirizado: boolean (nullable, default: false)
// Table: estoque_itens_cliente
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_nome: text (not null)
//   produto: text (not null)
//   recebido_em: timestamp with time zone (not null, default: now())
//   entregue_em: timestamp with time zone (nullable)
//   responsavel_entrega: text (nullable)
//   usuario_id: uuid (nullable)
// Table: estoque_movimentacoes
//   id: uuid (not null, default: gen_random_uuid())
//   item_id: uuid (not null)
//   tipo: text (not null)
//   quantidade: numeric (not null)
//   nota_fiscal_id: uuid (nullable)
//   pedido_id: uuid (nullable)
//   usuario_id: uuid (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: estoque_sobras
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   largura: numeric (not null)
//   altura: numeric (not null)
//   area: numeric (not null)
//   status: text (not null, default: 'disponivel'::text)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: formulario_comercial
//   id: uuid (not null, default: gen_random_uuid())
//   lead_id: uuid (not null)
//   cpf: text (nullable)
//   data_nascimento: date (nullable)
//   profissao: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   cliente_id: uuid (nullable)
//   etapa_atual: integer (nullable, default: 1)
//   estado_civil: text (nullable)
//   cep: text (nullable)
//   rua: text (nullable)
//   numero: text (nullable)
//   bairro: text (nullable)
//   municipio: text (nullable)
//   estado: text (nullable)
//   complemento: text (nullable)
//   obra_cep: text (nullable)
//   obra_municipio: text (nullable)
//   obra_estado: text (nullable)
//   obra_rua: text (nullable)
//   obra_numero: text (nullable)
//   obra_bairro: text (nullable)
//   obra_complemento: text (nullable)
//   produtos_servicos: jsonb (nullable, default: '[]'::jsonb)
//   desconto: numeric (nullable, default: 0)
//   pagamentos: jsonb (nullable, default: '[]'::jsonb)
//   datas: jsonb (nullable, default: '{}'::jsonb)
//   user_id: uuid (not null, default: auth.uid())
//   valor_total: numeric (nullable)
//   data_prevista_entrega: date (nullable)
//   parcelas: jsonb (nullable, default: '[]'::jsonb)
//   metodo_pagamento: text (nullable)
//   data_pagamento: date (nullable)
//   nome_cliente: text (nullable)
//   ambientes: jsonb (nullable, default: '[]'::jsonb)
//   itens: jsonb (nullable, default: '[]'::jsonb)
//   especificacoes: text (nullable)
// Table: kanban_historico
//   id: uuid (not null, default: gen_random_uuid())
//   card_id: uuid (nullable)
//   status_anterior: text (nullable)
//   status_novo: text (not null)
//   usuario_id: uuid (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: leads
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   email: text (not null)
//   telefone: text (not null)
//   origem: text (not null)
//   consultor_id: uuid (nullable)
//   status: text (not null, default: 'Novo Lead'::text)
//   notas: text (nullable)
//   ordem: integer (not null, default: 0)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   criado_por_nome: text (nullable)
//   kanban_ativo: boolean (not null, default: true)
//   data_venda: timestamp with time zone (nullable)
//   categoria: text (not null, default: 'Comercial'::text)
//   notas_pessoais: text (nullable)
// Table: listas_materiais
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   arquivo_url: text (nullable)
//   status: text (nullable, default: 'pendente'::text)
//   itens: jsonb (nullable, default: '[]'::jsonb)
//   criado_em: timestamp with time zone (nullable, default: now())
//   atualizado_em: timestamp with time zone (nullable, default: now())
// Table: logs_ia
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (nullable)
//   acao: text (not null)
//   detalhes: jsonb (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: matriz_permissoes
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (not null)
//   modulo: text (not null)
//   nivel_acesso: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: montadores
//   id: uuid (not null, default: gen_random_uuid())
//   nome_completo: text (not null)
//   telefone: text (nullable)
//   status: text (not null, default: 'Disponível'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: notas_fiscais
//   id: uuid (not null, default: gen_random_uuid())
//   pedido_id: uuid (nullable)
//   numero_nota: text (nullable)
//   fornecedor: text (not null)
//   valor_total: numeric (not null)
//   data_emissao: date (nullable)
//   arquivo_url: text (nullable)
//   status_reconciliacao: text (not null, default: 'pendente'::text)
//   dados_ocr: jsonb (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: notificacoes
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (not null)
//   titulo: text (not null)
//   mensagem: text (not null)
//   lida: boolean (not null, default: false)
//   link: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: pagamentos
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   forma_pagamento: text (not null)
//   numero_parcelas: integer (nullable)
//   valor_total: numeric (not null)
//   data_primeira_parcela: date (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   formulario_id: uuid (nullable)
//   tipo_pagamento: text (nullable)
//   data_pagamento: date (nullable)
//   meio_pagamento: text (nullable)
//   atualizado_em: timestamp with time zone (nullable, default: now())
// Table: parceiros_pj
//   id: uuid (not null, default: gen_random_uuid())
//   razao_social: text (not null)
//   cnpj: text (nullable)
//   cep: text (nullable)
//   rua: text (nullable)
//   numero: text (nullable)
//   complemento: text (nullable)
//   bairro: text (nullable)
//   municipio: text (nullable)
//   estado: text (nullable)
//   socio_nome: text (nullable)
//   socio_rg: text (nullable)
//   socio_cpf: text (nullable)
//   socio_data_nascimento: date (nullable)
//   telefone: text (nullable)
//   email: text (nullable)
//   ajuda_custo: numeric (nullable)
//   comissoes: numeric (nullable)
//   criado_em: timestamp with time zone (nullable, default: now())
//   atualizado_em: timestamp with time zone (nullable, default: now())
//   observacoes: text (nullable)
// Table: parcelas
//   id: uuid (not null, default: gen_random_uuid())
//   pagamento_id: uuid (nullable)
//   numero: integer (not null)
//   data_vencimento: date (not null)
//   valor: numeric (not null)
//   status: text (not null, default: 'Pendente'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   numero_parcela: integer (nullable)
//   valor_parcela: numeric (nullable)
//   meio_pagamento: text (nullable)
//   atualizado_em: timestamp with time zone (nullable, default: now())
// Table: pedidos_compra
//   id: uuid (not null, default: gen_random_uuid())
//   fornecedor: text (not null)
//   data_pedido: date (not null)
//   status: text (not null, default: 'pendente'::text)
//   valor_total: numeric (not null, default: 0)
//   notas: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: pedidos_compra_itens
//   id: uuid (not null, default: gen_random_uuid())
//   pedido_id: uuid (not null)
//   item_id: uuid (not null)
//   quantidade: numeric (not null)
//   valor_unitario: numeric (not null)
//   valor_total: numeric (not null)
// Table: placeholders
//   id: uuid (not null, default: gen_random_uuid())
//   placeholder: text (not null)
//   descricao: text (not null)
//   origem: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   user_id: uuid (not null)
// Table: produtos_servicos
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   ambiente_id: uuid (nullable)
//   nome: text (not null)
//   quantidade: numeric (not null)
//   valor_unitario: numeric (not null)
//   valor_total: numeric (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: produtos_servicos_projeto
//   id: uuid (not null, default: gen_random_uuid())
//   formulario_comercial_id: uuid (nullable)
//   cliente_id: uuid (nullable)
//   nome_produto: text (not null)
//   qtd: integer (not null)
//   descricao: text (nullable)
//   valor_unitario: numeric (not null)
//   valor_total: numeric (not null)
//   status_analise: text (not null, default: 'iniciar'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   analista_id: uuid (nullable)
//   codigo_rastreio: text (nullable)
// Table: solicitacoes_compra
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (not null)
//   nome_item: text (not null)
//   quantidade: numeric (not null)
//   unidade: text (not null)
//   link: text (nullable)
//   cor: text (nullable)
//   tamanho: text (nullable)
//   modelo: text (nullable)
//   motivo: text (nullable)
//   urgencia: text (not null, default: 'Média'::text)
//   status: text (not null, default: 'Pendente'::text)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: templates
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   tipo: text (not null)
//   arquivo_url: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   descricao: text (nullable)
//   user_id: uuid (nullable, default: auth.uid())
//   placeholders_customizados: jsonb (nullable, default: '[]'::jsonb)
//   status: text (not null, default: 'ativo'::text)
// Table: timeline_eventos
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   usuario_nome: text (not null)
//   acao: text (not null)
//   icone: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: users
//   id: uuid (not null)
//   email: text (not null)
//   nome: text (not null)
//   telefone: text (nullable)
//   funcao: text (nullable)
//   foto_perfil: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
//   status: boolean (not null, default: true)
// Table: whatsapp_sessions
//   id: uuid (not null, default: gen_random_uuid())
//   phone: text (not null)
//   lead_id: uuid (nullable)
//   step: integer (not null, default: 0)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: alocacao_montagem
//   FOREIGN KEY alocacao_montagem_card_id_fkey: FOREIGN KEY (card_id) REFERENCES produtos_servicos_projeto(id) ON DELETE CASCADE
//   FOREIGN KEY alocacao_montagem_montador_id_fkey: FOREIGN KEY (montador_id) REFERENCES montadores(id) ON DELETE CASCADE
//   PRIMARY KEY alocacao_montagem_pkey: PRIMARY KEY (id)
// Table: ambientes
//   FOREIGN KEY ambientes_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY ambientes_pkey: PRIMARY KEY (id)
// Table: assinantes
//   FOREIGN KEY assinantes_envelope_id_fkey: FOREIGN KEY (envelope_id) REFERENCES envelopes_assinatura(id) ON DELETE CASCADE
//   PRIMARY KEY assinantes_pkey: PRIMARY KEY (id)
//   UNIQUE assinantes_token_acesso_key: UNIQUE (token_acesso)
// Table: assinaturas
//   FOREIGN KEY assinaturas_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY assinaturas_clt_id_fkey: FOREIGN KEY (clt_id) REFERENCES equipe_clt(id) ON DELETE CASCADE
//   FOREIGN KEY assinaturas_pj_id_fkey: FOREIGN KEY (pj_id) REFERENCES parceiros_pj(id) ON DELETE CASCADE
//   PRIMARY KEY assinaturas_pkey: PRIMARY KEY (id)
// Table: clientes
//   UNIQUE clientes_cpf_key: UNIQUE (cpf)
//   FOREIGN KEY clientes_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
//   PRIMARY KEY clientes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY clientes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: contas_pagar
//   PRIMARY KEY contas_pagar_pkey: PRIMARY KEY (id)
//   FOREIGN KEY contas_pagar_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: contas_receber
//   FOREIGN KEY contas_receber_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY contas_receber_formulario_comercial_id_fkey: FOREIGN KEY (formulario_comercial_id) REFERENCES formulario_comercial(id) ON DELETE CASCADE
//   PRIMARY KEY contas_receber_pkey: PRIMARY KEY (id)
//   FOREIGN KEY contas_receber_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: document_templates
//   UNIQUE document_templates_nome_key: UNIQUE (nome)
//   PRIMARY KEY document_templates_pkey: PRIMARY KEY (id)
// Table: documentos_cliente
//   FOREIGN KEY documentos_cliente_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY documentos_cliente_pkey: PRIMARY KEY (id)
//   FOREIGN KEY documentos_cliente_template_id_fkey: FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
// Table: documentos_equipe
//   CHECK documentos_equipe_check: CHECK (((clt_id IS NOT NULL) OR (pj_id IS NOT NULL)))
//   FOREIGN KEY documentos_equipe_clt_id_fkey: FOREIGN KEY (clt_id) REFERENCES equipe_clt(id) ON DELETE CASCADE
//   FOREIGN KEY documentos_equipe_pj_id_fkey: FOREIGN KEY (pj_id) REFERENCES parceiros_pj(id) ON DELETE CASCADE
//   PRIMARY KEY documentos_equipe_pkey: PRIMARY KEY (id)
// Table: documentos_gerados
//   FOREIGN KEY documentos_gerados_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY documentos_gerados_pkey: PRIMARY KEY (id)
//   FOREIGN KEY documentos_gerados_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: dossies
//   FOREIGN KEY dossies_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY dossies_formulario_comercial_id_fkey: FOREIGN KEY (formulario_comercial_id) REFERENCES formulario_comercial(id) ON DELETE CASCADE
//   PRIMARY KEY dossies_pkey: PRIMARY KEY (id)
//   FOREIGN KEY dossies_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: empresa
//   PRIMARY KEY empresa_pkey: PRIMARY KEY (id)
// Table: envelopes_assinatura
//   FOREIGN KEY envelopes_assinatura_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY envelopes_assinatura_clt_id_fkey: FOREIGN KEY (clt_id) REFERENCES equipe_clt(id) ON DELETE CASCADE
//   FOREIGN KEY envelopes_assinatura_criado_por_fkey: FOREIGN KEY (criado_por) REFERENCES auth.users(id)
//   FOREIGN KEY envelopes_assinatura_pj_id_fkey: FOREIGN KEY (pj_id) REFERENCES parceiros_pj(id) ON DELETE CASCADE
//   PRIMARY KEY envelopes_assinatura_pkey: PRIMARY KEY (id)
// Table: equipe_clt
//   PRIMARY KEY equipe_clt_pkey: PRIMARY KEY (id)
// Table: estoque_caixas
//   FOREIGN KEY estoque_caixas_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY estoque_caixas_pkey: PRIMARY KEY (id)
//   FOREIGN KEY estoque_caixas_projeto_id_fkey: FOREIGN KEY (projeto_id) REFERENCES formulario_comercial(id) ON DELETE CASCADE
// Table: estoque_caixas_itens
//   FOREIGN KEY estoque_caixas_itens_caixa_id_fkey: FOREIGN KEY (caixa_id) REFERENCES estoque_caixas(id) ON DELETE CASCADE
//   FOREIGN KEY estoque_caixas_itens_item_id_fkey: FOREIGN KEY (item_id) REFERENCES estoque_itens(id) ON DELETE CASCADE
//   PRIMARY KEY estoque_caixas_itens_pkey: PRIMARY KEY (id)
// Table: estoque_itens
//   PRIMARY KEY estoque_itens_pkey: PRIMARY KEY (id)
// Table: estoque_itens_cliente
//   PRIMARY KEY estoque_itens_cliente_pkey: PRIMARY KEY (id)
//   FOREIGN KEY estoque_itens_cliente_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: estoque_movimentacoes
//   FOREIGN KEY estoque_movimentacoes_item_id_fkey: FOREIGN KEY (item_id) REFERENCES estoque_itens(id) ON DELETE CASCADE
//   FOREIGN KEY estoque_movimentacoes_nota_fiscal_id_fkey: FOREIGN KEY (nota_fiscal_id) REFERENCES notas_fiscais(id) ON DELETE SET NULL
//   FOREIGN KEY estoque_movimentacoes_pedido_id_fkey: FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE SET NULL
//   PRIMARY KEY estoque_movimentacoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY estoque_movimentacoes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: estoque_sobras
//   PRIMARY KEY estoque_sobras_pkey: PRIMARY KEY (id)
// Table: formulario_comercial
//   FOREIGN KEY fk_formulario_user: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
//   FOREIGN KEY formulario_comercial_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY formulario_comercial_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   UNIQUE formulario_comercial_lead_id_key: UNIQUE (lead_id)
//   PRIMARY KEY formulario_comercial_pkey: PRIMARY KEY (id)
// Table: kanban_historico
//   FOREIGN KEY kanban_historico_card_id_fkey: FOREIGN KEY (card_id) REFERENCES produtos_servicos_projeto(id) ON DELETE CASCADE
//   PRIMARY KEY kanban_historico_pkey: PRIMARY KEY (id)
//   FOREIGN KEY kanban_historico_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: leads
//   FOREIGN KEY leads_consultor_id_fkey: FOREIGN KEY (consultor_id) REFERENCES users(id) ON DELETE SET NULL
//   PRIMARY KEY leads_pkey: PRIMARY KEY (id)
// Table: listas_materiais
//   FOREIGN KEY listas_materiais_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY listas_materiais_pkey: PRIMARY KEY (id)
// Table: logs_ia
//   PRIMARY KEY logs_ia_pkey: PRIMARY KEY (id)
//   FOREIGN KEY logs_ia_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: matriz_permissoes
//   PRIMARY KEY matriz_permissoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY matriz_permissoes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
// Table: montadores
//   PRIMARY KEY montadores_pkey: PRIMARY KEY (id)
// Table: notas_fiscais
//   FOREIGN KEY notas_fiscais_pedido_id_fkey: FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE SET NULL
//   PRIMARY KEY notas_fiscais_pkey: PRIMARY KEY (id)
// Table: notificacoes
//   PRIMARY KEY notificacoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY notificacoes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: pagamentos
//   FOREIGN KEY pagamentos_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY pagamentos_formulario_id_fkey: FOREIGN KEY (formulario_id) REFERENCES formulario_comercial(id) ON DELETE CASCADE
//   PRIMARY KEY pagamentos_pkey: PRIMARY KEY (id)
// Table: parceiros_pj
//   PRIMARY KEY parceiros_pj_pkey: PRIMARY KEY (id)
// Table: parcelas
//   FOREIGN KEY parcelas_pagamento_id_fkey: FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id) ON DELETE CASCADE
//   PRIMARY KEY parcelas_pkey: PRIMARY KEY (id)
// Table: pedidos_compra
//   PRIMARY KEY pedidos_compra_pkey: PRIMARY KEY (id)
// Table: pedidos_compra_itens
//   FOREIGN KEY pedidos_compra_itens_item_id_fkey: FOREIGN KEY (item_id) REFERENCES estoque_itens(id) ON DELETE RESTRICT
//   FOREIGN KEY pedidos_compra_itens_pedido_id_fkey: FOREIGN KEY (pedido_id) REFERENCES pedidos_compra(id) ON DELETE CASCADE
//   PRIMARY KEY pedidos_compra_itens_pkey: PRIMARY KEY (id)
// Table: placeholders
//   PRIMARY KEY placeholders_pkey: PRIMARY KEY (id)
//   UNIQUE placeholders_placeholder_user_id_key: UNIQUE (placeholder, user_id)
//   FOREIGN KEY placeholders_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: produtos_servicos
//   FOREIGN KEY produtos_servicos_ambiente_id_fkey: FOREIGN KEY (ambiente_id) REFERENCES ambientes(id) ON DELETE CASCADE
//   FOREIGN KEY produtos_servicos_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY produtos_servicos_pkey: PRIMARY KEY (id)
// Table: produtos_servicos_projeto
//   FOREIGN KEY produtos_servicos_projeto_analista_id_fkey: FOREIGN KEY (analista_id) REFERENCES users(id) ON DELETE SET NULL
//   FOREIGN KEY produtos_servicos_projeto_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   FOREIGN KEY produtos_servicos_projeto_formulario_comercial_id_fkey: FOREIGN KEY (formulario_comercial_id) REFERENCES formulario_comercial(id) ON DELETE CASCADE
//   PRIMARY KEY produtos_servicos_projeto_pkey: PRIMARY KEY (id)
// Table: solicitacoes_compra
//   PRIMARY KEY solicitacoes_compra_pkey: PRIMARY KEY (id)
//   FOREIGN KEY solicitacoes_compra_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
// Table: templates
//   PRIMARY KEY templates_pkey: PRIMARY KEY (id)
//   FOREIGN KEY templates_user_id_fkey: FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
// Table: timeline_eventos
//   FOREIGN KEY timeline_eventos_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY timeline_eventos_pkey: PRIMARY KEY (id)
// Table: users
//   UNIQUE users_email_key: UNIQUE (email)
//   FOREIGN KEY users_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY users_pkey: PRIMARY KEY (id)
// Table: whatsapp_sessions
//   FOREIGN KEY whatsapp_sessions_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
//   UNIQUE whatsapp_sessions_phone_key: UNIQUE (phone)
//   PRIMARY KEY whatsapp_sessions_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: alocacao_montagem
//   Policy "alocacao_montagem_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: ambientes
//   Policy "ambientes_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "ambientes_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "ambientes_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "ambientes_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: assinantes
//   Policy "assinantes_delete" (DELETE, PERMISSIVE) roles={public}
//     USING: true
//   Policy "assinantes_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "assinantes_select" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "assinantes_update" (UPDATE, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
// Table: assinaturas
//   Policy "Acesso total assinaturas" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Assinaturas All Access" (ALL, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
// Table: clientes
//   Policy "Acesso total clientes" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "clientes_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "clientes_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "clientes_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin(auth.uid()))
//   Policy "clientes_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin(auth.uid()))
// Table: contas_pagar
//   Policy "Acesso total contas_pagar" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: contas_receber
//   Policy "contas_receber_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "contas_receber_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "contas_receber_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "contas_receber_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//     WITH CHECK: (user_id = auth.uid())
// Table: document_templates
//   Policy "document_templates_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "permissao_leitura_edge_function" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: documentos_cliente
//   Policy "documentos_cliente_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "documentos_cliente_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "documentos_cliente_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "documentos_cliente_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: documentos_equipe
//   Policy "documentos_equipe_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: documentos_gerados
//   Policy "documentos_gerados_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "documentos_gerados_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "documentos_gerados_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "documentos_gerados_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: dossies
//   Policy "Acesso total dossies" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "dossies_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "dossies_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (user_id = auth.uid())
//   Policy "dossies_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//   Policy "dossies_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (user_id = auth.uid())
//     WITH CHECK: (user_id = auth.uid())
// Table: empresa
//   Policy "Admin pode atualizar empresa" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (is_admin(auth.uid()) OR ((auth.jwt() ->> 'email'::text) = 'admin@bender.com'::text))
//   Policy "Admin pode deletar empresa" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (is_admin(auth.uid()) OR ((auth.jwt() ->> 'email'::text) = 'admin@bender.com'::text))
//   Policy "Admin pode inserir empresa" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (is_admin(auth.uid()) OR ((auth.jwt() ->> 'email'::text) = 'admin@bender.com'::text))
//   Policy "Leitura autenticada empresa" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Leitura pública dados empresa" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: envelopes_assinatura
//   Policy "envelopes_assinatura_delete" (DELETE, PERMISSIVE) roles={public}
//     USING: true
//   Policy "envelopes_assinatura_insert" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: true
//   Policy "envelopes_assinatura_select" (SELECT, PERMISSIVE) roles={public}
//     USING: true
//   Policy "envelopes_assinatura_update" (UPDATE, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
// Table: equipe_clt
//   Policy "equipe_clt_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: estoque_caixas
//   Policy "estoque_caixas_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: estoque_caixas_itens
//   Policy "estoque_caixas_itens_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: estoque_itens
//   Policy "estoque_itens_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: estoque_itens_cliente
//   Policy "estoque_itens_cliente_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: estoque_movimentacoes
//   Policy "estoque_movimentacoes_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: estoque_sobras
//   Policy "estoque_sobras_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: formulario_comercial
//   Policy "Acesso total formulario" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Admin can delete all forms" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Admin can insert all forms" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin(auth.uid())
//   Policy "Admin can select all forms" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Admin can update all forms" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//     WITH CHECK: is_admin(auth.uid())
//   Policy "Enable delete for own forms" (DELETE, PERMISSIVE) roles={public}
//     USING: (auth.uid() = user_id)
//   Policy "Enable insert for own forms" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "Enable read access for own forms" (SELECT, PERMISSIVE) roles={public}
//     USING: (auth.uid() = user_id)
//   Policy "Enable update for own forms" (UPDATE, PERMISSIVE) roles={public}
//     USING: (auth.uid() = user_id)
//   Policy "Users can delete own formulario_comercial" (DELETE, PERMISSIVE) roles={public}
//     USING: (auth.uid() = user_id)
//   Policy "Users can insert own formulario_comercial" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "Users can select own formulario_comercial" (SELECT, PERMISSIVE) roles={public}
//     USING: (auth.uid() = user_id)
//   Policy "Users can update own formulario_comercial" (UPDATE, PERMISSIVE) roles={public}
//     USING: (auth.uid() = user_id)
//     WITH CHECK: (auth.uid() = user_id)
// Table: kanban_historico
//   Policy "kanban_history_access" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: leads
//   Policy "Leads all access" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: listas_materiais
//   Policy "listas_materiais_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: logs_ia
//   Policy "Acesso total logs_ia" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: matriz_permissoes
//   Policy "Admin gerencia permissões (Delete)" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Admin gerencia permissões (Insert)" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin(auth.uid())
//   Policy "Admin gerencia permissões (Update)" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Ver próprias permissões ou admin" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin(auth.uid()))
// Table: montadores
//   Policy "montadores_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: notas_fiscais
//   Policy "notas_fiscais_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: notificacoes
//   Policy "Enable insert for system or admins" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for own notifications" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (usuario_id = auth.uid())
//   Policy "Enable update for own notifications" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (usuario_id = auth.uid())
//     WITH CHECK: (usuario_id = auth.uid())
// Table: pagamentos
//   Policy "Enable insert for own payments" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM formulario_comercial f   WHERE ((f.id = pagamentos.formulario_id) AND (f.user_id = auth.uid()))))
//   Policy "Enable read access for own payments" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM formulario_comercial f   WHERE ((f.id = pagamentos.formulario_id) AND (f.user_id = auth.uid()))))
// Table: parceiros_pj
//   Policy "parceiros_pj_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: parcelas
//   Policy "Enable delete for own parcels" (DELETE, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM (pagamentos p      JOIN formulario_comercial f ON ((f.id = p.formulario_id)))   WHERE ((p.id = parcelas.pagamento_id) AND (f.user_id = auth.uid()))))
//   Policy "Enable insert for own parcels" (INSERT, PERMISSIVE) roles={public}
//     WITH CHECK: (EXISTS ( SELECT 1    FROM (pagamentos p      JOIN formulario_comercial f ON ((f.id = p.formulario_id)))   WHERE ((p.id = parcelas.pagamento_id) AND (f.user_id = auth.uid()))))
//   Policy "Enable read access for own parcels" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM (pagamentos p      JOIN formulario_comercial f ON ((f.id = p.formulario_id)))   WHERE ((p.id = parcelas.pagamento_id) AND (f.user_id = auth.uid()))))
//   Policy "Enable update for own parcels" (UPDATE, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM (pagamentos p      JOIN formulario_comercial f ON ((f.id = p.formulario_id)))   WHERE ((p.id = parcelas.pagamento_id) AND (f.user_id = auth.uid()))))
// Table: pedidos_compra
//   Policy "pedidos_compra_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: pedidos_compra_itens
//   Policy "pedidos_compra_itens_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: placeholders
//   Policy "placeholders_delete_own" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "placeholders_insert_own" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "placeholders_select_own" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "placeholders_update_own" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//     WITH CHECK: (auth.uid() = user_id)
// Table: produtos_servicos
//   Policy "produtos_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "produtos_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "produtos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "produtos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: produtos_servicos_projeto
//   Policy "produtos_servicos_projeto_delete" (DELETE, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM formulario_comercial f   WHERE ((f.id = produtos_servicos_projeto.formulario_comercial_id) AND (f.user_id = auth.uid()))))
//   Policy "produtos_servicos_projeto_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (((formulario_comercial_id IS NOT NULL) AND (EXISTS ( SELECT 1    FROM formulario_comercial f   WHERE ((f.id = produtos_servicos_projeto.formulario_comercial_id) AND (f.user_id = auth.uid()))))) OR has_module_access(auth.uid(), 'Análise Técnica'::text) OR has_module_access(auth.uid(), 'Produção'::text) OR has_module_access(auth.uid(), 'Montagem'::text) OR is_admin(auth.uid()))
//   Policy "produtos_servicos_projeto_select" (SELECT, PERMISSIVE) roles={public}
//     USING: (EXISTS ( SELECT 1    FROM formulario_comercial f   WHERE ((f.id = produtos_servicos_projeto.formulario_comercial_id) AND (f.user_id = auth.uid()))))
//   Policy "produtos_servicos_projeto_select_analise" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (has_module_access(auth.uid(), 'Análise Técnica'::text) OR has_module_access(auth.uid(), 'Produção'::text) OR has_module_access(auth.uid(), 'Montagem'::text) OR is_admin(auth.uid()))
//   Policy "produtos_servicos_projeto_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (((formulario_comercial_id IS NOT NULL) AND (EXISTS ( SELECT 1    FROM formulario_comercial f   WHERE ((f.id = produtos_servicos_projeto.formulario_comercial_id) AND (f.user_id = auth.uid()))))) OR has_module_access(auth.uid(), 'Análise Técnica'::text) OR has_module_access(auth.uid(), 'Produção'::text) OR has_module_access(auth.uid(), 'Montagem'::text) OR is_admin(auth.uid()))
// Table: solicitacoes_compra
//   Policy "Enable delete for own or admin" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin(auth.uid()))
//   Policy "Enable insert for authenticated users" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "Enable read access for all authenticated users" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Enable update for own or admin" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin(auth.uid()))
//     WITH CHECK: true
// Table: templates
//   Policy "templates_delete_own" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "templates_insert_own" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = user_id)
//   Policy "templates_select_own" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//   Policy "templates_update_own" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: (auth.uid() = user_id)
//     WITH CHECK: (auth.uid() = user_id)
// Table: timeline_eventos
//   Policy "Acesso total timeline" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "Timeline All Access" (ALL, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true
// Table: users
//   Policy "Admin atualiza usuários" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = id) OR is_admin(auth.uid()))
//     WITH CHECK: ((auth.uid() = id) OR is_admin(auth.uid()))
//   Policy "Admin deleta" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Admin insere usuários" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin(auth.uid())
//   Policy "Usuário edita seus dados" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = id) OR is_admin(auth.uid()))
//   Policy "Usuário insere sua conta" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = id)
//   Policy "Usuário vê apenas seus dados ou admin" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = id) OR is_admin(auth.uid()))
// Table: whatsapp_sessions
//   Policy "whatsapp_sessions_all" (ALL, PERMISSIVE) roles={public}
//     USING: true
//     WITH CHECK: true

// --- DATABASE FUNCTIONS ---
// FUNCTION generate_codigo_rastreio()
//   CREATE OR REPLACE FUNCTION public.generate_codigo_rastreio()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     cli_nome text;
//     skip_words text[] := ARRAY['de', 'da', 'do', 'das', 'dos', 'e'];
//     word text;
//     cli_initials text := '';
//     prod_prefix text;
//     seq_val integer;
//     word_count integer := 0;
//   BEGIN
//     IF NEW.codigo_rastreio IS NULL OR NEW.codigo_rastreio = '' THEN
//       -- Get client name
//       SELECT nome INTO cli_nome FROM public.clientes WHERE id = NEW.cliente_id;
//
//       IF cli_nome IS NULL THEN
//         cli_initials := 'CLI';
//       ELSE
//         -- Generate initials safely removing prepositions
//         FOR word IN SELECT unnest(string_to_array(trim(cli_nome), ' ')) LOOP
//           IF lower(word) != ALL(skip_words) AND length(word) > 0 THEN
//             cli_initials := cli_initials || upper(substring(word FROM 1 FOR 1));
//             word_count := word_count + 1;
//           END IF;
//         END LOOP;
//
//         IF word_count = 1 THEN
//           cli_initials := upper(substring(trim(cli_nome) FROM 1 FOR 3));
//         ELSE
//           cli_initials := substring(cli_initials FROM 1 FOR 3);
//         END IF;
//       END IF;
//
//       -- Generate product prefix
//       prod_prefix := upper(substring(regexp_replace(COALESCE(NEW.nome_produto, 'PRO'), '[^a-zA-Z]', '', 'g') FROM 1 FOR 3));
//       IF length(prod_prefix) < 3 THEN
//         prod_prefix := rpad(prod_prefix, 3, 'O');
//       END IF;
//
//       -- Get next sequence value from global sequence
//       seq_val := nextval('global_rastreio_seq');
//
//       -- Format and set code exactly matching the request
//       NEW.codigo_rastreio := cli_initials || '-' || prod_prefix || '-' || lpad(seq_val::text, 4, '0');
//     END IF;
//
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION get_timeline_eventos(uuid)
//   CREATE OR REPLACE FUNCTION public.get_timeline_eventos(p_cliente_id uuid)
//    RETURNS TABLE(id uuid, cliente_id uuid, usuario_nome text, acao text, icone text, criado_em timestamp with time zone, nome_exibicao text)
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public'
//   AS $function$
//   BEGIN
//     RETURN QUERY
//     SELECT
//       t.id,
//       t.cliente_id,
//       t.usuario_nome,
//       t.acao,
//       t.icone,
//       t.criado_em,
//       COALESCE(u.nome, t.usuario_nome) AS nome_exibicao
//     FROM public.timeline_eventos t
//     LEFT JOIN public.users u ON u.email = t.usuario_nome
//     WHERE t.cliente_id = p_cliente_id
//     ORDER BY t.criado_em DESC;
//   END;
//   $function$
//
// FUNCTION handle_caixa_item_reservado()
//   CREATE OR REPLACE FUNCTION public.handle_caixa_item_reservado()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     IF TG_OP = 'INSERT' THEN
//       UPDATE public.estoque_itens SET quantidade = quantidade - NEW.quantidade WHERE id = NEW.item_id;
//     ELSIF TG_OP = 'DELETE' THEN
//       IF OLD.status = 'reservado' THEN
//         UPDATE public.estoque_itens SET quantidade = quantidade + OLD.quantidade WHERE id = OLD.item_id;
//       END IF;
//     ELSIF TG_OP = 'UPDATE' THEN
//       IF NEW.quantidade <> OLD.quantidade AND NEW.status = 'reservado' THEN
//         UPDATE public.estoque_itens SET quantidade = quantidade - (NEW.quantidade - OLD.quantidade) WHERE id = NEW.item_id;
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION handle_new_user()
//   CREATE OR REPLACE FUNCTION public.handle_new_user()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     INSERT INTO public.users (id, email, nome)
//     VALUES (
//       NEW.id,
//       NEW.email,
//       COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
//     )
//     ON CONFLICT (id) DO UPDATE SET
//       email = EXCLUDED.email,
//       nome = EXCLUDED.nome;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION handle_updated_at()
//   CREATE OR REPLACE FUNCTION public.handle_updated_at()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.atualizado_em = NOW();
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION has_module_access(uuid, text)
//   CREATE OR REPLACE FUNCTION public.has_module_access(user_id uuid, mod text)
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     has_access boolean;
//   BEGIN
//     SELECT EXISTS(
//       SELECT 1 FROM public.matriz_permissoes
//       WHERE usuario_id = user_id AND modulo = mod AND nivel_acesso IN ('Admin', 'Editor', 'Leitor')
//     ) INTO has_access;
//     RETURN has_access;
//   END;
//   $function$
//
// FUNCTION is_admin(uuid)
//   CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     is_adm boolean;
//   BEGIN
//     SELECT EXISTS(
//       SELECT 1 FROM public.matriz_permissoes
//       WHERE usuario_id = user_id AND nivel_acesso = 'Admin'
//     ) INTO is_adm;
//     RETURN is_adm;
//   END;
//   $function$
//
// FUNCTION log_kanban_history()
//   CREATE OR REPLACE FUNCTION public.log_kanban_history()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     status_map jsonb := '{"iniciar": "Iniciar", "medida_fina": "Medida Fina", "reuniao_analise": "Reunião de Análise", "caderno_tecnico": "Caderno Técnico", "lista_materiais": "Lista de Materiais", "aguardando_plano_corte": "Aguardando Plano de Corte", "router": "Router", "coladeira": "Coladeira", "bancada": "Bancada", "embalagem": "Embalagem", "expedicao": "Expedição", "transporte": "Transporte", "montagem": "Montagem", "assistencia": "Assistência", "concluido": "Concluído"}'::jsonb;
//     human_status text;
//   BEGIN
//     IF NEW.status_analise IS DISTINCT FROM OLD.status_analise THEN
//       INSERT INTO public.kanban_historico (card_id, status_anterior, status_novo, usuario_id)
//       VALUES (NEW.id, OLD.status_analise, NEW.status_analise, auth.uid());
//
//       -- Automatic timeline events generated by the system reflecting Otto's management
//       IF NEW.cliente_id IS NOT NULL THEN
//         human_status := COALESCE(status_map->>NEW.status_analise, NEW.status_analise);
//         INSERT INTO public.timeline_eventos (cliente_id, usuario_nome, acao, icone)
//         VALUES (NEW.cliente_id, 'Seu Otto', 'Moveu o ambiente [' || NEW.nome_produto || '] para a etapa: ' || human_status, '⚙️');
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION notify_solicitacao_comprada()
//   CREATE OR REPLACE FUNCTION public.notify_solicitacao_comprada()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     IF NEW.status = 'Comprado' AND OLD.status != 'Comprado' THEN
//       INSERT INTO public.notificacoes (usuario_id, titulo, mensagem)
//       VALUES (
//         NEW.usuario_id,
//         'Material Disponível!',
//         'Sua solicitação do item "' || NEW.nome_item || '" foi marcada como Comprada/Disponível.'
//       );
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION rls_auto_enable()
//   CREATE OR REPLACE FUNCTION public.rls_auto_enable()
//    RETURNS event_trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'pg_catalog'
//   AS $function$
//   DECLARE
//     cmd record;
//   BEGIN
//     FOR cmd IN
//       SELECT *
//       FROM pg_event_trigger_ddl_commands()
//       WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
//         AND object_type IN ('table','partitioned table')
//     LOOP
//        IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
//         BEGIN
//           EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
//           RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
//         EXCEPTION
//           WHEN OTHERS THEN
//             RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
//         END;
//        ELSE
//           RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
//        END IF;
//     END LOOP;
//   END;
//   $function$
//
// FUNCTION trigger_finalize_signature()
//   CREATE OR REPLACE FUNCTION public.trigger_finalize_signature()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   DECLARE
//     pending_count INT;
//     req_id BIGINT;
//   BEGIN
//     IF NEW.status = 'assinado' AND (OLD.status IS DISTINCT FROM 'assinado') THEN
//       SELECT count(*) INTO pending_count
//       FROM public.assinaturas
//       WHERE documento_id = NEW.documento_id AND status != 'assinado';
//
//       IF pending_count = 0 THEN
//         SELECT net.http_post(
//           url := 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/finalize-signature-document',
//           headers := '{"Content-Type": "application/json"}'::jsonb,
//           body := json_build_object(
//             'documento_id', NEW.documento_id,
//             'cliente_id', NEW.cliente_id
//           )::jsonb
//         ) INTO req_id;
//       END IF;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: assinaturas
//   on_signature_completed: CREATE TRIGGER on_signature_completed AFTER UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION trigger_finalize_signature()
// Table: estoque_caixas_itens
//   trg_caixa_item_reservado: CREATE TRIGGER trg_caixa_item_reservado AFTER INSERT OR DELETE OR UPDATE ON public.estoque_caixas_itens FOR EACH ROW EXECUTE FUNCTION handle_caixa_item_reservado()
// Table: placeholders
//   set_placeholders_atualizado_em: CREATE TRIGGER set_placeholders_atualizado_em BEFORE UPDATE ON public.placeholders FOR EACH ROW EXECUTE FUNCTION handle_updated_at()
// Table: produtos_servicos_projeto
//   on_kanban_status_change: CREATE TRIGGER on_kanban_status_change AFTER UPDATE ON public.produtos_servicos_projeto FOR EACH ROW EXECUTE FUNCTION log_kanban_history()
//   trg_generate_codigo_rastreio: CREATE TRIGGER trg_generate_codigo_rastreio BEFORE INSERT ON public.produtos_servicos_projeto FOR EACH ROW EXECUTE FUNCTION generate_codigo_rastreio()
// Table: solicitacoes_compra
//   on_solicitacao_comprada: CREATE TRIGGER on_solicitacao_comprada AFTER UPDATE ON public.solicitacoes_compra FOR EACH ROW EXECUTE FUNCTION notify_solicitacao_comprada()
//   set_solicitacoes_compra_atualizado_em: CREATE TRIGGER set_solicitacoes_compra_atualizado_em BEFORE UPDATE ON public.solicitacoes_compra FOR EACH ROW EXECUTE FUNCTION handle_updated_at()
// Table: templates
//   set_templates_atualizado_em: CREATE TRIGGER set_templates_atualizado_em BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION handle_updated_at()

// --- INDEXES ---
// Table: assinantes
//   CREATE UNIQUE INDEX assinantes_token_acesso_key ON public.assinantes USING btree (token_acesso)
// Table: clientes
//   CREATE UNIQUE INDEX clientes_cpf_key ON public.clientes USING btree (cpf)
// Table: document_templates
//   CREATE UNIQUE INDEX document_templates_nome_key ON public.document_templates USING btree (nome)
// Table: formulario_comercial
//   CREATE UNIQUE INDEX formulario_comercial_lead_id_key ON public.formulario_comercial USING btree (lead_id)
//   CREATE INDEX idx_formulario_user_id ON public.formulario_comercial USING btree (user_id)
// Table: placeholders
//   CREATE UNIQUE INDEX placeholders_placeholder_user_id_key ON public.placeholders USING btree (placeholder, user_id)
// Table: templates
//   CREATE INDEX idx_templates_user_id_tipo ON public.templates USING btree (user_id, tipo)
// Table: users
//   CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
// Table: whatsapp_sessions
//   CREATE UNIQUE INDEX whatsapp_sessions_phone_key ON public.whatsapp_sessions USING btree (phone)
