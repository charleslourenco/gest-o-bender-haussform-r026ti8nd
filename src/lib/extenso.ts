const extensoUnidades = [
  '',
  'um',
  'dois',
  'três',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
]
const extensoDezenas = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
]
const extensoCentenas = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
]

function converteGrupo(n: number): string {
  if (n === 100) return 'cem'
  let txt = ''
  const c = Math.floor(n / 100)
  const r = n % 100
  if (c > 0) txt += extensoCentenas[c]
  if (r > 0) {
    if (txt) txt += ' e '
    if (r < 20) {
      txt += extensoUnidades[r]
    } else {
      const d = Math.floor(r / 10)
      const u = r % 10
      txt += extensoDezenas[d]
      if (u > 0) txt += ' e ' + extensoUnidades[u]
    }
  }
  return txt
}

export function numeroPorExtenso(valor: number, isCurrency = true): string {
  if (valor === 0) return isCurrency ? 'zero reais' : 'zero'

  const inteiros = Math.floor(valor)
  const centavos = Math.round((valor - inteiros) * 100)

  let txtInteiros = ''
  if (inteiros > 0) {
    const milhares = Math.floor(inteiros / 1000)
    const resto = inteiros % 1000

    if (milhares > 0) {
      if (milhares === 1) txtInteiros += 'um mil'
      else txtInteiros += converteGrupo(milhares) + ' mil'
    }

    if (resto > 0) {
      if (txtInteiros) {
        if (resto < 100 || resto % 100 === 0) txtInteiros += ' e '
        else txtInteiros += ' '
      }
      txtInteiros += converteGrupo(resto)
    }
  }

  let resultado = txtInteiros
  if (isCurrency) {
    if (inteiros === 1) resultado += ' real'
    else if (inteiros > 1) resultado += ' reais'

    if (centavos > 0) {
      if (resultado) resultado += ' e '
      resultado += converteGrupo(centavos)
      if (centavos === 1) resultado += ' centavo'
      else resultado += ' centavos'
    }
  }

  return resultado.trim()
}
