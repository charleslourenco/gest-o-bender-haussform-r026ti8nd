import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Plus, Loader2 } from 'lucide-react'
import { TemplatesTable } from '@/components/admin/TemplatesTable'
import { TemplateModal } from '@/components/admin/TemplateModal'

export function TemplatesTab() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('criado_em', { ascending: false })
      if (error) throw error
      setTemplates(data || [])
    } catch (error: any) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (template?: any) => {
    setEditingTemplate(template || null)
    setIsModalOpen(true)
  }

  return (
    <Card className="border-steel-blue/20 shadow-sm bg-off-white">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-midnight-navy">
            <FileText className="h-5 w-5" /> Templates de Documentos
          </CardTitle>
          <CardDescription>
            Gerencie os modelos de contratos e termos usados no sistema.
          </CardDescription>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-steel-blue text-off-white hover:bg-steel-blue/90 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Template
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-steel-blue" />
          </div>
        ) : (
          <TemplatesTable
            templates={templates}
            onEdit={handleOpenModal}
            onRefresh={fetchTemplates}
          />
        )}
      </CardContent>
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        template={editingTemplate}
        onSuccess={fetchTemplates}
      />
    </Card>
  )
}
