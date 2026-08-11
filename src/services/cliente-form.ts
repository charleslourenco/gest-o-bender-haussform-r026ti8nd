import { createClientWithSale } from '@/services/vendas'

export async function createNewClientFlow(userId: string): Promise<string> {
  // Follows exactly the commercial "Vendido" flow:
  // - duplicate check (email/phone/cpf) → reuse existing client if found
  // - create new independent sale (lead + formulário comercial + dossiê + storage folder)
  const { dossieId } = await createClientWithSale({
    userId,
    clientData: { nome: 'Novo Cliente' },
  })
  return dossieId
}
