import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle2, AlertCircle } from 'lucide-react'

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
        style: { background: '#B3CFE5', color: '#4A7FA7', border: 'none' },
        icon: <AlertCircle className="text-red-600 h-5 w-5" />,
      })
      return
    }
    setFile(selected)
    setLogoUrl(URL.createObjectURL(selected))
  }

  const handleSave = async () => {
    if (!nome.trim() || nome.length > 100) {
      toast.error('Nome da empresa inválido.', {
        style: { background: '#B3CFE5', color: '#4A7FA7', border: 'none' },
        icon: <AlertCircle className="text-red-600 h-5 w-5" />,
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
        style: { background: '#B3CFE5', color: '#1A3D63', border: 'none' },
        icon: <CheckCircle2 className="text-green-600 h-5 w-5" />,
      })

      window.dispatchEvent(new Event('branding_updated'))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar branding.', {
        style: { background: '#B3CFE5', color: '#4A7FA7', border: 'none' },
        icon: <AlertCircle className="text-red-600 h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-bender-offwhite p-6 space-y-6 rounded-b-lg">
      <div className="space-y-2 max-w-xl">
        <Label className="text-bender-navy font-semibold text-[14px]">Nome da Empresa *</Label>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={100}
          className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-bender-denim transition-all"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-bender-navy font-semibold text-[14px]">
          Logo (JPG, PNG, SVG - Máx 5MB) *
        </Label>
        <div className="flex items-center gap-4 flex-wrap">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Preview"
              className="w-24 h-24 object-contain border-2 border-bender-steel bg-bender-offwhite rounded-lg p-2"
            />
          )}
          <Input
            type="file"
            accept=".jpg,.jpeg,.png,.svg"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-bender-denim transition-all max-w-sm file:text-bender-navy file:font-semibold cursor-pointer"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          onClick={handleSave}
          disabled={loading || !nome}
          className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 px-6 py-3 min-h-[44px] rounded-lg text-base w-full sm:w-auto"
        >
          {loading ? 'Salvando...' : 'Salvar Branding'}
        </Button>
      </div>
    </div>
  )
}
