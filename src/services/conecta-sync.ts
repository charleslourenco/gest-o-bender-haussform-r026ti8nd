import { supabase } from '@/lib/supabase/client'

/**
 * PARTE 2 — Sincronização pós-processamento de fase para o Bender Conecta
 *
 * Regras Estritas:
 * 1. Pós-processamento assíncrono: roda SEMPRE após a mudança já ter acontecido no Gestor.
 * 2. NUNCA bloqueia a UI do Gestor nem quebra fluxos em caso de falha de rede/timeout.
 * 3. Somente leads de origem 'Corretor' são elegíveis.
 * 4. Exclusão / Arquivamento NUNCA mexe no Conecta.
 * 5. Se o endpoint ainda não existir (secret vazio) ou estiver fora do ar, falha silenciosamente com log.
 */

interface TriggerOptions {
  leadId: string
  newStatus: string
  previousStatus?: string
  origem?: string
}

export function triggerConectaPhaseSync(options: TriggerOptions) {
  const { leadId, newStatus, previousStatus, origem } = options

  if (!leadId) return

  // Se a origem foi fornecida e comprovadamente NÃO é 'Corretor', não precisa nem disparar a função
  if (origem && origem.trim().toLowerCase() !== 'corretor') {
    return
  }

  // Executa em segundo plano desacoplado (fire-and-forget seguro)
  setTimeout(async () => {
    try {
      await supabase.functions.invoke('conecta-sync-event', {
        body: {
          lead_id: leadId,
          status_gestor: newStatus,
          previous_status: previousStatus,
          origem: origem,
        },
      })
    } catch (err) {
      // Falha graciosa e silenciosa
      console.warn('[conecta-sync] Falha silenciosa no envio do evento pós-processamento:', err)
    }
  }, 10)
}
