import { supabase } from '@/lib/supabase/client'

const BUCKET = 'bender_clientes'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface StorageFile {
  name: string
  path: string
  size: number
  updated_at: string | null
}

export interface OrphanFolder {
  id: string
  fileCount: number
  totalSize: number
  files: StorageFile[]
}

export interface RecoverResult {
  moved: StorageFile[]
  skipped: StorageFile[]
  errors: string[]
}

interface ListEntry {
  name: string
  id: string | null
  updated_at: string | null
  created_at: string | null
  metadata: { size?: number } | null
}

const isFolderEntry = (entry: ListEntry): boolean => {
  if (!entry.metadata) return true
  return entry.metadata.size === undefined || entry.metadata.size === null
}

async function listRecursive(prefix: string): Promise<StorageFile[]> {
  const result: StorageFile[] = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    if (!data || data.length === 0) break
    for (const item of data as ListEntry[]) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name
      if (isFolderEntry(item) && !item.name.includes('.')) {
        const sub = await listRecursive(itemPath)
        result.push(...sub)
      } else {
        result.push({
          name: item.name,
          path: itemPath,
          size: item.metadata?.size ?? 0,
          updated_at: item.updated_at ?? item.created_at ?? null,
        })
      }
    }
    if (data.length < limit) break
    offset += limit
  }
  return result
}

export async function scanOrphanFolders(): Promise<OrphanFolder[]> {
  const { data: clients, error: cErr } = await supabase.from('clientes').select('id')
  if (cErr) throw cErr
  const clientIds = new Set<string>((clients || []).map((c: any) => c.id))

  const rootEntries: ListEntry[] = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw error
    if (!data || data.length === 0) break
    rootEntries.push(...(data as ListEntry[]))
    if (data.length < limit) break
    offset += limit
  }

  const orphans: OrphanFolder[] = []
  for (const entry of rootEntries) {
    if (!UUID_REGEX.test(entry.name)) continue
    if (clientIds.has(entry.name)) continue
    const files = await listRecursive(entry.name)
    orphans.push({
      id: entry.name,
      fileCount: files.length,
      totalSize: files.reduce((a, f) => a + f.size, 0),
      files,
    })
  }
  return orphans.sort((a, b) => b.fileCount - a.fileCount)
}

export async function listClientFoldersForDuplicateCheck(clientId: string): Promise<Set<string>> {
  try {
    const files = await listRecursive(clientId)
    return new Set(files.map((f) => f.name))
  } catch {
    return new Set()
  }
}

export function inferTipo(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'foto'
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'documento'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'planilha'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video'
  if (['skp', 'promob', 'dwg', 'dxf', 'rvt', '3dm'].includes(ext)) return 'projeto'
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio'
  return 'documento'
}

export interface RecoverOptions {
  orphanId: string
  files: StorageFile[]
  targetClientId: string
  userId: string
  userName: string
}

export async function recoverOrphanFolder(
  opts: RecoverOptions,
  onProgress?: (pct: number, msg: string) => void,
): Promise<RecoverResult> {
  const { orphanId, files, targetClientId, userId, userName } = opts
  const moved: StorageFile[] = []
  const skipped: StorageFile[] = []
  const errors: string[] = []

  const existing = await listClientFoldersForDuplicateCheck(targetClientId)

  const total = files.length || 1
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    onProgress?.(Math.round((i / total) * 100), `Movendo ${file.name}...`)

    if (existing.has(file.name)) {
      skipped.push(file)
      continue
    }

    try {
      const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(file.path)
      if (dlErr || !blob) {
        throw new Error('Download falhou: ' + (dlErr?.message || 'arquivo indisponível'))
      }

      const relativePath = file.path.substring(orphanId.length + 1)
      const newPath = `${targetClientId}/${relativePath}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, blob, { upsert: false, contentType: blob.type || undefined })

      if (upErr) {
        if (
          upErr.message.toLowerCase().includes('already exists') ||
          upErr.message.toLowerCase().includes('duplicate')
        ) {
          skipped.push(file)
          continue
        }
        throw upErr
      }

      const tipo = inferTipo(file.name)
      const { error: insErr } = await supabase.from('documentos_cliente').insert({
        cliente_id: targetClientId,
        arquivo_url: newPath,
        template_nome: file.name,
        tipo,
        status: 'recuperado',
        usuario_id: userId,
      })
      if (insErr) {
        errors.push(`Documento ${file.name}: ${insErr.message}`)
      }

      await supabase.storage.from(BUCKET).remove([file.path])
      moved.push(file)
    } catch (e: any) {
      errors.push(`${file.name}: ${e?.message || 'erro desconhecido'}`)
    }
  }

  if (moved.length > 0) {
    await supabase.from('timeline_eventos').insert({
      cliente_id: targetClientId,
      usuario_nome: userName,
      acao: `Documentos recuperados do cliente deletado (ID: ${orphanId})`,
    })
  }

  onProgress?.(100, 'Concluído')
  return { moved, skipped, errors }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}
