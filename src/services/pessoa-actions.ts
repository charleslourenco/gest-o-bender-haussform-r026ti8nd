import { supabase } from '@/lib/supabase/client'

export interface PessoaResumoExclusao {
  alocacoesCount: number
  documentosCount: number
  documentosPaths: string[]
  nome: string
}

/**
 * Obtém contagem e detalhes do que será removido junto com a pessoa:
 * - alocações ativas em alocacao_montagem
 * - documentos em documentos_equipe (e caminhos de arquivo no storage)
 */
export async function getPessoaResumoExclusao(
  tipo: 'clt' | 'pj',
  id: string,
  nomePadrao: string = '',
): Promise<PessoaResumoExclusao> {
  const field = tipo === 'clt' ? 'clt_id' : 'pj_id'

  // Buscar alocações ativas
  const { data: alocs, error: alocErr } = await supabase
    .from('alocacao_montagem')
    .select('id')
    .eq('pessoa_id', id)

  if (alocErr) {
    console.error('Erro ao consultar alocações da pessoa:', alocErr)
  }

  // Buscar documentos vinculados
  const { data: docs, error: docErr } = await supabase
    .from('documentos_equipe')
    .select('id, arquivo_url, arquivo_assinado_url')
    .eq(field, id)

  if (docErr) {
    console.error('Erro ao consultar documentos da pessoa:', docErr)
  }

  const paths: string[] = []
  if (Array.isArray(docs)) {
    docs.forEach((d) => {
      if (d.arquivo_url) paths.push(d.arquivo_url)
      if (d.arquivo_assinado_url) paths.push(d.arquivo_assinado_url)
    })
  }

  return {
    alocacoesCount: Array.isArray(alocs) ? alocs.length : 0,
    documentosCount: Array.isArray(docs) ? docs.length : 0,
    documentosPaths: paths,
    nome: nomePadrao,
  }
}

/**
 * Executa a exclusão completa e ordenada de uma pessoa da Gestão de Pessoas:
 * 1. Remove alocações em alocacao_montagem (onde pessoa_id = id da pessoa)
 * 2. Remove arquivos físicos no bucket 'documentos_equipe' do Storage
 * 3. Remove registros em documentos_equipe (caso não cascateie automaticamente)
 * 4. Remove o cadastro principal na tabela (equipe_clt ou parceiros_pj)
 * 5. Dispara evento kanban_updated no window para atualizar kanbans imediatamente
 */
export async function deletePessoa(
  tipo: 'clt' | 'pj',
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const field = tipo === 'clt' ? 'clt_id' : 'pj_id'
    const tableName = tipo === 'clt' ? 'equipe_clt' : 'parceiros_pj'

    // 1. Coletar documentos para remover do Storage
    const { data: docs } = await supabase
      .from('documentos_equipe')
      .select('id, arquivo_url, arquivo_assinado_url')
      .eq(field, id)

    const storagePaths: string[] = []
    if (Array.isArray(docs)) {
      docs.forEach((d) => {
        if (d.arquivo_url) storagePaths.push(d.arquivo_url)
        if (d.arquivo_assinado_url) storagePaths.push(d.arquivo_assinado_url)
      })
    }

    // 2. Remover alocações ativas em cards/subcards (alocacao_montagem)
    // O trigger log_alocacao_montagem_delete() é acionado e registra histórico de desalocação
    const { error: alocError } = await supabase
      .from('alocacao_montagem')
      .delete()
      .eq('pessoa_id', id)

    if (alocError) {
      console.error('Erro ao remover alocações:', alocError)
      return { success: false, error: 'Erro ao remover alocações: ' + alocError.message }
    }

    // 3. Remover arquivos do Storage (bucket documentos_equipe)
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('documentos_equipe')
        .remove(storagePaths)

      if (storageError) {
        console.warn('Aviso: falha ao remover alguns arquivos do Storage:', storageError)
        // Não interrompe o fluxo principal se o storage falhar
      }
    }

    // 4. Remover linhas da tabela documentos_equipe explicitamente
    const { error: docTableError } = await supabase.from('documentos_equipe').delete().eq(field, id)

    if (docTableError) {
      console.error('Erro ao remover documentos da equipe:', docTableError)
      return { success: false, error: 'Erro ao remover documentos: ' + docTableError.message }
    }

    // 5. Remover cadastro principal (equipe_clt ou parceiros_pj)
    const { error: deleteError } = await supabase.from(tableName).delete().eq('id', id)

    if (deleteError) {
      console.error('Erro ao remover cadastro da pessoa:', deleteError)
      return { success: false, error: 'Erro ao excluir cadastro: ' + deleteError.message }
    }

    // Disparar sincronização local do Kanban
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kanban_updated'))
    }

    return { success: true }
  } catch (err: any) {
    console.error('Erro inesperado na exclusão da pessoa:', err)
    return { success: false, error: err?.message || 'Erro inesperado ao excluir pessoa' }
  }
}

/**
 * Inativa a pessoa desmarcando todas as suas áreas de atuação (areas_atuacao = []).
 * Dessa forma ela some imediatamente dos selects de alocação dos kanbans
 * (Produção, Montagem, Análise Técnica), mas todo o cadastro, documentos e histórico
 * são preservados.
 */
export async function inativarPessoa(
  tipo: 'clt' | 'pj',
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tableName = tipo === 'clt' ? 'equipe_clt' : 'parceiros_pj'

    const { error } = await supabase.from(tableName).update({ areas_atuacao: [] }).eq('id', id)

    if (error) {
      console.error('Erro ao inativar pessoa:', error)
      return { success: false, error: 'Erro ao inativar: ' + error.message }
    }

    // Disparar sincronização local do Kanban
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kanban_updated'))
    }

    return { success: true }
  } catch (err: any) {
    console.error('Erro inesperado ao inativar pessoa:', err)
    return { success: false, error: err?.message || 'Erro inesperado ao inativar' }
  }
}
