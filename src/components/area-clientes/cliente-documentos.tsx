import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Upload, Plus, Eye, PenTool, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { numeroPorExtenso } from '@/lib/extenso'
import { SignatureModal } from './signature-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

declare global {
  interface Window {
    PizZip: any
    docxtemplater: any
  }
}

async function carregarBibliotecas() {
  if (typeof window.PizZip !== 'undefined' && typeof window.docxtemplater !== 'undefined') return

  function carregarScript(src: string) {
    return new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`)
      if (existing) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = src
      script.async = false
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Falha ao carregar: ' + src))
      document.head.appendChild(script)
    })
  }

  await carregarScript('https://cdn.jsdelivr.net/npm/pizzip@3.1.4/dist/pizzip.js')
  await carregarScript('https://cdn.jsdelivr.net/npm/docxtemplater@3.47.4/build/docxtemplater.js')
}

export function ClienteDocumentos({ dossie, onReload }: { dossie: any; onReload: () => void }) {
  const [docs, setDocs] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [signatureDoc, setSignatureDoc] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = async () => {
    const { data } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('cliente_id', dossie.cliente_id)
    if (data) setDocs(data)
  }

  const loadTemplates = async () => {
    try {
      const { data: arquivos, error } = await supabase.storage
        .from('bender_templates')
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } })

      if (error) throw new Error('Erro ao listar templates: ' + error.message)

      if (arquivos) {
        const templatesData = arquivos
          .filter((f) => f.name.endsWith('.docx'))
          .map((f) => ({
            id: f.name,
            nome: f.name.replace('.docx', '').replace(/_/g, ' '),
            arquivo: f.name,
            arquivo_url: `https://igsdtxyopeiecpxwovgh.supabase.co/storage/v1/object/public/bender_templates/${f.name}`,
          }))
        setTemplates(templatesData)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    }
  }

  useEffect(() => {
    loadDocs()
    loadTemplates()
  }, [dossie.cliente_id])

  const form = dossie.formulario || {}
  const hasData = !!form.cpf && !!form.rua

  const hasContratoGerado = docs.some(
    (d) => d.tipo === 'Contrato' || d.template_nome?.toLowerCase().includes('contrato.docx'),
  )

  const handleDeleteDoc = async (docId: string, nome: string) => {
    if (!confirm('Deseja realmente remover este documento?')) return
    try {
      const { error } = await supabase.from('documentos_cliente').delete().eq('id', docId)
      if (error) throw error

      const { data: authData } = await supabase.auth.getUser()
      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: `Documento ${nome} removido`,
      })

      toast.success('Documento removido com sucesso!')
      loadDocs()
      onReload()
    } catch (e: any) {
      toast.error('Erro ao remover documento: ' + e.message)
    }
  }

  const processDocx = async (templateUrl: string, templateNome: string, isContrato: boolean) => {
    setGenerating(true)
    toast.info(`Gerando ${templateNome}...`, { id: 'gerar-doc' })
    try {
      if (typeof window.PizZip === 'undefined' || typeof window.docxtemplater === 'undefined') {
        await carregarBibliotecas()
      }

      if (!window.PizZip || !window.docxtemplater) {
        throw new Error('As bibliotecas PizZip e Docxtemplater não foram carregadas no navegador.')
      }

      console.log('1. Buscando dados do formulário...')
      const { data: authData } = await supabase.auth.getUser()

      const { data: formInfo } = await supabase
        .from('formulario_comercial')
        .select('*, cliente:clientes(nome, email, telefone)')
        .eq('cliente_id', dossie.cliente_id)
        .eq('user_id', authData.user?.id)
        .single()

      if (!formInfo) throw new Error('Dados do formulário não encontrados.')
      console.log('2. Dados encontrados:', formInfo)

      console.log('3. Baixando arquivo do bucket...')
      const res = await fetch(templateUrl, { method: 'GET', cache: 'no-cache' })
      if (!res.ok) {
        throw new Error(`Erro ${res.status} ao baixar template: ${res.statusText}`)
      }
      const arrayBuffer = await res.arrayBuffer()
      console.log('4. Arquivo baixado, iniciando Docxtemplater...')

      const cli = Array.isArray(formInfo.cliente) ? formInfo.cliente[0] : formInfo.cliente || {}

      const formatDateStr = (dateStr: string) => {
        if (!dateStr) return ''
        const [y, m, d] = dateStr.split('-')
        return `${d}/${m}/${y}`
      }

      const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

      const datas = (formInfo.datas as any) || {}

      const pagamentosArr = Array.isArray(formInfo.pagamentos)
        ? formInfo.pagamentos
        : [formInfo.pagamentos || {}]
      const pagData = pagamentosArr[0] || {}
      const formaPagamento = pagData.forma || 'À vista'
      const metodoPagamento = pagData.meio || ''

      const hoje = new Date()
      const dataContratoExtenso = format(hoje, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

      const produtos = (formInfo.produtos_servicos as any[]) || []
      const subtotal = produtos.reduce(
        (acc: number, p: any) =>
          acc + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
        0,
      )
      const desconto = Number(formInfo.desconto || 0)
      const total = Math.max(0, subtotal - desconto)

      let blocoProdutosServicos = ''
      if (produtos.length === 0) {
        blocoProdutosServicos = '(Nenhum produto cadastrado)'
      } else {
        const linhasProdutos = produtos
          .map((p: any, i: number) => {
            const nome = p.nome || p.descricao || p.name || `Item ${i + 1}`
            const qtd = Number(p.qtd || p.quantidade || 1)
            const valorUnit = Number(p.valor_unitario || p.valor || 0)
            const valorTotal = qtd * valorUnit
            return `${i + 1}. ${nome} — Qtd: ${qtd} × ${formatCurrency(valorUnit)} = ${formatCurrency(valorTotal)}`
          })
          .join('\n')
        blocoProdutosServicos = `${linhasProdutos}\n\nSubtotal: ${formatCurrency(subtotal)}\nDesconto: ${formatCurrency(desconto)}\nTotal: ${formatCurrency(total)}`
      }

      let blocoParcelasText = ''
      const dataVenda = datas.data_venda || ''

      if (formaPagamento === 'À vista') {
        blocoParcelasText = `O pagamento será realizado à vista no valor de ${formatCurrency(total)} (${numeroPorExtenso(total, true)}) a ser pago no dia ${formatDateStr(dataVenda)} por meio de ${metodoPagamento}.`
      } else {
        const parcelas = pagData.parcelas || []
        const numParcelas = parcelas.length

        // Calcular datas com intervalo de 30 dias a partir da data da venda
        const dataBase = dataVenda ? new Date(dataVenda + 'T12:00:00') : new Date()

        const descricoesParcelas = parcelas
          .map((p: any, index: number) => {
            const numOrdem = index + 1
            const dataVenc = new Date(dataBase)
            dataVenc.setDate(dataVenc.getDate() + 30 * numOrdem)
            const dataFormatada = `${String(dataVenc.getDate()).padStart(2, '0')}/${String(dataVenc.getMonth() + 1).padStart(2, '0')}/${dataVenc.getFullYear()}`
            const valParcela = Number(p.valor || total / numParcelas || 0)
            return `a ${numOrdem}ª parcela no valor de ${formatCurrency(valParcela)} (${numeroPorExtenso(valParcela, true)}) com vencimento em ${dataFormatada}`
          })
          .join('; ')

        blocoParcelasText = `O pagamento será realizado em ${numParcelas} (${numeroPorExtenso(numParcelas, false)}) parcelas por meio de ${metodoPagamento}, sendo: ${descricoesParcelas}.`
      }

      const placeholders = {
        CLIENTE_NOME: cli.nome || '',
        CLIENTE_CPF_CNPJ: formInfo.cpf || '',
        CLIENTE_PROFISSAO: formInfo.profissao || '',
        CLIENTE_ESTADO_CIVIL: formInfo.estado_civil || '',
        CLI_EMAIL: cli.email || '',
        CLIENTE_TELEFONE: cli.telefone || '',
        CLIENTE_CEP: formInfo.cep || '',
        CLIENTE_RUA: formInfo.rua || '',
        CLIENTE_NUMERO: formInfo.numero || '',
        CLIENTE_COMPLEMENTO: formInfo.complemento || '',
        CLIENTE_BAIRRO: formInfo.bairro || '',
        CLIENTE_CIDADE: formInfo.municipio || '',
        CLIENTE_ESTADO: formInfo.estado || '',
        OBRA_CEP: formInfo.obra_cep || '',
        OBRA_RUA: formInfo.obra_rua || '',
        OBRA_NUMERO: formInfo.obra_numero || '',
        OBRA_COMPLEMENTO: formInfo.obra_complemento || '',
        OBRA_BAIRRO: formInfo.obra_bairro || '',
        OBRA_CIDADE: formInfo.obra_municipio || '',
        OBRA_ESTADO: formInfo.obra_estado || '',
        METODO_PAGAMENTO: metodoPagamento || '',
        DATA_PAGAMENTO: formatDateStr(dataVenda) || '',
        DATA_PREVISTA_ENTREGA_IMOVEL: formatDateStr(datas.data_acesso_imovel || '') || '',
        DATA_CONTRATO_EXTENSO: dataContratoExtenso || '',
        CLI_NOME: cli.nome || '',
        CLI_CPF: formInfo.cpf || '',
        REPRESENTANTE_BENDER_NOME: 'Daiana Gabriela Bender',
        REPRESENTANTE_BENDER_CPF: '011.494.920-40',
        TESTEMUNHA_01_NOME: '',
        TESTEMUNHA_01_CPF: '',
        TESTEMUNHA_02_NOME: '',
        TESTEMUNHA_02_CPF: '',
        BLOCO_PRODUTOS_SERVICOS: blocoProdutosServicos || '',
        BLOCO_PARCELAS: blocoParcelasText || '',
        BLOCO_PARCELAS_TEXTO: blocoParcelasText || '',
      }

      console.log('5. Placeholders mapeados:', placeholders)

      const zip = new window.PizZip(arrayBuffer)

      // Inspecionar o XML real do documento
      try {
        if (zip.files['word/document.xml']) {
          const xmlContent = zip.files['word/document.xml'].asText()
          const matches = xmlContent.match(/\[([A-Z_]+)\]/g)
          console.log('PLACEHOLDERS ENCONTRADOS NO XML:', matches)

          const matchesDuplos = xmlContent.match(/\{\{([A-Z_]+)\}\}/g)
          console.log('PLACEHOLDERS ANTIGOS {{}} NO XML:', matchesDuplos)
        }
      } catch (xmlError) {
        console.error('Erro ao inspecionar o XML:', xmlError)
      }

      const doc = new window.docxtemplater(zip, {
        delimiters: { start: '[', end: ']' },
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true,
        nullGetter: (part: any) => {
          console.warn('Placeholder sem valor:', part.value)
          return ''
        },
      })

      doc.render(placeholders)

      console.log('6. Documento gerado, iniciando upload...')
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Usuário não autenticado. Faça login novamente.')
      }
      console.log('Sessão ativa:', session.user.id)

      const safeName = isContrato
        ? `Contrato_${Date.now()}.docx`
        : `${templateNome}_${Date.now()}`.replace(/\s+/g, '_') + '.docx'
      const filePath = `${session.user.id}/${dossie.cliente_id}/${safeName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dossiers')
        .upload(filePath, out, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        throw new Error('Erro no upload: ' + uploadError.message)
      }

      console.log('Upload realizado:', uploadData)

      const { data: publicUrlData } = supabase.storage.from('dossiers').getPublicUrl(filePath)
      const publicUrl = publicUrlData.publicUrl

      await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        tipo: isContrato ? 'Contrato' : 'template',
        template_nome: isContrato ? 'Contrato.docx' : templateNome,
        status: 'gerado',
        arquivo_url: publicUrl,
      })

      const { data: docData, error: docError } = await supabase.from('documentos_gerados').insert({
        cliente_id: dossie.cliente_id,
        user_id: session.user.id,
        nome: isContrato ? 'Contrato.docx' : templateNome,
        path: filePath,
        tipo: isContrato ? 'contrato' : 'template',
        criado_em: new Date().toISOString(),
      })

      if (docError) {
        console.error('Erro ao registrar documento:', docError)
        throw new Error('Erro ao registrar documento: ' + docError.message)
      }

      console.log('Documento registrado com sucesso:', docData)

      if (isContrato) {
        await supabase.from('dossies').update({ contrato_url: publicUrl }).eq('id', dossie.id)
      }

      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: isContrato ? 'Contrato gerado' : `Documento ${templateNome} adicionado`,
      })

      toast.dismiss('gerar-doc')
      toast.success(`${templateNome} gerado com sucesso!`)
      loadDocs()
      onReload()
    } catch (e: any) {
      toast.dismiss('gerar-doc')
      if (e.properties && e.properties.errors) {
        const errosDetalhados = e.properties.errors
          .map(
            (err: any) =>
              `Placeholder: ${err.properties?.id || err.properties?.name || 'desconhecido'} | Erro: ${err.properties?.explanation || err.message}`,
          )
          .join('\n')
        console.error('ERROS DOCXTEMPLATER:\n' + errosDetalhados)
        toast.error(`Falha ao gerar ${templateNome}:\n${errosDetalhados}`)
      } else {
        console.error('ERRO COMPLETO:', e)
        toast.error(
          `Falha ao gerar ${templateNome}: ` +
            (e?.message || e?.toString() || JSON.stringify(e) || 'erro desconhecido'),
        )
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleGerarContrato = () => {
    const url =
      'https://igsdtxyopeiecpxwovgh.supabase.co/storage/v1/object/public/bender_templates/Contrato.docx'
    processDocx(url, 'Contrato', true)
  }

  const handleGerarTemplate = (t: any) => {
    processDocx(t.arquivo_url, t.nome, t.arquivo === 'Contrato.docx')
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast.info('Fazendo upload...', { id: 'upload-doc' })
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Usuário não autenticado.')

      const filePath = `${session.user.id}/${dossie.cliente_id}/${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('dossiers')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('dossiers').getPublicUrl(filePath)

      await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        tipo: 'upload_manual',
        template_nome: file.name,
        status: 'enviado',
        arquivo_url: publicUrlData.publicUrl,
      })

      const { data: authData } = await supabase.auth.getUser()
      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: `Arquivo ${file.name} enviado manualmente`,
      })

      toast.dismiss('upload-doc')
      toast.success('Arquivo enviado com sucesso!')
      loadDocs()
    } catch (err: any) {
      toast.dismiss('upload-doc')
      toast.error('Erro no upload: ' + err.message)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!hasData) {
    return (
      <div className="p-8 text-center bg-off-white border-2 border-steel-blue rounded-lg">
        <p className="text-lg font-semibold text-midnight-navy">
          Preencha os dados do cliente na aba Dados antes de gerar documentos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      <div className="flex flex-wrap gap-4 items-center mb-6">
        {!hasContratoGerado && (
          <Button
            onClick={handleGerarContrato}
            disabled={generating}
            className="bg-dark-denim hover:bg-dark-denim/90 font-bold"
          >
            <FileText className="w-4 h-4 mr-2" /> 📄 Gerar Contrato
          </Button>
        )}
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) loadTemplates()
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-bold border-2 border-steel-blue"
              disabled={generating}
            >
              <Plus className="w-4 h-4 mr-2" /> Acrescentar documento ▼
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {templates.length === 0 ? (
              <DropdownMenuItem disabled>Nenhum template ativo</DropdownMenuItem>
            ) : (
              templates.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => handleGerarTemplate(t)}
                  className="cursor-pointer"
                >
                  {t.nome}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          className="font-bold border-2 border-steel-blue"
          onClick={handleUploadClick}
          disabled={generating}
        >
          <Upload className="w-4 h-4 mr-2" /> Upload de arquivo
        </Button>
      </div>

      <div className="bg-off-white border-2 border-steel-blue rounded-lg p-6">
        <h3 className="font-bold text-lg mb-4 text-midnight-navy">Documentos Gerados</h3>
        {docs.length === 0 ? (
          <p className="text-steel-blue italic">Nenhum documento encontrado para este cliente.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col md:flex-row md:items-center justify-between bg-pale-cornflower p-4 rounded border border-steel-blue gap-4"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-midnight-navy shrink-0" />
                  <div>
                    <p className="font-bold text-midnight-navy break-all">
                      {doc.template_nome || doc.tipo}
                    </p>
                    <p className="text-xs text-steel-blue">
                      Status: {doc.status} | Gerado em:{' '}
                      {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {doc.arquivo_url && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-steel-blue text-midnight-navy font-semibold hover:bg-steel-blue hover:text-white"
                    >
                      <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4 mr-1" /> Visualizar
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = doc.arquivo_url
                        a.download = doc.template_nome || 'documento'
                        a.click()
                      }}
                      className="border-steel-blue text-midnight-navy font-semibold hover:bg-steel-blue hover:text-white"
                    >
                      <Download className="w-4 h-4 mr-1" /> Baixar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        setSignatureDoc({
                          path: doc.arquivo_url,
                          title: doc.template_nome || doc.tipo,
                          ...doc,
                        })
                      }
                      className="bg-dark-denim text-white hover:bg-dark-denim/90 font-semibold"
                    >
                      <PenTool className="w-4 h-4 mr-1" /> Enviar para Assinatura
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDoc(doc.id, doc.template_nome || doc.tipo)}
                      className="font-semibold"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {signatureDoc && (
        <SignatureModal
          doc={signatureDoc}
          clienteId={dossie.cliente_id}
          onClose={() => {
            setSignatureDoc(null)
            loadDocs()
            if (onReload) onReload()
          }}
        />
      )}
    </div>
  )
}
