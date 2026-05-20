import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import OpenAI from 'npm:openai@4'
import { corsHeaders } from '../_shared/cors.ts'

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
  "tipo_material": "string (ex: MDF | MDP | Compensado | Lâmina | Ferragem | Puxador | Dobradiça | Corrediça | Vidro | Espelho | PVC | fita_de_borda)",
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

Regras de Normalização (Siga Estritamente):
1. Fita de Borda: "fita de bordo", "perfil de bordo", "perfil de PVC", "borda", "fitaborda" devem ter "tipo_material" = "fita_de_borda".
2. MDF: "chapa", "placa", "painel" sem especificar o tipo devem ser inferidos como "MDF".
3. Unidades: Sempre converta as medidas extraídas. Espessura e Largura SEMPRE em milímetros (mm). Comprimentos de rolo/barras SEMPRE em metros (m). Ex: se receber "1,5cm", retorne 15.
4. Inferência Fita de Borda: Se a descrição for "fita para MDF 15mm", infira a "largura_mm" como 22. Se for "fita para MDF 18mm", infira "largura_mm" como 29 (ou 22 dependendo do contexto extra, padrão 22 para 15mm e 29 para 18/25mm).
5. Letras minúsculas/maiúsculas: mantenha o tipo de material e acabamento padronizados (ex: "fita_de_borda", "MDF").

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
