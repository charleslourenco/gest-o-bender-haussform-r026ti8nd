import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import OpenAI from 'npm:openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, items } = body

    if (action === 'normalize_batch') {
      if (!items || !Array.isArray(items)) {
        throw new Error('A lista de items deve ser um array válido.')
      }

      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) throw new Error('OPENAI_API_KEY não está configurada.')

      const openai = new OpenAI({ apiKey: openaiKey })

      const systemPrompt = `Você é um motor avançado de extração de dados e normalização de materiais de marcenaria.
Sua tarefa é receber um array de descrições brutas e retornar um JSON estrito contendo a chave "results", que deve ser um array de objetos correspondentes na MESMA ORDEM.

Para cada item, extraia e infira os dados para compor este objeto exato:
{
  "descricao_original": "string exata que você recebeu",
  "nome_padronizado": "string com o nome limpo e normalizado",
  "tipo_material": "string (ex: MDF | MDP | Compensado | Lâmina | Ferragem | Puxador | Dobradiça | Corrediça | Vidro | Espelho | PVC | fita_de_borda)",
  "grupo": "string restrita a: 'Ferragens', 'Chapas', 'Químicos', 'Bordas', 'Outros'",
  "classe": "string dependente do grupo definido acima",
  "cor": "string ou null",
  "codigo_cor": "string ou null",
  "acabamento": "string ou null (ex: TX, BP, Liso, Texturizado)",
  "espessura_mm": number ou null,
  "largura_mm": number ou null,
  "comprimento_m": number ou null,
  "marca": "string ou null",
  "material": "string ou null",
  "atributos_extras": {}
}

Regras para Grupos e Classes (Siga Estritamente):
- "Ferragens": classes -> 'Dobradiças', 'Corrediças', 'Parafusos', 'Puxadores', 'Acessórios', 'Geral'
- "Chapas": classes -> 'MDF 15mm', 'MDF 18mm', 'MDF 6mm', 'MDF 25mm', 'Fundo', 'Geral'
- "Químicos": classes -> 'Cola', 'Solvente', 'Verniz', 'Geral'
- "Bordas": classes -> 'Fita de Borda 22mm', 'Fita de Borda 35mm', 'Fita de Borda 60mm', 'Geral'
- "Outros": classes -> 'Embalagem', 'Consumíveis', 'Geral'

Regras de Normalização (Siga Estritamente):
1. Fita de Borda: "fita de bordo", "perfil de bordo", "perfil de PVC", "borda", "fitaborda" devem ter grupo="Bordas".
2. MDF: "chapa", "placa", "painel" sem especificar o tipo devem ser inferidos como grupo="Chapas".
3. Unidades: Sempre converta as medidas extraídas. Espessura e Largura SEMPRE em milímetros (mm). Comprimentos de rolo/barras SEMPRE em metros (m). Ex: se receber "1,5cm", retorne 15.
4. Inferência Fita de Borda: Se a descrição for "fita para MDF 15mm", infira a classe como 'Fita de Borda 22mm'. Se for "fita para MDF 18mm", infira classe 'Fita de Borda 35mm' ou 'Fita de Borda 22mm' (padrao).
5. Letras minúsculas/maiúsculas: mantenha o tipo de material e acabamento padronizados.

Retorne EXATAMENTE o JSON com a chave "results". Não inclua markdown extra ou conversas.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(items) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      })

      const rawContent = response.choices[0].message.content || '{"results": []}'
      const data = JSON.parse(rawContent)

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Erro na função material-normalization:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
