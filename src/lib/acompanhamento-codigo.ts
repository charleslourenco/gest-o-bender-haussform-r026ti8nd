import { supabase } from '@/lib/supabase/client'

export function extrairIniciais(nome: string): string {
  if (!nome || typeof nome !== 'string') return 'XX'
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return 'XX'
  const iniciais = palavras.map((p) => p[0]?.toUpperCase() || '').join('')
  return iniciais || 'XX'
}

export function gerarCodigoAcompanhamento(nome: string, sequencial: number): string {
  const iniciais = extrairIniciais(nome)
  const seq = String(sequencial).padStart(3, '0')
  return `${iniciais}ACP${seq}`
}

export async function gerarProximoCodigoAcompanhamento(nome: string): Promise<string> {
  let seq = 1
  try {
    const { count, error } = await supabase
      .from('acompanhamentos')
      .select('*', { count: 'exact', head: true })

    if (!error && count !== null) {
      seq = count + 1
    }
  } catch {
    // fallback to seq 1
  }

  return gerarCodigoAcompanhamento(nome, seq)
}
