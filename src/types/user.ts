export interface AppUser {
  id: string
  email: string
  nome: string
  telefone: string | null
  funcao: string | null
  foto_perfil: string | null
  eh_consultor?: boolean | null
  status: boolean
  criado_em: string
  atualizado_em: string
}
