export function printScrapLabel(sobra: {
  id: string
  nome: string
  cliente_nome: string | null
  marca: string | null
  altura: number
  largura: number
  espessura: number | null
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
            ${sobra.altura}A x ${sobra.largura}L x ${sobra.espessura || 0}E mm
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
