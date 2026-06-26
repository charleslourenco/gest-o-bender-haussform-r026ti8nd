export function printAllocationLabels(params: {
  itemName: string
  clienteNome: string
  marca: string | null
  cor: string | null
  espessura: number | null
  largura: number | null
  comprimento: number | null
  quantidade: number
  alocacaoId: string
}) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const dateStr = new Date().toLocaleDateString('pt-BR')

  let labelsHtml = ''
  for (let i = 0; i < params.quantidade; i++) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      `${window.location.origin}/alocacao/${params.alocacaoId}-${i + 1}`,
    )}`

    let dim = []
    if (params.espessura) dim.push(`${params.espessura}mm E`)
    if (params.largura) dim.push(`${params.largura}mm L`)
    if (params.comprimento) dim.push(`${params.comprimento}m C`)
    const dimText = dim.join(' x ') || 'Sem medidas'

    labelsHtml += `
      <div class="page">
        <div class="info">
          <h1>${params.itemName}</h1>
          <p><strong>Cliente:</strong> ${params.clienteNome}</p>
          ${params.marca ? `<p><strong>Marca:</strong> ${params.marca}</p>` : ''}
          ${params.cor ? `<p><strong>Cor:</strong> ${params.cor}</p>` : ''}
          <div class="medidas">
            ${dimText}
          </div>
          <div class="date">Alocado em: ${dateStr}</div>
        </div>
        <div class="qr-container">
          <img src="${qrUrl}" alt="QR Code" />
          <div class="qr-label">Unid. ${i + 1}/${params.quantidade}</div>
        </div>
      </div>
    `
  }

  const html = `
    <html>
      <head>
        <title>Etiquetas de Alocação</title>
        <style>
          @page { size: 100mm 60mm; margin: 0; }
          body { 
            margin: 0; 
            padding: 0;
            background: #fff;
            color: #000;
            font-family: Arial, sans-serif; 
          }
          .page {
            width: 100mm; 
            height: 60mm; 
            box-sizing: border-box; 
            padding: 4mm; 
            display: flex; 
            flex-direction: row; 
            align-items: center; 
            justify-content: space-between; 
            overflow: hidden;
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: auto;
          }
          .info { 
            width: 65%; 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
          }
          h1 { 
            font-size: 16px; 
            margin: 0 0 6px 0; 
            font-weight: bold; 
            line-height: 1.2;
            text-transform: uppercase;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          p { 
            font-size: 12px; 
            margin: 0 0 2px 0; 
            line-height: 1.3; 
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .medidas { 
            font-size: 13px; 
            font-weight: bold; 
            margin-top: 4px; 
            padding-top: 4px; 
            border-top: 2px solid #000; 
          }
          .date {
            font-size: 10px;
            margin-top: 4px;
            color: #333;
          }
          .qr-container { 
            width: 32%; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
          }
          .qr-container img { 
            width: 28mm; 
            height: 28mm; 
            object-fit: contain;
          }
          .qr-label { 
            font-size: 9px; 
            text-align: center; 
            margin-top: 4px; 
            font-weight: bold;
            text-transform: uppercase;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

export function printScrapLabel(sobra: {
  id: string
  nome: string
  cliente_nome: string | null
  marca: string | null
  altura: number
  largura: number
  espessura: number | null
  tipo?: string
  comprimento?: number | null
}) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `${window.location.origin}/baixa-retalho/${sobra.id}`,
  )}`

  const html = `
    <html>
      <head>
        <title>Etiqueta - ${sobra.nome}</title>
        <style>
          @page { size: 100mm 60mm; margin: 0; }
          body { 
            margin: 0; 
            padding: 4mm; 
            width: 100mm; 
            height: 60mm; 
            box-sizing: border-box; 
            font-family: Arial, sans-serif; 
            display: flex; 
            flex-direction: row; 
            align-items: center; 
            justify-content: space-between; 
            overflow: hidden;
            background: #fff;
            color: #000;
          }
          .info { 
            width: 65%; 
            display: flex; 
            flex-direction: column; 
            justify-content: center;
          }
          h1 { 
            font-size: 16px; 
            margin: 0 0 6px 0; 
            font-weight: bold; 
            line-height: 1.2;
            text-transform: uppercase;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          p { 
            font-size: 12px; 
            margin: 0 0 2px 0; 
            line-height: 1.3; 
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .medidas { 
            font-size: 14px; 
            font-weight: bold; 
            margin-top: 6px; 
            padding-top: 6px; 
            border-top: 2px solid #000; 
          }
          .qr-container { 
            width: 32%; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
          }
          .qr-container img { 
            width: 28mm; 
            height: 28mm; 
            object-fit: contain;
          }
          .qr-label { 
            font-size: 9px; 
            text-align: center; 
            margin-top: 4px; 
            font-weight: bold;
            text-transform: uppercase;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="info">
          <h1>${sobra.nome}</h1>
          <p><strong>Cliente:</strong> ${sobra.cliente_nome || '-'}</p>
          <p><strong>Marca:</strong> ${sobra.marca || '-'}</p>
          <div class="medidas">
            ${
              sobra.tipo === 'chapa_inteira'
                ? `CHAPA INTEIRA - ${sobra.espessura || 0}mm`
                : sobra.tipo === 'fita_rolo'
                  ? `ROLO FITA - ${sobra.largura}mm L`
                  : sobra.tipo === 'fita_pedaco'
                    ? `PEDAÇO FITA - ${sobra.largura}mm L x ${sobra.comprimento || 0}m C`
                    : `${sobra.altura}A x ${sobra.largura}L x ${sobra.espessura || 0}E mm`
            }
          </div>
        </div>
        <div class="qr-container">
          <img src="${qrUrl}" alt="QR Code" />
          <div class="qr-label">Escaneie para<br/>baixa de estoque</div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          }
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
