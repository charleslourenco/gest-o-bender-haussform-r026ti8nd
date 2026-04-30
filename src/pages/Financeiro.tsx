import { Wallet } from 'lucide-react'

export default function Financeiro() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0">
        <h1 className="text-[32px] font-bold text-off-white">Financeiro</h1>
        <p className="text-pale-cornflower mt-1">Controle de fluxo de caixa e pagamentos</p>
      </div>

      <div className="flex-1 bg-off-white border-2 border-steel-blue/20 rounded-xl flex flex-col items-center justify-center text-center p-8 shadow-sm">
        <Wallet className="h-20 w-20 text-steel-blue mb-6 opacity-50" />
        <h3 className="text-2xl font-bold text-midnight-navy mb-2">Módulo em Construção</h3>
        <p className="text-base text-midnight-navy/70 max-w-md">
          A integração automática com o Comercial e os relatórios de DRE estarão disponíveis em
          breve.
        </p>
      </div>
    </div>
  )
}
