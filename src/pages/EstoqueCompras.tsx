import { PackageSearch, Wrench } from 'lucide-react'

export default function EstoqueCompras() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] text-center p-8 bg-off-white/50 rounded-xl border border-steel-blue/10">
      <div className="relative mb-8">
        <div className="bg-pale-cornflower p-6 rounded-full shadow-inner">
          <PackageSearch className="w-16 h-16 text-steel-blue" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-dark-denim p-2 rounded-full text-off-white shadow-md">
          <Wrench className="w-6 h-6" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-midnight-navy mb-4">Estoque & Compras</h1>

      <p className="text-lg text-slate-gray max-w-lg mb-8">
        Este módulo está em fase de planejamento e desenvolvimento. Em breve, você terá controle
        total sobre seus suprimentos e pedidos de compra.
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2 bg-steel-blue/10 text-midnight-navy font-medium rounded-full text-sm">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-steel-blue opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-steel-blue"></span>
        </span>
        Em Construção
      </div>
    </div>
  )
}
