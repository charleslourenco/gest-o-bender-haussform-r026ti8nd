import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function GestaoPessoas() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center">
      <Card className="w-full max-w-md text-center bg-card shadow-sm border-border">
        <CardHeader>
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">Gestão de Pessoas</CardTitle>
          <CardDescription className="text-muted-foreground">
            Módulo em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Este módulo está planejado para ser implementado no futuro. Aqui você poderá gerenciar
            as permissões, horários, equipes e outras informações relacionadas aos colaboradores da
            fábrica.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
