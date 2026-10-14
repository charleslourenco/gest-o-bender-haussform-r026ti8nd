// O Supabase devolve no máximo 1000 linhas por consulta. Esta função busca de 1000 em 1000 até acabar (erro 1.10).
// montarConsulta precisa devolver uma consulta NOVA a cada chamada, já com filtros e ordenação (sem .range nem .limit).
export async function buscarTodasPaginas<T = any>(
  montarConsulta: () => any,
  tamanhoPagina = 1000,
): Promise<{ data: T[]; error: any }> {
  const todas: T[] = []
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await montarConsulta().range(inicio, inicio + tamanhoPagina - 1)
    if (error) return { data: todas, error }
    const pagina = Array.isArray(data) ? data : []
    todas.push(...pagina)
    if (pagina.length < tamanhoPagina) break
  }
  return { data: todas, error: null }
}
