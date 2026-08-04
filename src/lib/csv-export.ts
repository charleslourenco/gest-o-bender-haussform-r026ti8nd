export const exportToCSV = (
  filename: string,
  headers: string[],
  rows: (string | number | null)[][],
) => {
  const escapeValue = (val: string | number | null): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escapeValue).join(';'),
    ...rows.map((row) => row.map(escapeValue).join(';')),
  ].join('\r\n')

  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
}

export const formatDateForFilename = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
