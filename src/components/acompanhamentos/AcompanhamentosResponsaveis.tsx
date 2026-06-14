import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Phone } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export function AcompanhamentosResponsaveis() {
  const [items, setItems] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ nome: '', telefone: '' })
  const { toast } = useToast()

  const fetchItems = async () => {
    const { data } = await supabase.from('responsaveis_acompanhamentos').select('*').order('nome')
    if (data) setItems(data)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('responsaveis_acompanhamentos').insert([formData])
    if (error) toast({ title: 'Erro ao salvar', variant: 'destructive' })
    else {
      toast({ title: 'Responsável adicionado com sucesso' })
      setIsOpen(false)
      setFormData({ nome: '', telefone: '' })
      fetchItems()
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Deseja excluir este responsável? Projetos associados a ele ficarão sem responsável.',
      )
    )
      return
    const { error } = await supabase.from('responsaveis_acompanhamentos').delete().eq('id', id)
    if (error) toast({ title: 'Erro ao excluir', variant: 'destructive' })
    else {
      toast({ title: 'Excluído' })
      fetchItems()
    }
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-end shrink-0">
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Responsável
        </Button>
      </div>

      <div className="border rounded-md flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Nome do Responsável</TableHead>
              <TableHead>Telefone de Contato</TableHead>
              <TableHead>Status de Alocação</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    {item.telefone || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full shadow-sm ${item.status === 'Disponível' ? 'bg-green-500' : 'bg-orange-500'}`}
                    />
                    <span
                      className={
                        item.status === 'Disponível'
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : 'text-orange-600 dark:text-orange-400 font-medium'
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum responsável cadastrado para acompanhamentos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Responsável</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Maria Souza"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone / WhatsApp</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="Ex: (11) 99999-9999"
              />
            </div>
            <Button type="submit" className="w-full">
              Salvar Responsável
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
