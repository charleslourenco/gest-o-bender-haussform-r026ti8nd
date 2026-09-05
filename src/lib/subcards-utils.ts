export const VINCULO_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#e11d48', // rose
]

export function getCorVinculoForCard(cardId: string): string {
  if (!cardId) return VINCULO_COLORS[0]
  let hash = 0
  for (let i = 0; i < cardId.length; i++) {
    hash = (hash << 5) - hash + cardId.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % VINCULO_COLORS.length
  return VINCULO_COLORS[index]
}
