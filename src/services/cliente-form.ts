import { createClientWithSale } from '@/services/vendas'

export async function createNewClientFlow(userId: string, nome?: string): Promise<string> {
  // Follows exactly the commercial "Vendido" flow:
  // - duplicate check (email/phone/cpf) → reuse existing client if found
  // - create new independent sale (lead + formulário comercial + dossiê + storage folder)
  const clientName = (nome ?? '').trim()
  if (!clientName) {
    throw new Error('Nome do cliente é obrigatório para iniciar o cadastro.')
  }
  const { dossieId } = await createClientWithSale({
    userId,
    clientData: { nome: clientName },
  })
  return dossieId
}
