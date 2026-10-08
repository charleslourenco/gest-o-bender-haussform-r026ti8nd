/**
 * Utilitário para conversão de documentos PDF em imagens JPEG (Data URLs) no browser
 * utilizando PDF.js carregado dinamicamente via CDN estável (cdnjs / unpkg) com fallback.
 *
 * Utilizado pelo leitor de notas fiscais para enviar o layout DANFE/visual à visão
 * do GPT-4o (resolvendo PDFs escaneados e mantendo referência visual do layout).
 */

const PDFJS_SCRIPT_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
]

const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

let pdfjsLoadingPromise: Promise<any> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Se já estiver no DOM
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Falha ao carregar script ${src}`))
    document.head.appendChild(script)
  })
}

async function getPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Conversão de PDF para imagem só é suportada no navegador.')
  }

  const win = window as any
  if (win.pdfjsLib) {
    if (!win.pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
    }
    return win.pdfjsLib
  }

  if (pdfjsLoadingPromise) {
    return pdfjsLoadingPromise
  }

  pdfjsLoadingPromise = (async () => {
    let lastError: any = null
    for (const url of PDFJS_SCRIPT_URLS) {
      try {
        await loadScript(url)
        if (win.pdfjsLib) {
          win.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
          return win.pdfjsLib
        }
      } catch (err) {
        lastError = err
      }
    }
    throw lastError || new Error('Não foi possível carregar a biblioteca PDF.js.')
  })()

  return pdfjsLoadingPromise
}

export interface ConvertPdfOptions {
  /** Número máximo de páginas a converter (DANFEs e romaneios com tabela longa). Padrão: 6 */
  maxPages?: number
  /** Largura alvo máxima em pixels (ideal para GPT-4o Vision com alta legibilidade). Padrão: 2200 */
  maxDimension?: number
  /** Qualidade JPEG (0.1 a 1.0). Padrão: 0.85 */
  quality?: number
}

/**
 * Converte as páginas de um arquivo PDF em um array de imagens JPEG em base64 (Data URLs).
 * Se falhar (ex: bloqueio de CDN, PDF corrompido), lança erro para permitir acionamento do fallback.
 */
export async function convertPdfToImages(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  options: ConvertPdfOptions = {},
): Promise<string[]> {
  const { maxPages = 6, maxDimension = 2200, quality = 0.85 } = options

  let arrayBuffer: ArrayBuffer
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer
  } else if (ArrayBuffer.isView(fileOrBuffer)) {
    const view = fileOrBuffer as ArrayBufferView
    const copy = new Uint8Array(view.byteLength)
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
    arrayBuffer = copy.buffer as ArrayBuffer
  } else {
    arrayBuffer = await (fileOrBuffer as Blob).arrayBuffer()
  }

  const pdfjs = await getPdfJs()
  // Usar cópia do ArrayBuffer para evitar "ArrayBuffer detached" caso o PDF.js transfira
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer.slice(0),
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true,
  })

  const pdfDoc = await loadingTask.promise
  const numPages = Math.min(pdfDoc.numPages, maxPages)
  const images: string[] = []

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const baseViewport = page.getViewport({ scale: 1.0 })

    // Calcula a escala ideal para não exceder maxDimension (evita peso desnecessário para o GPT-4o)
    const currentMax = Math.max(baseViewport.width, baseViewport.height)
    let scale = 1.5
    if (currentMax > 0) {
      scale = Math.min(2.0, maxDimension / currentMax)
      if (scale < 1.0) scale = 1.0
    }

    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) {
      throw new Error('Falha ao obter contexto 2D do canvas.')
    }

    // Fundo branco limpo para documentos escaneados/transparentes
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: context,
      viewport,
    }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    images.push(dataUrl)

    // Libera recursos
    canvas.width = 0
    canvas.height = 0
    if (typeof page.cleanup === 'function') {
      page.cleanup()
    }
  }

  if (images.length === 0) {
    throw new Error('Nenhuma página pôde ser convertida do PDF.')
  }

  return images
}
