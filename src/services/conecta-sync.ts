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

  // Elegibilidade: 'Bender Conecta' OU 'Corretor'
  // Se a origem foi fornecida e comprovadamente não é nenhuma das duas, não dispara (a edge function ainda valida retroativamente por metadados)
  if (origem) {
    const o = origem.trim().toLowerCase()
    if (o !== 'corretor' && o !== 'bender conecta') {
      return
    }
  }

  // Executa em segundo plano desacoplado (fire-and-forget seguro)
  setTimeout(async () => {
    try {
      const { error } = await supabase.functions.invoke('conecta-sync-event', {
        body: {
          lead_id: leadId,
          status_gestor: newStatus,
          previous_status: previousStatus,
          origem: origem,
        },
      })
      if (error) {
        console.warn('[conecta-sync] conecta-sync-event respondeu com erro:', error, {
          leadId,
          newStatus,
        })
      }
    } catch (err) {
      // Falha graciosa e silenciosa
      console.warn('[conecta-sync] Falha silenciosa no envio do evento pós-processamento:', err)
    }
  }, 10)
}
