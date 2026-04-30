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
      users: {
        Row: {
          atualizado_em: string
          criado_em: string
          email: string
          foto_perfil: string | null
          funcao: string | null
          id: string
          nome: string
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
// Table: empresa
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   logo_url: text (nullable)
//   criado_em: timestamp with time zone (not null, default: now())
//   atualizado_em: timestamp with time zone (not null, default: now())
// Table: matriz_permissoes
//   id: uuid (not null, default: gen_random_uuid())
//   usuario_id: uuid (not null)
//   modulo: text (not null)
//   nivel_acesso: text (not null)
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

// --- CONSTRAINTS ---
// Table: empresa
//   PRIMARY KEY empresa_pkey: PRIMARY KEY (id)
// Table: matriz_permissoes
//   PRIMARY KEY matriz_permissoes_pkey: PRIMARY KEY (id)
//   FOREIGN KEY matriz_permissoes_usuario_id_fkey: FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE
// Table: users
//   UNIQUE users_email_key: UNIQUE (email)
//   FOREIGN KEY users_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY users_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: empresa
//   Policy "Leitura autenticada empresa" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "Leitura pública dados empresa" (SELECT, PERMISSIVE) roles={public}
//     USING: true
// Table: matriz_permissoes
//   Policy "Admin gerencia permissões (Delete)" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Admin gerencia permissões (Insert)" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin(auth.uid())
//   Policy "Admin gerencia permissões (Update)" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_admin(auth.uid())
//   Policy "Ver próprias permissões ou admin" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((usuario_id = auth.uid()) OR is_admin(auth.uid()))
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
// Table: users
//   CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
