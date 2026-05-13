import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function BrandingTab() {
  const [empresa, setEmpresa] = useState<any>(null)
  const [nome, setNome] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchEmpresa()
  }, [])

  const fetchEmpresa = async () => {
    const { data } = await supabase
      .from('empresa')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setEmpresa(data)
      setNome(data.nome)
      setLogoUrl(data.logo_url || '')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    if (selected.size > 5 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 5MB.')
      return
    }
    setFile(selected)
    setLogoUrl(URL.createObjectURL(selected))
  }

  const handleSave = async () => {
    if (!nome.trim() || nome.length > 100) {
      toast.error('Nome da empresa inválido.')
      return
    }

    setLoading(true)
    try {
      let finalLogoUrl = logoUrl
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `logo-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('ativos_dobrador')
          .upload(fileName, file)

        if (uploadError) throw new Error('Falha no upload da logo.')

        const {
          data: { publicUrl },
        } = supabase.storage.from('ativos_dobrador').getPublicUrl(fileName)

        finalLogoUrl = publicUrl
      }

      let savedEmpresa = empresa
      if (empresa?.id) {
        const { data } = await supabase
          .from('empresa')
          .update({ nome, logo_url: finalLogoUrl })
          .eq('id', empresa.id)
          .select()
          .maybeSingle()
        if (data) savedEmpresa = data
      } else {
        const { data } = await supabase
          .from('empresa')
          .insert({ nome, logo_url: finalLogoUrl })
          .select()
          .maybeSingle()
        if (data) savedEmpresa = data
      }

      setEmpresa(savedEmpresa)
      if (savedEmpresa?.logo_url) {
        setLogoUrl(savedEmpresa.logo_url)
      }
      setFile(null)
      toast.success('Branding salvo com sucesso!')
      window.dispatchEvent(new Event('branding_updated'))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar branding.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border text-card-foreground p-6 space-y-6 rounded-lg shadow-sm">
      <div className="space-y-2 max-w-xl">
        <Label className="text-foreground font-medium text-sm">Nome da Empresa *</Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={100}
          className="bg-background text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground font-medium text-sm">
          Logo (JPG, PNG, SVG - Máx 5MB) *
        </Label>
        <div className="flex items-center gap-4 flex-wrap">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Preview"
              className="w-24 h-24 object-contain border rounded-md bg-background p-2"
            />
          )}
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.svg"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="bg-background max-w-sm cursor-pointer file:font-medium"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button onClick={handleSave} disabled={loading || !nome} className="w-full sm:w-auto">
          {loading ? 'Salvando...' : 'Salvar Branding'}
        </Button>
      </div>
    </div>
  )
}
