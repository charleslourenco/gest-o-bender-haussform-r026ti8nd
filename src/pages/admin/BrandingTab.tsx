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
    const { data } = await supabase.from('empresa').select('*').limit(1).single()
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
      toast.error('O arquivo deve ter no máximo 5MB.', {
        style: { background: '#4A7FA7', color: '#F6FAFD' },
      })
      return
    }
    setFile(selected)
    setLogoUrl(URL.createObjectURL(selected))
  }

  const handleSave = async () => {
    if (!nome.trim() || nome.length > 100) {
      toast.error('Nome da empresa inválido.', {
        style: { background: '#4A7FA7', color: '#F6FAFD' },
      })
      return
    }

    setLoading(true)
    try {
      let finalLogoUrl = logoUrl
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `logo-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('bender_assets')
          .upload(fileName, file)

        if (uploadError) throw new Error('Falha no upload da logo.')

        const {
          data: { publicUrl },
        } = supabase.storage.from('bender_assets').getPublicUrl(fileName)

        finalLogoUrl = publicUrl
      }

      if (empresa) {
        await supabase.from('empresa').update({ nome, logo_url: finalLogoUrl }).eq('id', empresa.id)
      } else {
        await supabase.from('empresa').insert({ nome, logo_url: finalLogoUrl })
      }

      toast.success('Branding salvo com sucesso!', {
        style: { background: '#1A3D63', color: '#F6FAFD' },
      })

      window.dispatchEvent(new Event('branding_updated'))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar branding.', {
        style: { background: '#4A7FA7', color: '#F6FAFD' },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bender-offwhite p-6 rounded-lg border border-bender-steel space-y-6">
      <div>
        <Label className="text-bender-navy font-semibold">Nome da Empresa *</Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={100}
          className="bg-bender-pale border-bender-steel text-bender-navy focus-visible:ring-bender-denim mt-2"
        />
      </div>

      <div>
        <Label className="text-bender-navy font-semibold">Logo (JPG, PNG, SVG - Máx 5MB) *</Label>
        <div className="flex items-center gap-4 mt-2">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Preview"
              className="w-24 h-24 object-contain border border-bender-steel bg-bender-offwhite rounded-lg p-2"
            />
          )}
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.svg"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="bg-bender-pale border-bender-steel text-bender-navy focus-visible:ring-bender-denim max-w-sm"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading || !nome}
        className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 px-6 h-11"
      >
        {loading ? 'Salvando...' : 'Salvar Branding'}
      </Button>
    </div>
  )
}
