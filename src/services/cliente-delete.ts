import { supabase } from '@/lib/supabase/client'

export async function deleteCliente(clienteId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('clientes').delete().eq('id', clienteId)

    if (error) return { error: error.message }
    return { error: null }
  } catch (e: any) {
    return { error: e?.message || 'Erro desconhecido' }
  }
}
