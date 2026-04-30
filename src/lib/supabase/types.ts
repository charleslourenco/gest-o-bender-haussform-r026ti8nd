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
      documentos_cliente: {
        Row: {
          cliente_id: string | null
          criado_em: string
          id: string
          status: string
          template_id: string | null
          tipo: string
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          id?: string
          status?: string
          template_id?: string | null
          tipo: string
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          id?: string
          status?: string
          template_id?: string | null
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
      documentos_obrigatorios: {
        Row: {
          atualizado_em: string
          criado_em: string
          id: string
          status: boolean
          template_id: string | null
          tipo: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          status?: boolean
          template_id?: string | null
          tipo: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          id?: string
          status?: boolean
          template_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_obrigatorios_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'templates'
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
      leads: {
        Row: {
          atualizado_em: string
          consultor_id: string | null
          criado_em: string
          criado_por_nome: string | null
          email: string
          id: string
          nome: string
          notas: string | null
          ordem: number
          origem: string
          status: string
          telefone: string
        }
        Insert: {
          atualizado_em?: string
          consultor_id?: string | null
          criado_em?: string
          criado_por_nome?: string | null
          email: string
          id?: string
          nome: string
          notas?: string | null
          ordem?: number
          origem: string
          status?: string
          telefone: string
        }
        Update: {
          atualizado_em?: string
          consultor_id?: string | null
          criado_em?: string
          criado_por_nome?: string | null
          email?: string
          id?: string
          nome?: string
          notas?: string | null
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
      pagamentos: {
        Row: {
          cliente_id: string | null
          criado_em: string
          data_primeira_parcela: string | null
          forma_pagamento: string
          id: string
          numero_parcelas: number | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string
          data_primeira_parcela?: string | null
          forma_pagamento: string
          id?: string
          numero_parcelas?: number | null
          valor_total: number
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string
          data_primeira_parcela?: string | null
          forma_pagamento?: string
          id?: string
          numero_parcelas?: number | null
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
        ]
      }
      parcelas: {
        Row: {
          criado_em: string
          data_vencimento: string
          id: string
          numero: number
          pagamento_id: string | null
          status: string
          valor: number
        }
        Insert: {
          criado_em?: string
          data_vencimento: string
          id?: string
          numero: number
          pagamento_id?: string | null
          status?: string
          valor: number
        }
        Update: {
          criado_em?: string
          data_vencimento?: string
          id?: string
          numero?: number
          pagamento_id?: string | null
          status?: string
          valor?: number
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
      templates: {
        Row: {
          arquivo_url: string
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          arquivo_url: string
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          arquivo_url?: string
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
// Table: ambientes
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   nome: text (not null)
//   metragem: numeric (nullable)
//   descricao: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
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
// Table: documentos_cliente
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   tipo: text (not null)
//   template_id: uuid (nullable)
//   status: text (not null, default: 'Pendente'::text)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: documentos_obrigatorios
//   id: uuid (not null, default: gen_random_uuid())
//   tipo: text (not null)
//   template_id: uuid (nullable)
//   status: boolean (not null, default: true)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: empresa
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   logo_url: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
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
// Table: matriz_permissoes
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (not null)
//   modulo: text (not null)
//   nivel_acesso: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: pagamentos
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   forma_pagamento: text (not null)
//   numero_parcelas: integer (nullable)
//   valor_total: numeric (not null)
//   data_primeira_parcela: date (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: parcelas
//   id: uuid (not null, default: gen_random_uuid())
//   pagamento_id: uuid (nullable)
//   numero: integer (not null)
//   data_vencimento: date (not null)
//   valor: numeric (not null)
//   status: text (not null, default: 'Pendente'::text)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: produtos_servicos
//   id: uuid (not null, default: gen_random_uuid())
//   cliente_id: uuid (nullable)
//   ambiente_id: uuid (nullable)
//   nome: text (not null)
//   quantidade: numeric (not null)
//   valor_unitario: numeric (not null)
//   valor_total: numeric (not null)
//   criado_em: timestamp with time zone (not null, default: now())
// Table: templates
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   tipo: text (not null)
//   arquivo_url: text (not null)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
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

// --- CONSTRAINTS ---
// Table: ambientes
//   FOREIGN KEY ambientes_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY ambientes_pkey: PRIMARY KEY (id)
// Table: clientes
//   UNIQUE clientes_cpf_key: UNIQUE (cpf)
//   FOREIGN KEY clientes_lead_id_fkey: FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
//   PRIMARY KEY clientes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY clientes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
// Table: documentos_cliente
//   FOREIGN KEY documentos_cliente_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY documentos_cliente_pkey: PRIMARY KEY (id)
//   FOREIGN KEY documentos_cliente_template_id_fkey: FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
// Table: documentos_obrigatorios
//   PRIMARY KEY documentos_obrigatorios_pkey: PRIMARY KEY (id)
//   FOREIGN KEY documentos_obrigatorios_template_id_fkey: FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
//   UNIQUE documentos_obrigatorios_tipo_key: UNIQUE (tipo)
// Table: empresa
//   PRIMARY KEY empresa_pkey: PRIMARY KEY (id)
// Table: leads
//   FOREIGN KEY leads_consultor_id_fkey: FOREIGN KEY (consultor_id) REFERENCES users(id) ON DELETE SET NULL
//   PRIMARY KEY leads_pkey: PRIMARY KEY (id)
// Table: matriz_permissoes
//   PRIMARY KEY matriz_permissoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY matriz_permissoes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
// Table: pagamentos
//   FOREIGN KEY pagamentos_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY pagamentos_pkey: PRIMARY KEY (id)
// Table: parcelas
//   FOREIGN KEY parcelas_pagamento_id_fkey: FOREIGN KEY (pagamento_id) REFERENCES pagamentos(id) ON DELETE CASCADE
//   PRIMARY KEY parcelas_pkey: PRIMARY KEY (id)
// Table: produtos_servicos
//   FOREIGN KEY produtos_servicos_ambiente_id_fkey: FOREIGN KEY (ambiente_id) REFERENCES ambientes(id) ON DELETE CASCADE
//   FOREIGN KEY produtos_servicos_cliente_id_fkey: FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
//   PRIMARY KEY produtos_servicos_pkey: PRIMARY KEY (id)
// Table: templates
//   PRIMARY KEY templates_pkey: PRIMARY KEY (id)
// Table: users
//   UNIQUE users_email_key: UNIQUE (email)
//   FOREIGN KEY users_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY users_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: ambientes
//   Policy "ambientes_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "ambientes_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "ambientes_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "ambientes_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: clientes
//   Policy "clientes_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "clientes_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "clientes_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "clientes_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: documentos_cliente
//   Policy "doc_cli_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "doc_cli_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "doc_cli_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "doc_cli_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: documentos_obrigatorios
//   Policy "Admin Editor Docs" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: empresa
//   Policy "Leitura autenticada empresa" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Leitura pública dados empresa" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: leads
//   Policy "Leads all access" (ALL, PERMISSIVE) roles={authenticated}
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
// Table: pagamentos
//   Policy "pagamentos_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "pagamentos_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "pagamentos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "pagamentos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: parcelas
//   Policy "parcelas_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "parcelas_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "parcelas_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "parcelas_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: produtos_servicos
//   Policy "produtos_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "produtos_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: true
//   Policy "produtos_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "produtos_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: true
// Table: templates
//   Policy "Admin Editor Templates" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: users
//   Policy "Admin deleta" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Usuário edita seus dados" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = id) OR is_admin(auth.uid()))
//   Policy "Usuário insere sua conta" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: (auth.uid() = id)
//   Policy "Usuário vê apenas seus dados ou admin" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((auth.uid() = id) OR is_admin(auth.uid()))

// --- DATABASE FUNCTIONS ---
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

// --- INDEXES ---
// Table: clientes
//   CREATE UNIQUE INDEX clientes_cpf_key ON public.clientes USING btree (cpf)
// Table: documentos_obrigatorios
//   CREATE UNIQUE INDEX documentos_obrigatorios_tipo_key ON public.documentos_obrigatorios USING btree (tipo)
// Table: users
//   CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
