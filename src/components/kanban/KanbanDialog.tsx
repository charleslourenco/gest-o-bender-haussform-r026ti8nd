import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardData, KanbanColumnDef } from './types'

export function KanbanDialog({
  selectedCard,
  setSelectedCard,
  columns,
  usersMap,
  onAssignAnalyst,
}: {
  selectedCard: CardData | null
  setSelectedCard: (c: CardData | null) => void
  columns: KanbanColumnDef[]
  usersMap: Record<string, { nome: string; foto_perfil: string | null }>
  onAssignAnalyst: (cardId: string, analystId: string | null) => void
}) {
  if (!selectedCard) return null

  const colTitle =
    columns.find((c) => c.id === selectedCard.status_analise)?.title || selectedCard.status_analise

  return (
    <Dialog open={!!selectedCard} onOpenChange={(o) => !o && setSelectedCard(null)}>
      <DialogContent className="bg-midnight-navy text-off-white border-steel-blue sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-pale-cornflower text-xl">Detalhes do Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-steel-blue uppercase font-semibold">Produto</span>
              <p className="font-medium mt-1">{selectedCard.nome_produto}</p>
            </div>
            <div>
              <span className="text-xs text-steel-blue uppercase font-semibold">Cliente</span>
              <p className="font-medium mt-1 text-pale-cornflower">
                {selectedCard.clientes?.nome || 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-xs text-steel-blue uppercase font-semibold">Quantidade</span>
              <p className="font-medium mt-1">{selectedCard.qtd}</p>
            </div>
            <div>
              <span className="text-xs text-steel-blue uppercase font-semibold">Status Atual</span>
              <p className="font-medium mt-1 text-pale-cornflower">{colTitle}</p>
            </div>
          </div>

          <div>
            <span className="text-xs text-steel-blue uppercase font-semibold">Descrição</span>
            <div className="text-sm bg-dark-denim p-3 rounded-lg mt-1 min-h-[80px] border border-steel-blue/30 whitespace-pre-wrap text-off-white/90">
              {selectedCard.descricao || 'Nenhuma descrição fornecida.'}
            </div>
          </div>

          <div className="bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
            <span className="text-xs text-steel-blue uppercase font-semibold block mb-2">
              Responsável
            </span>
            <Select
              value={selectedCard.analista_id || 'unassigned'}
              onValueChange={(val) =>
                onAssignAnalyst(selectedCard.id, val === 'unassigned' ? null : val)
              }
            >
              <SelectTrigger className="w-full bg-midnight-navy border-steel-blue text-off-white">
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {Object.entries(usersMap).map(([id, user]) => (
                  <SelectItem key={id} value={id}>
                    {user.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
            <div>
              <span className="text-xs text-steel-blue uppercase font-semibold block">
                Consultor Original
              </span>
              <p className="font-medium mt-1 text-sm">
                {selectedCard.formulario_comercial?.usuario_id
                  ? usersMap[selectedCard.formulario_comercial.usuario_id]?.nome || 'Desconhecido'
                  : 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-steel-blue uppercase font-semibold block">
                Criado em
              </span>
              <p className="text-sm text-off-white/80 mt-1">
                {new Date(selectedCard.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
