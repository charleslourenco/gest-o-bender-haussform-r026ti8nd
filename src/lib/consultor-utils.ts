/**
 * Helper para formatação de exibição do nome do Consultor nos dropdowns e seletores do CRM.
 * Regra: se o usuário for ex-colaborador (ex_colaborador=true), exibe como:
 *   "Nome do Consultor (Ex Colaborador)"
 * Caso contrário, exibe o nome original intacto.
 */
export function formatConsultorOptionLabel(user: {
  nome?: string | null
  id?: string
  ex_colaborador?: boolean | null
}): string {
  const baseName = (user?.nome || user?.id || '').trim()
  if (!baseName) return ''
  if (user?.ex_colaborador) {
    // Evita duplicar se por ventura já vier com o sufixo
    if (baseName.toLowerCase().includes('(ex colaborador)')) {
      return baseName
    }
    return `${baseName} (Ex Colaborador)`
  }
  return baseName
}
