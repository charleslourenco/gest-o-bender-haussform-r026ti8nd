import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UsersRound } from 'lucide-react'

export default function GestaoPessoas() {
  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-off-white">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <UsersRound className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-off-white font-bold text-[32px]">Gestão de Pessoas</h1>
          <p className="text-pale-cornflower mt-1">Gestão de equipe e controle de ponto</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md text-center bg-card shadow-sm border-border">
          <CardHeader>
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Módulo em Desenvolvimento</CardTitle>
            <CardDescription className="text-muted-foreground">Em breve disponível</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Este módulo está planejado para ser implementado no futuro. Aqui você poderá gerenciar
              as permissões, horários, equipes e outras informações relacionadas aos colaboradores
              da fábrica.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
