import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Upload, Image as ImageIcon, Loader2 } from 'lucide-react'

export function EmpresaTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchEmpresa()
  }, [])

  const fetchEmpresa = async () => {
    try {
      const { data, error } = await supabase
        .from('empresa')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setEmpresaId(data.id)
        setNome(data.nome || '')
        setLogoUrl(data.logo_url || '')
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!nome.trim()) return toast({ title: 'Nome obrigatório', variant: 'destructive' })
    setSaving(true)
    try {
      if (empresaId) {
        const { error } = await supabase
          .from('empresa')
          .update({ nome, logo_url: logoUrl })
          .eq('id', empresaId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('empresa').insert({ nome, logo_url: logoUrl })
        if (error) throw error
      }
      toast({
        title: 'Empresa atualizada com sucesso',
        className: 'bg-dark-denim text-off-white border-none',
      })
      window.dispatchEvent(new Event('branding_updated'))
      fetchEmpresa()
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fileName = `logo_${Date.now()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage
        .from('bender_templates')
        .upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('bender_templates').getPublicUrl(fileName)
      setLogoUrl(data.publicUrl)
      toast({
        title: 'Logo enviado com sucesso',
        className: 'bg-dark-denim text-off-white border-none',
      })
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-off-white" />
      </div>
    )

  return (
    <Card className="bg-midnight-navy border-none">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-off-white flex items-center gap-2">
          <Building className="h-5 w-5" /> Dados da Empresa
        </CardTitle>
        <CardDescription className="text-off-white/70">
          Gerencie o nome e a logo que aparecem no sistema e nos documentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-off-white font-semibold">Nome da Empresa</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="bg-dark-denim border-2 border-steel-blue/40 text-off-white placeholder:text-off-white/40 focus-visible:border-dark-denim"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-off-white font-semibold">Logo da Empresa</Label>
          <div className="flex items-start gap-6">
            <div className="h-32 w-32 shrink-0 rounded-lg border-2 border-dashed border-steel-blue/40 flex items-center justify-center bg-dark-denim overflow-hidden relative">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <ImageIcon className="h-8 w-8 text-off-white/50" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-midnight-navy/40 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-off-white" />
                </div>
              )}
            </div>
            <div className="space-y-4 flex-1">
              <div className="text-sm text-off-white/70">
                Faça o upload de uma imagem (PNG, JPG) para usar como logo da empresa.
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/png, image/jpeg"
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80 hover:text-off-white"
                >
                  <Upload className="mr-2 h-4 w-4" /> Escolher Imagem
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLogoUrl('')}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-steel-blue/20">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-dark-denim text-off-white hover:bg-dark-denim/80 border border-steel-blue/40"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
