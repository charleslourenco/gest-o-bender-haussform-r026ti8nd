import { supabase } from '@/lib/supabase/client'

export function normalizePhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

export function phoneSearchVariants(phone: string): string[] {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return []
  const variants = new Set<string>([digits])
  if (digits.startsWith('55') && digits.length > 11) {
    variants.add(digits.slice(2))
  } else if (digits.length === 10 || digits.length === 11) {
    variants.add('55' + digits)
    if (digits.length === 10) {
      variants.add('55' + digits.slice(0, 2) + '9' + digits.slice(2))
    }
  }
  return Array.from(variants)
}

export async function findExistingClient(opts: {
  email?: string | null
  phone?: string | null
  cpf?: string | null
}): Promise<{ id: string; nome: string } | null> {
  const emailClean = (opts.email || '').trim().toLowerCase()
  const cpfClean = (opts.cpf || '').replace(/\D/g, '')
  const phoneVariants = phoneSearchVariants(opts.phone || '')

  const orFilters: string[] = []
  if (emailClean) orFilters.push(`email.ilike.${emailClean}`)
  if (cpfClean) orFilters.push(`cpf.eq.${cpfClean}`)
  phoneVariants.forEach((p) => orFilters.push(`telefone.eq.${p}`))

  if (orFilters.length === 0) return null

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .eq('excluido', false)
    .or(orFilters.join(','))
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('findExistingClient error:', error)
    return null
  }
  return data ? { id: data.id, nome: data.nome } : null
}

async function ensureStorageFolder(clienteId: string): Promise<void> {
  try {
    const emptyFile = new Blob([''], { type: 'text/plain' })
    await supabase.storage
      .from('dossiers')
      .upload(`${clienteId}/.emptyFolderPlaceholder`, emptyFile, { upsert: true })
  } catch (e) {
    // ignore storage errors (folder may already exist)
  }
}

export async function ensureSaleForLead(params: {
  leadId: string
  clienteId: string
  userId: string
}): Promise<{ dossieId: string; formularioId: string }> {
  const { leadId, clienteId, userId } = params

  // formulario_comercial.lead_id is UNIQUE — reuse if a form already exists for this lead
  const { data: existingForms } = await supabase
    .from('formulario_comercial')
    .select('id')
    .eq('lead_id', leadId)
    .order('criado_em', { ascending: false })
    .limit(1)

  let formularioId: string
  if (existingForms && existingForms.length > 0) {
    formularioId = existingForms[0].id
  } else {
    const { data: newForm, error } = await supabase
      .from('formulario_comercial')
      .insert({
        cliente_id: clienteId,
        lead_id: leadId,
        user_id: userId,
        etapa_atual: 1,
        produtos_servicos: [],
        pagamentos: [],
        datas: {},
      })
      .select('id')
      .single()
    if (error) throw new Error('Falha ao criar formulário comercial: ' + error.message)
    formularioId = newForm.id
  }

  // Reuse dossiê for this form, or adopt an orphan dossiê, or create a new one
  const { data: existingDossies } = await supabase
    .from('dossies')
    .select('id')
    .eq('formulario_comercial_id', formularioId)
    .order('criado_em', { ascending: false })
    .limit(1)

  let dossieId: string
  if (existingDossies && existingDossies.length > 0) {
    dossieId = existingDossies[0].id
  } else {
    // Always create a brand-new dossier for this sale. NEVER adopt or re-point
    // an existing orphan dossier — doing so would hijack another sale's dossier
    // and corrupt the client's sale history.
    const { data: novoDossie, error } = await supabase
      .from('dossies')
      .insert({
        cliente_id: clienteId,
        user_id: userId,
        status: 'em_documentacao',
        formulario_comercial_id: formularioId,
      })
      .select('id')
      .single()
    if (error) throw new Error('Falha ao criar dossiê: ' + error.message)
    dossieId = novoDossie.id
  }

  await ensureStorageFolder(clienteId)
  return { dossieId, formularioId }
}

export async function createNewSaleForClient(params: {
  clienteId: string
  userId: string
  leadData?: {
    nome?: string
    email?: string | null
    telefone?: string | null
    origem?: string
    consultor_id?: string | null
  }
}): Promise<{ dossieId: string; leadId: string; formularioId: string }> {
  const { clienteId, userId, leadData } = params

  const { data: cli } = await supabase
    .from('clientes')
    .select('nome, email, telefone')
    .eq('id', clienteId)
    .maybeSingle()

  const nome = leadData?.nome || cli?.nome || 'Nova Venda'
  const email = leadData?.email !== undefined ? leadData.email : cli?.email || null
  const telefone = leadData?.telefone !== undefined ? leadData.telefone : cli?.telefone || null

  const timestamp = Date.now()
  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      nome,
      email: email && email.trim() !== '' ? email : `nova.venda.${timestamp}@placeholder.com`,
      telefone: telefone || '',
      origem: leadData?.origem || 'Recompra',
      status: 'Vendido',
      data_venda: new Date().toISOString(),
      criado_por_nome: 'Sistema',
      kanban_ativo: false,
      consultor_id: leadData?.consultor_id ?? null,
    })
    .select('id')
    .single()
  if (leadError) throw new Error('Falha ao criar lead: ' + leadError.message)

  // Do NOT overwrite the client's lead_id. Each new sale gets its own independent
  // lead/form/dossier, and the client retains its original sale reference.
  const { dossieId, formularioId } = await ensureSaleForLead({
    leadId: newLead.id,
    clienteId,
    userId,
  })

  return { dossieId, leadId: newLead.id, formularioId }
}

export async function createClientWithSale(params: {
  userId: string
  clientData: {
    nome: string
    email?: string
    telefone?: string
    cpf?: string
    tipo_pessoa?: string
  }
}): Promise<{ dossieId: string; clienteId: string; leadId: string }> {
  const { userId, clientData } = params

  const existing = await findExistingClient({
    email: clientData.email,
    phone: clientData.telefone,
    cpf: clientData.cpf,
  })

  let clienteId: string
  if (existing) {
    clienteId = existing.id
  } else {
    const { data: newClient, error } = await supabase
      .from('clientes')
      .insert({
        nome: (clientData.nome ?? '').trim() || 'Cliente sem nome',
        email: (clientData.email ?? '').trim(),
        telefone: (clientData.telefone ?? '').trim(),
        cpf: clientData.cpf || null,
        tipo_pessoa: clientData.tipo_pessoa || null,
        usuario_id: userId,
        status: 'Ativo',
      })
      .select('id')
      .single()
    if (error) throw new Error('Falha ao criar cliente: ' + error.message)
    clienteId = newClient.id
  }

  const { dossieId, leadId } = await createNewSaleForClient({
    clienteId,
    userId,
    leadData: {
      nome: clientData.nome,
      email: clientData.email || null,
      telefone: clientData.telefone || null,
      origem: 'Cadastro Direto',
    },
  })

  return { dossieId, clienteId, leadId }
}
