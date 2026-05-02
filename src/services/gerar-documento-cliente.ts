export interface GerarDocumentoParams {
  cliente_id: string
  projeto_id?: string
  dados_formulario?: Record<string, any>
  template_nome?: string
}

export const gerarDocumentoCliente = async (params: GerarDocumentoParams) => {
  const url = 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/gerar_documento_cliente'
  const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc2R0eHlvcGVpZWNweHdvdmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUwOTY5MywiZXhwIjoyMDkzMDg1NjkzfQ.Y0P4NxXog1gcFW91maVshuG2pQSArLh4qKq1m9zOT-8'

  const clienteNome = params.dados_formulario?.['Cliente'] || params.cliente_id

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        dossierId: clienteNome,
        templateData: {
          Cliente: clienteNome,
          'Valor total': params.dados_formulario?.['Valor total'] || 'A Definir',
          'Nome de quem vendeu':
            params.dados_formulario?.['Nome de quem vendeu'] || 'Não informado',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Erro ${response.status}`)
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}
