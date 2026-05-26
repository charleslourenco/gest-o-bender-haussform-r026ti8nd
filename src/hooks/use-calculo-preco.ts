export function useCalculoPreco(
  indiceVista: number,
  indicePrazo: number,
  tipoIndice: 'vista' | 'prazo',
) {
  const indiceAplicado = tipoIndice === 'vista' ? indiceVista : indicePrazo

  const calcularPrecoVenda = (precoCusto: number) => {
    return precoCusto * indiceAplicado
  }

  const calcularValorTotal = (itens: Array<{ quantidade: number; preco_venda: number }>) => {
    return itens.reduce((acc, item) => acc + item.quantidade * item.preco_venda, 0)
  }

  return {
    indiceAplicado,
    calcularPrecoVenda,
    calcularValorTotal,
  }
}
